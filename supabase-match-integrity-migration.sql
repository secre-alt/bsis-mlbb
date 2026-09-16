-- Run this once in Supabase SQL Editor for an existing deployment.
-- It preserves current data while enforcing these rules for all future writes.

alter table public.matches
  drop constraint if exists valid_scores;

alter table public.matches
  add constraint valid_scores check (
    (status = 'upcoming' and score_a is null and score_b is null)
    or (status = 'live' and score_a in (0, 1) and score_b in (0, 1))
    or (
      status = 'completed'
      and (
        (score_a = 2 and score_b in (0, 1))
        or (score_b = 2 and score_a in (0, 1))
      )
    )
  ) not valid;

-- PostgreSQL has no `add constraint if not exists`; guard these so the
-- migration can be safely rerun after a partial previous execution.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_num_positive'
  ) then
    alter table public.matches
      add constraint matches_num_positive check (num > 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.matches'::regclass
      and conname = 'matches_round_positive'
  ) then
    alter table public.matches
      add constraint matches_round_positive check (round > 0) not valid;
  end if;
end;
$$;

-- Race-safe duplicate protection when multiple organizers save at once.
create unique index if not exists matches_num_key on public.matches (num);

-- Run the following after correcting any legacy rows that do not comply:
-- alter table public.matches validate constraint valid_scores;
-- alter table public.matches validate constraint matches_num_positive;
-- alter table public.matches validate constraint matches_round_positive;

create unique index if not exists teams_abbr_key
  on public.teams (lower(btrim(abbr)));

-- Separate playoff rows never contribute to regular-season standings.
create table if not exists public.playoff_matches (
  id bigint generated always as identity primary key,
  slot text not null unique check (slot in ('semifinal_1', 'semifinal_2', 'grand_final')),
  round int not null check (round in (1, 2)),
  team_a bigint references public.teams(id) on delete restrict,
  team_b bigint references public.teams(id) on delete restrict,
  score_a int,
  score_b int,
  game_results jsonb not null default '[]'::jsonb,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed')),
  updated_at timestamptz not null default now(),
  check (team_a is null or team_b is null or team_a <> team_b),
  check ((status = 'upcoming' and score_a is null and score_b is null) or (status = 'completed' and ((score_a = 2 and score_b in (0, 1)) or (score_b = 2 and score_a in (0, 1)))))
);

alter table public.playoff_matches enable row level security;
drop policy if exists "public can read playoff matches" on public.playoff_matches;
create policy "public can read playoff matches" on public.playoff_matches for select using (true);
drop policy if exists "admins can insert playoff matches" on public.playoff_matches;
create policy "admins can insert playoff matches" on public.playoff_matches for insert with check (public.is_admin());
drop policy if exists "admins can update playoff matches" on public.playoff_matches;
create policy "admins can update playoff matches" on public.playoff_matches for update using (public.is_admin());

create or replace function public.set_playoff_match_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_playoff_match_updated_at on public.playoff_matches;
create trigger set_playoff_match_updated_at before update on public.playoff_matches for each row execute function public.set_playoff_match_updated_at();

-- Enforce bracket progression and BO3 game records even for direct API calls.
create or replace function public.enforce_playoff_match_integrity()
returns trigger
language plpgsql
as $$
declare
  semi_one public.playoff_matches;
  semi_two public.playoff_matches;
  expected_a bigint;
  expected_b bigint;
  game jsonb;
  wins_a int := 0;
  wins_b int := 0;
  game_count int;
