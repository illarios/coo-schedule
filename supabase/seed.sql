-- ============================================================
-- COO Schedule — Seed Data
-- ⚠️  Run AFTER schema.sql
-- ⚠️  Run AFTER creating the users manually in Supabase Auth
--     (Authentication → Users → Invite user, ή magic link login)
--
-- Βήματα:
-- 1. Πήγαινε Authentication → Users → "Add user" για κάθε email
-- 2. Αντέγραψε τα UUIDs που έδωσε η Supabase
-- 3. Αντικατέστησε τα placeholder UUIDs παρακάτω
-- 4. Τρέξε αυτό το αρχείο στο SQL Editor
-- ============================================================

-- ── Placeholder UUIDs (αντικατέστησε με τα πραγματικά) ──────
-- admin:    00000000-0000-0000-0000-000000000001
-- Λένιο:   00000000-0000-0000-0000-000000000002
-- Χριστίνα: 00000000-0000-0000-0000-000000000003
-- Ανθή:    00000000-0000-0000-0000-000000000004
-- Γιώτα:   00000000-0000-0000-0000-000000000005
-- Αλέκος:  00000000-0000-0000-0000-000000000006
-- Σίμαο:   00000000-0000-0000-0000-000000000007

-- ── Profiles ────────────────────────────────────────────────
insert into public.profiles (id, full_name, nickname, role, phone, color, active)
values
  (
    '00000000-0000-0000-0000-000000000001',
    'Διαχειριστής COO',
    'Admin',
    'admin',
    null,
    '#0A0A0A',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Λένιο',
    'Λένιο',
    'employee',
    null,
    '#FFD800',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Χριστίνα',
    'Χριστίνα',
    'employee',
    null,
    '#7DD3FC',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'Ανθή',
    'Ανθή',
    'employee',
    null,
    '#E63946',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'Γιώτα',
    'Γιώτα',
    'employee',
    null,
    '#4ADE80',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Αλέκος',
    'Αλέκος',
    'employee',
    null,
    '#FB923C',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    'Σίμαο',
    'Σίμαο',
    'employee',
    null,
    '#C084FC',
    true
  )
on conflict (id) do update set
  full_name  = excluded.full_name,
  nickname   = excluded.nickname,
  role       = excluded.role,
  color      = excluded.color,
  active     = excluded.active;

-- ── Demo shifts (τρέχουσα εβδομάδα) ─────────────────────────
-- Υπολογίζουμε τη Δευτέρα της τρέχουσας εβδομάδας δυναμικά
do $$
declare
  mon date := date_trunc('week', current_date)::date; -- Δευτέρα
  tue date := mon + 1;
  wed date := mon + 2;
  thu date := mon + 3;
  fri date := mon + 4;
  sat date := mon + 5;
  sun date := mon + 6;
