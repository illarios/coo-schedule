-- ============================================================
-- COO Schedule — Push Subscriptions
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

-- ── Table ─────────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  endpoint   text        not null,
  p256dh     text        not null,
  auth       text        not null,
  user_agent text,
  created_at timestamptz not null default now(),
  -- One subscription per endpoint (device)
  unique (endpoint)
);

comment on table public.push_subscriptions is
  'Web Push subscriptions keyed by endpoint. One row per browser/device.';

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.push_subscriptions enable row level security;

-- Users can insert/delete their own subscriptions
drop policy if exists "push_subs: own insert" on public.push_subscriptions;
drop policy if exists "push_subs: own delete" on public.push_subscriptions;
drop policy if exists "push_subs: own select" on public.push_subscriptions;
drop policy if exists "push_subs: service role all" on public.push_subscriptions;

create policy "push_subs: own insert"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "push_subs: own delete"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

create policy "push_subs: own select"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

-- service_role (used by Edge Functions / API routes) bypasses RLS by default
-- No extra policy needed.

-- ── Enable realtime (optional — not needed for push_subscriptions) ─────────
-- alter publication supabase_realtime add table public.push_subscriptions;