begin
  if tg_op = 'UPDATE' and old.slot in ('semifinal_1', 'semifinal_2') and old.status = 'completed' then
    raise exception 'Completed semifinal results cannot be changed';
  end if;
  if new.slot in ('semifinal_1', 'semifinal_2') and exists (select 1 from public.playoff_matches where slot = 'grand_final') then
    raise exception 'Semifinal teams cannot change after the Grand Final is created';
  end if;
  if new.team_a is null or new.team_b is null then
    raise exception 'Playoff matches require two teams';
  end if;
  if new.slot = 'grand_final' then
    select * into semi_one from public.playoff_matches where slot = 'semifinal_1';
    select * into semi_two from public.playoff_matches where slot = 'semifinal_2';
    if semi_one.id is null or semi_two.id is null or semi_one.status <> 'completed' or semi_two.status <> 'completed' then
      raise exception 'Both semifinals must be completed before the Grand Final';
    end if;
    expected_a := case when semi_one.score_a > semi_one.score_b then semi_one.team_a else semi_one.team_b end;
    expected_b := case when semi_two.score_a > semi_two.score_b then semi_two.team_a else semi_two.team_b end;
    if new.team_a <> expected_a or new.team_b <> expected_b then
      raise exception 'Grand Final teams must be the two semifinal winners';
    end if;
  end if;
  if new.status = 'completed' then
    if jsonb_typeof(new.game_results) <> 'array' then
      raise exception 'game_results must be a JSON array';
    end if;
    game_count := jsonb_array_length(new.game_results);
    if game_count < 2 or game_count > 3 then
      raise exception 'A BO3 requires two or three recorded games';
    end if;
    for game in select value from jsonb_array_elements(new.game_results) loop
      if game = '"A"'::jsonb then wins_a := wins_a + 1;
      elsif game = '"B"'::jsonb then wins_b := wins_b + 1;
      else raise exception 'Each recorded game winner must be A or B';
      end if;
      if wins_a = 2 or wins_b = 2 then
        if wins_a + wins_b < game_count then
          raise exception 'No games may be recorded after a team reaches two wins';
        end if;
      end if;
    end loop;
    if wins_a <> new.score_a or wins_b <> new.score_b then
      raise exception 'Game winners must match the submitted BO3 score';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_playoff_match_integrity on public.playoff_matches;
create trigger enforce_playoff_match_integrity
  before insert or update on public.playoff_matches
  for each row execute function public.enforce_playoff_match_integrity();

-- A six-team single round robin has exactly 15 unique fixtures. These guards
-- prevent client/API writes from quietly creating extra or duplicate fixtures.
create unique index if not exists matches_unique_fixture
  on public.matches (least(team_a, team_b), greatest(team_a, team_b));
create or replace function public.enforce_regular_season_lock()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.playoff_matches where slot in ('semifinal_1', 'semifinal_2')) then
    raise exception 'Regular season is locked after playoff seeding';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.matches) >= 15 then
    raise exception 'A six-team single round robin cannot exceed 15 matches';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists enforce_regular_season_lock on public.matches;
create trigger enforce_regular_season_lock
  before insert or update or delete on public.matches
  for each row execute function public.enforce_regular_season_lock();

-- Preserve historical standings by preventing a team with matches from being
-- deleted directly in SQL (the application also enforces this rule).
alter table public.matches drop constraint if exists matches_team_a_fkey;
alter table public.matches drop constraint if exists matches_team_b_fkey;
alter table public.matches
  add constraint matches_team_a_fkey foreign key (team_a)
  references public.teams(id) on delete restrict;
alter table public.matches
  add constraint matches_team_b_fkey foreign key (team_b)
  references public.teams(id) on delete restrict;

-- Keep a server-managed edit timestamp and history for organizer changes.
alter table public.matches
  add column if not exists updated_at timestamptz not null default now();

alter table public.matches
  add column if not exists completed_at timestamptz;

update public.matches
  set completed_at = coalesce(updated_at, created_at)
  where status = 'completed' and completed_at is null;

create or replace function public.set_match_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_match_updated_at on public.matches;
create trigger set_match_updated_at
  before update on public.matches
  for each row execute function public.set_match_updated_at();

create table if not exists public.match_audit (
  id bigint generated always as identity primary key,
  match_id bigint,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users(id) on delete set null,
  old_row jsonb,
  new_row jsonb,
  created_at timestamptz not null default now()
);

alter table public.match_audit enable row level security;
drop policy if exists "admins can read match audit" on public.match_audit;
create policy "admins can read match audit" on public.match_audit
  for select using (public.is_admin());

create or replace function public.audit_match_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.match_audit (match_id, action, changed_by, old_row, new_row)
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

drop trigger if exists audit_match_change on public.matches;
create trigger audit_match_change
  after insert or update or delete on public.matches
  for each row execute function public.audit_match_change();

do $$
begin
  alter publication supabase_realtime add table public.playoff_matches;
exception when duplicate_object then null;
end;
$$;
