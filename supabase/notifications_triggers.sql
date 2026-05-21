-- ============================================================
-- COO Schedule — Notification Triggers
-- Run in Supabase SQL Editor after schema.sql + push_subscriptions.sql
-- ============================================================
-- These DB-level triggers insert rows into public.notifications
-- whenever shifts are assigned/changed or swaps change status.
-- The Edge Functions (supabase/functions/) read these rows and
-- send Web Push. If you skip Edge Functions, in-app notifications
-- still work via realtime subscription on the notifications table.
-- ============================================================

-- ── Add 'swap_rejected' to the notifications type check ───────────────────
-- The original schema only had: shift_assigned, shift_changed, swap_request,
-- swap_approved, reminder.  We add swap_rejected here.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'shift_assigned',
    'shift_changed',
    'swap_request',
    'swap_approved',
    'swap_rejected',
    'reminder'
  ));

-- ── Helper: get nickname for a profile id ─────────────────────────────────
create or replace function public.get_nickname(p_id uuid)
returns text
language sql stable
security definer set search_path = public
as $$
  select nickname from public.profiles where id = p_id;
$$;

-- ── Trigger: shifts → notify assigned employee ────────────────────────────
create or replace function public.notify_on_shift_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_nickname text;
begin
  -- Only care when assigned_to is set (not unassigned)
  if new.assigned_to is null then
    return new;
  end if;

  v_nickname := coalesce(public.get_nickname(new.assigned_to), 'Κάποιος');

  if TG_OP = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, related_id)
    values (
      new.assigned_to,
      'shift_assigned',
      'Νέα βάρδια ανατέθηκε',
      'Έχεις ' ||
        case new.shift_type
          when 'morning' then 'ΠΡΩΙ (08:00–15:00)'
          when 'evening' then 'ΒΡΑΔΥ (16:00–23:00)'
          when 'split'   then 'ΣΠΑΣΤΟ (11:00–15:00 + 19:00–23:00)'
          else new.shift_type
        end ||
        ' στις ' || to_char(new.date::date, 'DD/MM/YYYY'),
      new.id
    );
  elsif TG_OP = 'UPDATE' and old.assigned_to is distinct from new.assigned_to then
    -- Employee was reassigned
    if new.assigned_to is not null then
      insert into public.notifications (user_id, type, title, body, related_id)
      values (
        new.assigned_to,
        'shift_assigned',
        'Ανατέθηκε βάρδια',
        'Έχεις ' ||
          case new.shift_type
            when 'morning' then 'ΠΡΩΙ'
            when 'evening' then 'ΒΡΑΔΥ'
            when 'split'   then 'ΣΠΑΣΤΟ'
            else new.shift_type
          end ||
          ' στις ' || to_char(new.date::date, 'DD/MM/YYYY'),
        new.id
      );
    end if;
    -- Notify old assignee they were removed
    if old.assigned_to is not null then
      insert into public.notifications (user_id, type, title, body, related_id)
      values (
        old.assigned_to,
        'shift_changed',
        'Αλλαγή βάρδιας',
        'Η βάρδια στις ' || to_char(old.date::date, 'DD/MM/YYYY') || ' αφαιρέθηκε.',
        old.id
      );
    end if;
  elsif TG_OP = 'UPDATE'
    and old.assigned_to = new.assigned_to
    and new.assigned_to is not null
    and (old.shift_type <> new.shift_type or old.date <> new.date)
  then
    -- Same person, different shift details
    insert into public.notifications (user_id, type, title, body, related_id)
    values (
      new.assigned_to,
      'shift_changed',
      'Βάρδια άλλαξε',
      'Η βάρδιά σου στις ' || to_char(new.date::date, 'DD/MM/YYYY') || ' ενημερώθηκε.',
      new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists shifts_notify on public.shifts;
create trigger shifts_notify
  after insert or update on public.shifts
  for each row execute function public.notify_on_shift_change();

-- ── Trigger: shift_swaps → notify target / admin / both ──────────────────
create or replace function public.notify_on_swap_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_req_nick  text;
  v_tgt_nick  text;
  v_admin_id  uuid;
  v_shift_date text;
  v_shift_type text;
begin
  v_req_nick   := coalesce(public.get_nickname(new.requested_by), 'Κάποιος');
  v_tgt_nick   := coalesce(public.get_nickname(new.requested_to), 'Κάποιος');
  v_shift_date := to_char(
    (select date from public.shifts where id = new.shift_id),
    'DD/MM/YYYY'
  );
  v_shift_type := (select shift_type from public.shifts where id = new.shift_id);

  -- ── New swap request → notify target employee ────────────────────────
  if TG_OP = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, related_id)
    values (
      new.requested_to,
      'swap_request',
      'Αίτηση αλλαγής βάρδιας',
      'Ο/Η ' || v_req_nick || ' σε ζητά για αλλαγή βάρδιας στις ' || v_shift_date || '.',
      new.id
    );
    return new;
  end if;

  -- Status changed
  if old.status = new.status then return new; end if;

  case new.status

    -- ── Accepted by employee → notify admin ──────────────────────────────
    when 'accepted_by_employee' then
      -- Find first admin (simplification — notify all admins in prod)
      select id into v_admin_id
      from public.profiles
      where role = 'admin' and active = true
      limit 1;

      if v_admin_id is not null then
        insert into public.notifications (user_id, type, title, body, related_id)
        values (
          v_admin_id,
          'swap_request',
          'Swap προς έγκριση',
          v_req_nick || ' ↔ ' || v_tgt_nick || ' — ' || v_shift_date || ' · απαιτεί την έγκρισή σου.',
          new.id
        );
      end if;

    -- ── Approved → notify both employees ─────────────────────────────────
    when 'approved' then
      insert into public.notifications (user_id, type, title, body, related_id)
      values
        (
          new.requested_by,
          'swap_approved',
          'Swap εγκρίθηκε',
          'Η αλλαγή βάρδιας με τον/την ' || v_tgt_nick || ' εγκρίθηκε.',
          new.id
        ),
        (
          new.requested_to,
          'swap_approved',
          'Swap εγκρίθηκε',
          'Η αλλαγή βάρδιας με τον/την ' || v_req_nick || ' εγκρίθηκε.',
          new.id
        );

    -- ── Rejected → notify requester ───────────────────────────────────────
    when 'rejected' then
      insert into public.notifications (user_id, type, title, body, related_id)
      values (
        new.requested_by,
        'swap_rejected',
        'Swap απορρίφθηκε',
        'Η αίτηση αλλαγής βάρδιας στις ' || v_shift_date || ' απορρίφθηκε.',
        new.id
      );

    else null;
  end case;

  return new;
end;
$$;

drop trigger if exists shift_swaps_notify on public.shift_swaps;
create trigger shift_swaps_notify
  after insert or update on public.shift_swaps
  for each row execute function public.notify_on_swap_change();

-- ── Enable realtime on notifications (idempotent) ─────────────────────────
-- Already set in schema.sql — uncomment if running standalone:
-- alter publication supabase_realtime add table public.notifications;

-- ── Policy: allow service_role inserts bypassing is_admin() check ─────────
-- The triggers run as SECURITY DEFINER so they can insert regardless of RLS.
-- For the Edge Functions calling via service_role key, RLS is bypassed.
-- For in-app insert (createNotification in lib/queries/swaps.ts), we need
-- to extend the insert policy to allow service_role and the trigger user.
-- Update the policy so authenticated users who are a party to a swap can insert:
drop policy if exists "notifications: admin insert" on public.notifications;

-- Admins AND service_role can insert; triggers insert as definer.
-- We rely on service_role bypassing RLS for Edge Function inserts.
create policy "notifications: authenticated insert"
  on public.notifications for insert
  to authenticated
  with check (
    -- Inserting for yourself (e.g. system helpers)
    user_id = auth.uid()
    -- OR you are admin
    or public.is_admin()
  );
