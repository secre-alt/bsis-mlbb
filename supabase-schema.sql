-- ════════════════════════════════════════════════════════════════════════
-- BSIS MLBB Intramurals — schema + security policies
-- Run this once in your Supabase project's SQL Editor.
-- ════════════════════════════════════════════════════════════════════════

-- ── Tables ────────────────────────────────────────────────────────────────
create table if not exists teams (
  id         bigint generated always as identity primary key,
  abbr       text not null check (char_length(btrim(abbr)) between 1 and 5),
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  color_idx  int  not null default 0 check (color_idx between 0 and 5),
  logo_url   text,
  created_at timestamptz not null default now()
);

-- Safe to run on an existing installation created before team logos existed.
alter table teams add column if not exists logo_url text;

create table if not exists matches (
  id          bigint generated always as identity primary key,
  num         int not null check (num > 0),
  round       int not null check (round > 0),
  team_a      bigint not null references teams(id) on delete restrict,
  team_b      bigint not null references teams(id) on delete restrict,
  score_a     int,
  score_b     int,
  match_date  date,
  match_time  text,
  status      text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  created_at  timestamptz not null default now(),
  completed_at timestamptz,
  updated_at  timestamptz not null default now(),
  constraint different_teams check (team_a <> team_b),
  constraint valid_scores check (
    (status = 'upcoming' and score_a is null and score_b is null)
    or (status = 'live' and score_a in (0, 1) and score_b in (0, 1))
    or
    (
      status = 'completed'
      and (
        (score_a = 2 and score_b in (0, 1))
        or (score_b = 2 and score_a in (0, 1))
      )
    )
  )
);

create unique index if not exists matches_num_key on matches(num);
create unique index if not exists teams_abbr_key on teams(lower(btrim(abbr)));

-- Playoffs are deliberately separate from regular-season matches so they
-- cannot affect points, W/L, or regular-season seeding.
create table if not exists playoff_matches (
  id           bigint generated always as identity primary key,
  slot         text not null unique check (slot in ('semifinal_1', 'semifinal_2', 'grand_final')),
  round        int not null check (round in (1, 2)),
  team_a       bigint references teams(id) on delete restrict,
  team_b       bigint references teams(id) on delete restrict,
  score_a      int,
  score_b      int,
  game_results jsonb not null default '[]'::jsonb,
  status       text not null default 'upcoming' check (status in ('upcoming', 'live', 'completed')),
  updated_at   timestamptz not null default now(),
  check (team_a is null or team_b is null or team_a <> team_b),
  check (
    (status = 'upcoming' and score_a is null and score_b is null and game_results = '[]'::jsonb)
    or (status = 'live' and score_a in (0, 1) and score_b in (0, 1) and score_a + score_b between 1 and 2)
    or (status = 'completed' and ((score_a = 2 and score_b in (0, 1)) or (score_b = 2 and score_a in (0, 1))))
  )
);

-- Organizers/admins are listed here by their Supabase Auth user id.
-- Being able to log in does NOT make someone an admin — only being listed
-- in this table does. Add rows for organizer accounts you create in
-- Authentication → Users, e.g.:
--   insert into admins (user_id) values ('paste-the-user-uuid-here');
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists match_audit (
  id bigint generated always as identity primary key,
  match_id bigint,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users(id) on delete set null,
  old_row jsonb,
  new_row jsonb,
  created_at timestamptz not null default now()
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

create or replace function set_match_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function audit_match_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into match_audit (match_id, action, changed_by, old_row, new_row)
  values (
    coalesce(new.id, old.id),
    lower(tg_op),
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger set_match_updated_at
  before update on matches
  for each row execute function set_match_updated_at();

create trigger audit_match_change
  after insert or update or delete on matches
  for each row execute function audit_match_change();

-- ── Row Level Security ───────────────────────────────────────────────────
-- This is the real security boundary. The client-side "Admin" UI state is
-- just a convenience — every insert/update/delete is re-checked here by
-- Postgres itself, so it can't be bypassed from the browser console.
alter table teams enable row level security;
alter table matches enable row level security;
alter table admins enable row level security;
alter table match_audit enable row level security;
alter table playoff_matches enable row level security;

-- Standings/schedule/results are public — anyone (including logged-out
-- visitors using only the anon key) can read them.
create policy "public can read teams" on teams
  for select using (true);
create policy "public can read matches" on matches
  for select using (true);
create policy "public can read playoff matches" on playoff_matches
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
create policy "admins can insert playoff matches" on playoff_matches
  for insert with check (is_admin());
create policy "admins can update playoff matches" on playoff_matches
  for update using (is_admin());

-- Nobody needs to read the admins table from the client.
create policy "no client access to admins" on admins
  for select using (false);
create policy "admins can read match audit" on match_audit
  for select using (is_admin());

-- ── Team logo uploads ─────────────────────────────────────────────────────
-- The image files are public so viewers can display them, while only listed
-- admins may create, replace, or remove them.
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do update set public = true;

create policy "public can read team logos" on storage.objects
  for select using (bucket_id = 'team-logos');
create policy "admins can upload team logos" on storage.objects
  for insert with check (bucket_id = 'team-logos' and is_admin());
create policy "admins can update team logos" on storage.objects
  for update using (bucket_id = 'team-logos' and is_admin())
  with check (bucket_id = 'team-logos' and is_admin());
create policy "admins can delete team logos" on storage.objects
  for delete using (bucket_id = 'team-logos' and is_admin());

-- ── Realtime ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table playoff_matches;