begin

  -- Δευτέρα
  insert into public.shifts (date, shift_type, start_time, end_time, assigned_to, notes)
  values
    (mon, 'morning', '08:00', '15:00', '00000000-0000-0000-0000-000000000002', null),
    (mon, 'evening', '16:00', '23:00', '00000000-0000-0000-0000-000000000003', null),
    (mon, 'split',   '11:00', '23:00', '00000000-0000-0000-0000-000000000004', null);

  update public.shifts set split_break_start = '15:00', split_break_end = '19:00'
  where date = mon and shift_type = 'split';

  -- Τρίτη
  insert into public.shifts (date, shift_type, start_time, end_time, assigned_to)
  values
    (tue, 'morning', '08:00', '15:00', '00000000-0000-0000-0000-000000000005'),
    (tue, 'evening', '16:00', '23:00', '00000000-0000-0000-0000-000000000006'),
    (tue, 'split',   '11:00', '23:00', '00000000-0000-0000-0000-000000000007');

  update public.shifts set split_break_start = '15:00', split_break_end = '19:00'
  where date = tue and shift_type = 'split';

  -- Τετάρτη
  insert into public.shifts (date, shift_type, start_time, end_time, assigned_to)
  values
    (wed, 'morning', '08:00', '15:00', '00000000-0000-0000-0000-000000000002'),
    (wed, 'evening', '16:00', '23:00', '00000000-0000-0000-0000-000000000004'),
    (wed, 'split',   '11:00', '23:00', '00000000-0000-0000-0000-000000000006');

  update public.shifts set split_break_start = '15:00', split_break_end = '19:00'
  where date = wed and shift_type = 'split';

  -- Πέμπτη
  insert into public.shifts (date, shift_type, start_time, end_time, assigned_to)
  values
    (thu, 'morning', '08:00', '15:00', '00000000-0000-0000-0000-000000000003'),
    (thu, 'evening', '16:00', '23:00', '00000000-0000-0000-0000-000000000005'),
    (thu, 'split',   '11:00', '23:00', '00000000-0000-0000-0000-000000000007');

  update public.shifts set split_break_start = '15:00', split_break_end = '19:00'
  where date = thu and shift_type = 'split';

  -- Παρασκευή
  insert into public.shifts (date, shift_type, start_time, end_time, assigned_to)
  values
    (fri, 'morning', '08:00', '15:00', '00000000-0000-0000-0000-000000000006'),
    (fri, 'evening', '16:00', '23:00', '00000000-0000-0000-0000-000000000002'),
    (fri, 'split',   '11:00', '23:00', '00000000-0000-0000-0000-000000000004');

  update public.shifts set split_break_start = '15:00', split_break_end = '19:00'
  where date = fri and shift_type = 'split';

  -- Σάββατο
  insert into public.shifts (date, shift_type, start_time, end_time, assigned_to)
  values
    (sat, 'morning', '08:00', '15:00', '00000000-0000-0000-0000-000000000007'),
    (sat, 'evening', '16:00', '23:00', '00000000-0000-0000-0000-000000000003'),
    (sat, 'split',   '11:00', '23:00', '00000000-0000-0000-0000-000000000005');

  update public.shifts set split_break_start = '15:00', split_break_end = '19:00'
  where date = sat and shift_type = 'split';

  -- Κυριακή (λιγότερα άτομα)
  insert into public.shifts (date, shift_type, start_time, end_time, assigned_to)
  values
    (sun, 'morning', '08:00', '15:00', '00000000-0000-0000-0000-000000000003'),
    (sun, 'evening', '16:00', '23:00', '00000000-0000-0000-0000-000000000007');

end $$;

-- ── Demo availability (τρέχουσα εβδομάδα) ───────────────────
do $$
declare
  mon date := date_trunc('week', current_date)::date;
