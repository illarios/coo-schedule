-- ============================================================
-- COO Schedule — Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Enum-like constraints (text + check) ────────────────────
-- Using text columns with CHECK constraints instead of PG enums
-- so we can add values without migrations.

-- ============================================================
-- TABLES
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  full_name    text        not null,
  nickname     text        not null,
  role         text        not null default 'employee'
                           check (role in ('admin', 'employee')),
  phone        text,
  avatar_url   text,
  color        text        not null default '#FFD800',
  active       boolean     not null default true,
  created_at   timestamptz not null default now()
);

comment on table public.profiles is 'Extended user profile linked to auth.users';

-- ── shifts ──────────────────────────────────────────────────
create table if not exists public.shifts (
  id                 uuid        primary key default gen_random_uuid(),
  date               date        not null,
  shift_type         text        not null
                                 check (shift_type in ('morning', 'evening', 'split')),
  start_time         time        not null,
  end_time           time        not null,
  split_break_start  time,
  split_break_end    time,
  assigned_to        uuid        references public.profiles(id) on delete set null,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.shifts is 'Individual shift slots assigned to employees';
comment on column public.shifts.split_break_start is 'Break start for split shifts (e.g. 15:00)';
comment on column public.shifts.split_break_end   is 'Break end for split shifts (e.g. 19:00)';

-- ── availability ─────────────────────────────────────────────
create table if not exists public.availability (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  date         date        not null,
  availability text        not null
                           check (availability in ('morning', 'evening', 'split', 'any', 'off')),
  note         text,
  created_at   timestamptz not null default now(),
  unique (user_id, date)
);

comment on table public.availability is 'Employee declared availability per day';

-- ── shift_swaps ──────────────────────────────────────────────
create table if not exists public.shift_swaps (
  id             uuid        primary key default gen_random_uuid(),
  shift_id       uuid        not null references public.shifts(id) on delete cascade,
  requested_by   uuid        not null references public.profiles(id) on delete cascade,
  requested_to   uuid        not null references public.profiles(id) on delete cascade,
  status         text        not null default 'pending'
                             check (status in ('pending', 'accepted_by_employee', 'approved', 'rejected')),
  message        text,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

comment on table public.shift_swaps is 'Swap requests between employees, requires admin approval';

-- ── notifications ────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null
                          check (type in ('shift_assigned', 'shift_changed', 'swap_request', 'swap_approved', 'reminder')),
  title       text        not null,
  body        text        not null,
  read        boolean     not null default false,
  related_id  uuid,
  created_at  timestamptz not null default now()
);

comment on table public.notifications is 'In-app notifications per user';

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists shifts_date_idx
  on public.shifts (date);

create index if not exists shifts_assigned_to_idx
  on public.shifts (assigned_to);

create index if not exists availability_user_date_idx
  on public.availability (user_id, date);

create index if not exists notifications_user_read_idx
  on public.notifications (user_id, read);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at auto-update for shifts
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shifts_set_updated_at on public.shifts;
create trigger shifts_set_updated_at
  before update on public.shifts
  for each row execute function public.set_updated_at();

-- Auto-create profile on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, nickname, role, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Νέος Υπάλληλος'),
    coalesce(new.raw_user_meta_data->>'nickname', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    '#FFD800'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- get_week_schedule: all shifts for a 7-day window with employee info
create or replace function public.get_week_schedule(start_date date)
returns table (
  shift_id          uuid,
  date              date,
  shift_type        text,
  start_time        time,
  end_time          time,
  split_break_start time,
  split_break_end   time,
  notes             text,
  employee_id       uuid,
  full_name         text,
  nickname          text,
  color             text
)
language sql
stable
as $$
  select
    s.id            as shift_id,
    s.date,
    s.shift_type,
    s.start_time,
    s.end_time,
    s.split_break_start,
    s.split_break_end,
    s.notes,
    p.id            as employee_id,
    p.full_name,
    p.nickname,
    p.color
  from public.shifts s
  left join public.profiles p on p.id = s.assigned_to
  where s.date >= start_date
    and s.date <  start_date + interval '7 days'
  order by s.date, s.start_time;
$$;

-- get_monthly_hours: total worked hours per user per month
create or replace function public.get_monthly_hours(
  p_user_id uuid,
  p_month   int,
  p_year    int
)
returns numeric
language sql
stable
as $$
  select coalesce(
    sum(
      case s.shift_type
        -- morning:  08:00–15:00 = 7h
        when 'morning' then 7
        -- evening:  16:00–23:00 = 7h
        when 'evening' then 7
        -- split: 11:00–15:00 + 19:00–23:00 = 8h
        when 'split'   then 8
        else
          -- fallback: calculate from actual times stored
          extract(epoch from (s.end_time - s.start_time)) / 3600
          - coalesce(
              extract(epoch from (s.split_break_end - s.split_break_start)) / 3600,
              0
            )
      end
    ),
    0
  )
  from public.shifts s
  where s.assigned_to = p_user_id
    and extract(month from s.date) = p_month
    and extract(year  from s.date) = p_year;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.shifts        enable row level security;
alter table public.availability  enable row level security;
alter table public.shift_swaps   enable row level security;
alter table public.notifications enable row level security;

-- Helper: is current user admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── profiles policies ────────────────────────────────────────
drop policy if exists "profiles: authenticated read all"  on public.profiles;
drop policy if exists "profiles: self update"             on public.profiles;
drop policy if exists "profiles: admin update all"        on public.profiles;

create policy "profiles: authenticated read all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: self update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles: admin update all"
  on public.profiles for update
  to authenticated
  using (public.is_admin());

-- ── shifts policies ──────────────────────────────────────────
drop policy if exists "shifts: authenticated read all"  on public.shifts;
drop policy if exists "shifts: admin insert"            on public.shifts;
drop policy if exists "shifts: admin update"            on public.shifts;
drop policy if exists "shifts: admin delete"            on public.shifts;

create policy "shifts: authenticated read all"
  on public.shifts for select
  to authenticated
  using (true);

create policy "shifts: admin insert"
  on public.shifts for insert
  to authenticated
  with check (public.is_admin());

create policy "shifts: admin update"
  on public.shifts for update
  to authenticated
  using (public.is_admin());

create policy "shifts: admin delete"
  on public.shifts for delete
  to authenticated
  using (public.is_admin());

-- ── availability policies ─────────────────────────────────────
drop policy if exists "availability: authenticated read all"  on public.availability;
drop policy if exists "availability: self insert"             on public.availability;
drop policy if exists "availability: self update"             on public.availability;
drop policy if exists "availability: self delete"             on public.availability;

create policy "availability: authenticated read all"
  on public.availability for select
  to authenticated
  using (true);

create policy "availability: self insert"
  on public.availability for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "availability: self update"
  on public.availability for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "availability: self delete"
  on public.availability for delete
  to authenticated
  using (user_id = auth.uid());

-- ── shift_swaps policies ──────────────────────────────────────
drop policy if exists "swaps: parties read"      on public.shift_swaps;
drop policy if exists "swaps: auth insert"       on public.shift_swaps;
drop policy if exists "swaps: employee accept"   on public.shift_swaps;
drop policy if exists "swaps: admin full"        on public.shift_swaps;

create policy "swaps: parties read"
  on public.shift_swaps for select
  to authenticated
  using (
    requested_by = auth.uid()
    or requested_to = auth.uid()
    or public.is_admin()
  );

create policy "swaps: auth insert"
  on public.shift_swaps for insert
  to authenticated
  with check (requested_by = auth.uid());

-- Employee can accept/reject (move to accepted_by_employee or rejected)
create policy "swaps: employee accept"
  on public.shift_swaps for update
  to authenticated
  using (requested_to = auth.uid())
  with check (status in ('accepted_by_employee', 'rejected'));

create policy "swaps: admin full"
  on public.shift_swaps for all
  to authenticated
  using (public.is_admin());

-- ── notifications policies ────────────────────────────────────
drop policy if exists "notifications: own read"   on public.notifications;
drop policy if exists "notifications: own update" on public.notifications;
drop policy if exists "notifications: admin insert" on public.notifications;

create policy "notifications: own read"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications: own update"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications: admin insert"
  on public.notifications for insert
  to authenticated
  with check (public.is_admin());

-- ============================================================
-- REALTIME
-- ============================================================
-- Enable realtime for tables that need live updates
alter publication supabase_realtime add table public.shifts;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.shift_swaps;
