-- Run this once in Supabase SQL Editor for an existing deployment.
-- It preserves current data while enforcing these rules for all future writes.

alter table public.matches
  drop constraint if exists valid_scores;

alter table public.matches
  add constraint valid_scores check (
    (status = 'upcoming' and score_a is null and score_b is null)
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
