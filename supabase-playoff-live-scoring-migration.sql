-- Run after supabase-match-integrity-migration.sql to allow organizers to
-- publish each BO3 game as it finishes without advancing the bracket early.

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

alter table public.playoff_matches
  add constraint playoff_matches_score_status_check check (
    (status = 'upcoming' and score_a is null and score_b is null and game_results = '[]'::jsonb)
    or (status = 'live' and score_a in (0, 1) and score_b in (0, 1) and score_a + score_b between 1 and 2)
    or (status = 'completed' and ((score_a = 2 and score_b in (0, 1)) or (score_b = 2 and score_a in (0, 1))))
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

  if new.status = 'upcoming' then
    return new;
  end if;
  if jsonb_typeof(new.game_results) <> 'array' then
    raise exception 'game_results must be a JSON array';
  end if;
  game_count := jsonb_array_length(new.game_results);
  if game_count < 1 or game_count > 3 then
    raise exception 'A BO3 must record between one and three games';
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
  if new.status = 'live' and (wins_a >= 2 or wins_b >= 2) then
    raise exception 'A team reaching two wins must complete the series';
  end if;
  return new;
end;
$$;
