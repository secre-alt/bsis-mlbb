-- Run this once in Supabase SQL Editor to enable regular-season live BO3 scores.
-- Live rows display publicly but are deliberately excluded from standings and seeding.

-- Replace the legacy score/status checks without depending on their generated names.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.matches'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) like '%score_a%'
        or pg_get_constraintdef(oid) like '%status%upcoming%completed%'
      )
  loop
    execute format('alter table public.matches drop constraint %I', constraint_name);
  end loop;
end;
$$;

alter table public.matches
  add constraint matches_score_status_check check (
    (status = 'upcoming' and score_a is null and score_b is null)
    or (status = 'live' and score_a in (0, 1) and score_b in (0, 1))
    or (status = 'completed' and ((score_a = 2 and score_b in (0, 1)) or (score_b = 2 and score_a in (0, 1))))
  ) not valid;

alter table public.matches
  add constraint matches_status_check check (status in ('upcoming', 'live', 'completed')) not valid;
