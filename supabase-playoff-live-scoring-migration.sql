-- Run after supabase-match-integrity-migration.sql to allow organizers to
-- publish each BO5 game as it finishes without advancing the bracket early.

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.playoff_matches'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%score_a%'
  loop
    execute format('alter table public.playoff_matches drop constraint %I', constraint_name);
  end loop;
end;
$$;

-- Retain an organizer-only history for playoff writes, including live games.
create table if not exists public.playoff_match_audit (
  id bigint generated always as identity primary key,
  playoff_match_id bigint,
  action text not null check (action in ('insert', 'update', 'delete')),
  changed_by uuid references auth.users(id) on delete set null,
  old_row jsonb,
  new_row jsonb,
  created_at timestamptz not null default now()
);

alter table public.playoff_match_audit enable row level security;
drop policy if exists "admins can read playoff match audit" on public.playoff_match_audit;
create policy "admins can read playoff match audit" on public.playoff_match_audit
  for select using (public.is_admin());

create or replace function public.audit_playoff_match_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.playoff_match_audit (
    playoff_match_id,
    action,
    changed_by,
    old_row,
    new_row
  )
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

drop trigger if exists audit_playoff_match_change on public.playoff_matches;
create trigger audit_playoff_match_change
  after insert or update or delete on public.playoff_matches
  for each row execute function public.audit_playoff_match_change();

alter table public.playoff_matches
  add constraint playoff_matches_score_status_check check (
    (status = 'upcoming' and score_a is null and score_b is null and game_results = '[]'::jsonb)
    or (status = 'live' and score_a between 0 and 2 and score_b between 0 and 2 and score_a + score_b between 1 and 4)
    or (status = 'completed' and ((score_a = 3 and score_b in (0, 1, 2)) or (score_b = 3 and score_a in (0, 1, 2))))
  );

alter table public.playoff_matches
  drop constraint if exists playoff_matches_status_check;

alter table public.playoff_matches
  add constraint playoff_matches_status_check check (status in ('upcoming', 'live', 'completed'));

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
  previous_game_count int;
  game_index int;
begin
  if tg_op = 'INSERT' and new.status <> 'upcoming' then
    raise exception 'New playoff series must start as upcoming';
  end if;

  if tg_op = 'INSERT' and new.slot in ('semifinal_1', 'semifinal_2') and (
    select count(*)
    from public.matches
    where status = 'completed'
      and ((score_a = 2 and score_b in (0, 1)) or (score_b = 2 and score_a in (0, 1)))
  ) <> 15 then
    raise exception 'All 15 regular-season matches must be completed before playoff seeding';
  end if;

  if tg_op = 'UPDATE' and old.status = 'completed' then
    raise exception 'Completed playoff results cannot be changed';
  end if;
  if tg_op = 'UPDATE' and (
    new.slot <> old.slot
    or new.round <> old.round
    or new.team_a <> old.team_a
    or new.team_b <> old.team_b
  ) then
    raise exception 'Seeded playoff matchups cannot be changed';
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

  if jsonb_typeof(new.game_results) <> 'array' then
    raise exception 'game_results must be a JSON array';
  end if;

  if new.status = 'upcoming' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    previous_game_count := jsonb_array_length(old.game_results);
    if old.status = 'upcoming' and new.status <> 'live' then
      raise exception 'A playoff series must begin with a live first game';
    end if;
    if old.status = 'live' then
      if new.status not in ('live', 'completed') then
        raise exception 'A live playoff series cannot return to upcoming';
      end if;
      if jsonb_array_length(new.game_results) <> previous_game_count + 1 then
        raise exception 'Record exactly one new game result at a time';
      end if;
      for game_index in 0..previous_game_count - 1 loop
        if new.game_results -> game_index <> old.game_results -> game_index then
          raise exception 'Recorded game winners cannot be changed';
        end if;
      end loop;
    end if;
  end if;

  game_count := jsonb_array_length(new.game_results);
  if game_count < 1 or game_count > 5 then
    raise exception 'A BO5 must record between one and five games';
  end if;
  for game in select value from jsonb_array_elements(new.game_results) loop
    if game = '"A"'::jsonb then wins_a := wins_a + 1;
    elsif game = '"B"'::jsonb then wins_b := wins_b + 1;
    else raise exception 'Each recorded game winner must be A or B';
    end if;
    if wins_a = 3 or wins_b = 3 then
      if wins_a + wins_b < game_count then
        raise exception 'No games may be recorded after a team reaches three wins';
      end if;
    end if;
  end loop;
  if wins_a <> new.score_a or wins_b <> new.score_b then
    raise exception 'Game winners must match the submitted BO5 score';
  end if;
  if new.status = 'live' and (wins_a >= 3 or wins_b >= 3) then
    raise exception 'A team reaching three wins must complete the series';
  end if;
  return new;
end;
$$;
