-- Remember when a contest's results were published, so the home banner can stop showing a finished
-- contest a couple of days later (results are often published before ends_at). Safe to run again.

alter table public.contests add column if not exists results_published_at timestamptz;

-- Contests published before this column existed: count from now.
update public.contests
set results_published_at = now()
where results_published and results_published_at is null;

create or replace function public.stamp_results_published() returns trigger
language plpgsql as $$
begin
  if new.results_published and not coalesce(old.results_published, false) then
    new.results_published_at := now();
  elsif not new.results_published then
    new.results_published_at := null;
  end if;
  return new;
end $$;

drop trigger if exists contests_stamp_results on public.contests;
create trigger contests_stamp_results before update of results_published on public.contests
  for each row execute function public.stamp_results_published();

-- contest_overview expands c.* when created, so rebuild it to include the new column.
drop view if exists public.contest_overview;
create view public.contest_overview with (security_invoker = false) as
  select c.*, (select count(*) from public.submissions s where s.contest_id = c.id)::int as entries
  from public.contests c;
grant select on public.contest_overview to anon, authenticated;
