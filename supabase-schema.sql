-- ════════════════════════════════════════════════════════════════════════
-- BSIS MLBB Intramurals — schema + security policies
-- Run this once in your Supabase project's SQL Editor.
-- ════════════════════════════════════════════════════════════════════════

-- ── Tables ────────────────────────────────────────────────────────────────
create table if not exists teams (
  id         bigint generated always as identity primary key,
  abbr       text not null check (char_length(abbr) between 1 and 5),
  name       text not null check (char_length(name) between 1 and 80),
  color_idx  int  not null default 0 check (color_idx between 0 and 5),
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id          bigint generated always as identity primary key,
  num         int not null,
  round       int not null,
  team_a      bigint not null references teams(id) on delete cascade,
  team_b      bigint not null references teams(id) on delete cascade,
  score_a     int,
  score_b     int,
  match_date  date,
  match_time  text,
  status      text not null default 'upcoming' check (status in ('upcoming', 'completed')),
  created_at  timestamptz not null default now(),
  constraint different_teams check (team_a <> team_b),
  constraint valid_scores check (
    (status = 'upcoming' and score_a is null and score_b is null)
    or
    (status = 'completed' and score_a is not null and score_b is not null and score_a <> score_b)
  )
);

create unique index if not exists matches_num_key on matches(num);

-- Organizers/admins are listed here by their Supabase Auth user id.
-- Being able to log in does NOT make someone an admin — only being listed
-- in this table does. Add rows for organizer accounts you create in
-- Authentication → Users, e.g.:
--   insert into admins (user_id) values ('paste-the-user-uuid-here');
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ── Helper: is the current request from a listed admin? ────────────────────
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admins where user_id = auth.uid()
  );
$$;

-- ── Row Level Security ───────────────────────────────────────────────────
-- This is the real security boundary. The client-side "Admin" UI state is
-- just a convenience — every insert/update/delete is re-checked here by
-- Postgres itself, so it can't be bypassed from the browser console.
alter table teams enable row level security;
alter table matches enable row level security;
alter table admins enable row level security;

-- Standings/schedule/results are public — anyone (including logged-out
-- visitors using only the anon key) can read them.
create policy "public can read teams" on teams
  for select using (true);
create policy "public can read matches" on matches
  for select using (true);

-- Only rows in `admins` can write. Regular authenticated accounts that
-- aren't in `admins` still can't add teams, edit scores, etc.
create policy "admins can insert teams" on teams
  for insert with check (is_admin());
create policy "admins can update teams" on teams
  for update using (is_admin());
create policy "admins can delete teams" on teams
  for delete using (is_admin());

create policy "admins can insert matches" on matches
  for insert with check (is_admin());
create policy "admins can update matches" on matches
  for update using (is_admin());
create policy "admins can delete matches" on matches
  for delete using (is_admin());

-- Nobody needs to read the admins table from the client.
create policy "no client access to admins" on admins
  for select using (false);

-- ── Realtime ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table matches;
