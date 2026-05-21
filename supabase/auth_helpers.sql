-- ============================================================
-- COO Schedule — Auth Helpers
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- ── RPC: nickname → email lookup (used by login form) ─────────────────────
-- SECURITY DEFINER so anon role can call it without exposing the email column.
-- Returns NULL if nickname not found, so the login form can show a generic error.

create or replace function public.get_email_by_nickname(p_nickname text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select p.email
  from public.profiles p
  where lower(p.nickname) = lower(p_nickname)
    and p.active = true
  limit 1;
$$;

-- Only allow anon + authenticated to call this function
revoke all on function public.get_email_by_nickname(text) from public;
grant execute on function public.get_email_by_nickname(text) to anon, authenticated;

-- ── Updated trigger: handle_new_user ──────────────────────────────────────
-- Stores the email from auth.users into profiles so the RPC above can find it.
-- Replace the one from schema.sql.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, nickname, role, color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Νέος Υπάλληλος'),
    coalesce(new.raw_user_meta_data->>'nickname',  'user_' || substr(new.id::text, 1, 6)),
    coalesce(new.raw_user_meta_data->>'role',      'employee'),
    coalesce(new.raw_user_meta_data->>'color',     '#FFD800')
  )
  on conflict (id) do update set
    email = excluded.email;
  return new;
end;
$$;

-- Trigger already exists from schema.sql — no need to recreate.

-- ── How to create a new employee account (admin workflow) ─────────────────
--
-- 1. Supabase Dashboard → Authentication → Users → "Add user"
--    Email:    lenio@coo.internal   (internal, user never sees it)
--    Password: (strong password you share with the employee)
--    ✓ Auto-confirm email
--
-- 2. Copy the generated UUID.
--
-- 3. Run this snippet to set the correct nickname / metadata:
--
--    update public.profiles
--    set
--      nickname   = 'Λένιο',
--      full_name  = 'Λένιο',
--      role       = 'employee',
--      color      = '#FFD800',
--      active     = true
--    where id = '<paste-uuid-here>';
--
-- That's it. The employee logs in with nickname "Λένιο" + their password.
-- They never need to know their email.
