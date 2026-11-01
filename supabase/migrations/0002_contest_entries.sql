-- Public list of who joined each contest, for the contest page.
-- Names are always visible; drawings only once the contest has ended (no copying while it's live);
-- ranks only once results are published. Safe to run again.

create or replace view public.contest_entries with (security_invoker = false) as
  select
    s.id,
    s.contest_id,
    s.player_name,
    s.created_at,
    case when c.results_published or now() > c.ends_at then s.image_path end as image_path,
    case when c.results_published then s.rank end as rank
  from public.submissions s
  join public.contests c on c.id = s.contest_id;

grant select on public.contest_entries to anon, authenticated;