begin

  insert into public.availability (user_id, date, availability, note)
  values
    -- Λένιο: διαθέσιμο κάθε μέρα για οτιδήποτε
    ('00000000-0000-0000-0000-000000000002', mon,     'any',     null),
    ('00000000-0000-0000-0000-000000000002', mon + 1, 'any',     null),
    ('00000000-0000-0000-0000-000000000002', mon + 2, 'any',     null),
    ('00000000-0000-0000-0000-000000000002', mon + 3, 'morning', null),
    ('00000000-0000-0000-0000-000000000002', mon + 4, 'evening', null),
    ('00000000-0000-0000-0000-000000000002', mon + 5, 'any',     null),
    ('00000000-0000-0000-0000-000000000002', mon + 6, 'off',     'ρεπό'),

    -- Χριστίνα: προτιμά πρωί
    ('00000000-0000-0000-0000-000000000003', mon,     'morning', null),
    ('00000000-0000-0000-0000-000000000003', mon + 1, 'morning', null),
    ('00000000-0000-0000-0000-000000000003', mon + 2, 'off',     'ρεπό'),
    ('00000000-0000-0000-0000-000000000003', mon + 3, 'any',     null),
    ('00000000-0000-0000-0000-000000000003', mon + 4, 'morning', null),
    ('00000000-0000-0000-0000-000000000003', mon + 5, 'evening', null),
    ('00000000-0000-0000-0000-000000000003', mon + 6, 'any',     null),

    -- Ανθή: διαθέσιμη εκτός Τρίτη
    ('00000000-0000-0000-0000-000000000004', mon,     'any',     null),
    ('00000000-0000-0000-0000-000000000004', mon + 1, 'off',     'μάθημα'),
    ('00000000-0000-0000-0000-000000000004', mon + 2, 'evening', null),
    ('00000000-0000-0000-0000-000000000004', mon + 3, 'any',     null),
    ('00000000-0000-0000-0000-000000000004', mon + 4, 'split',   null),
    ('00000000-0000-0000-0000-000000000004', mon + 5, 'any',     null),
    ('00000000-0000-0000-0000-000000000004', mon + 6, 'off',     'ρεπό'),

    -- Γιώτα: προτιμά βράδυ
    ('00000000-0000-0000-0000-000000000005', mon,     'evening', null),
    ('00000000-0000-0000-0000-000000000005', mon + 1, 'any',     null),
    ('00000000-0000-0000-0000-000000000005', mon + 2, 'evening', null),
    ('00000000-0000-0000-0000-000000000005', mon + 3, 'off',     'ρεπό'),
    ('00000000-0000-0000-0000-000000000005', mon + 4, 'any',     null),
    ('00000000-0000-0000-0000-000000000005', mon + 5, 'split',   null),
    ('00000000-0000-0000-0000-000000000005', mon + 6, 'evening', null),

    -- Αλέκος: διαθέσιμος παντού
    ('00000000-0000-0000-0000-000000000006', mon,     'any',     null),
    ('00000000-0000-0000-0000-000000000006', mon + 1, 'any',     null),
    ('00000000-0000-0000-0000-000000000006', mon + 2, 'any',     null),
    ('00000000-0000-0000-0000-000000000006', mon + 3, 'any',     null),
    ('00000000-0000-0000-0000-000000000006', mon + 4, 'off',     'ρεπό'),
    ('00000000-0000-0000-0000-000000000006', mon + 5, 'any',     null),
    ('00000000-0000-0000-0000-000000000006', mon + 6, 'morning', null),

    -- Σίμαο: διαθέσιμος εκτός Σάββατο πρωί
    ('00000000-0000-0000-0000-000000000007', mon,     'any',     null),
    ('00000000-0000-0000-0000-000000000007', mon + 1, 'split',   null),
    ('00000000-0000-0000-0000-000000000007', mon + 2, 'any',     null),
    ('00000000-0000-0000-0000-000000000007', mon + 3, 'evening', null),
    ('00000000-0000-0000-0000-000000000007', mon + 4, 'any',     null),
    ('00000000-0000-0000-0000-000000000007', mon + 5, 'evening', 'όχι πρωί Σαβ'),
    ('00000000-0000-0000-0000-000000000007', mon + 6, 'any',     null)
  on conflict (user_id, date) do nothing;

end $$;

-- ── Demo notifications ───────────────────────────────────────
insert into public.notifications (user_id, type, title, body, read)
values
  (
    '00000000-0000-0000-0000-000000000002',
    'shift_assigned',
    'Νέα βάρδια!',
    'Σου έχει ανατεθεί πρωινή βάρδια για αύριο 08:00–15:00.',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'swap_request',
    'Αίτηση αλλαγής',
    'Ο Λένιο ζητά να αλλάξετε βάρδια την Παρασκευή.',
    false
  );

-- ── Verify seed ──────────────────────────────────────────────
select
  'profiles'     as tbl, count(*) from public.profiles
union all select
  'shifts'       as tbl, count(*) from public.shifts
union all select
  'availability' as tbl, count(*) from public.availability
union all select
  'notifications' as tbl, count(*) from public.notifications;
