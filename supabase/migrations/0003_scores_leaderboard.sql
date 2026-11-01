-- Full leaderboard: the judge scores every drawing (1–10), publishing ranks everyone
-- (1 → last). Only places 1–3 win prize stars / show in Star Artists. Safe to run again.

alter table public.submissions add column if not exists score smallint check (score between 1 and 10);
alter table public.submissions drop constraint if exists submissions_rank_check;
alter table public.submissions add constraint submissions_rank_check check (rank >= 1);

-- The judge saves scores straight from /admin (policy "resubmit own" already lets admins update).

-- Players can't set their own score (trigger already resets rank for non-admins).
create or replace function public.check_submission() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c public.contests;
  taken int;
begin
  if public.is_admin() then return new; end if; -- admins may score/rank any time

  select * into c from public.contests where id = new.contest_id;
  if c.id is null then raise exception 'contest_not_found'; end if;
  if now() < c.starts_at then raise exception 'contest_not_started'; end if;
  if now() > c.ends_at then raise exception 'contest_ended'; end if;

  new.device_id := auth.uid();
  new.rank := null;
  new.score := null; -- a new drawing needs a new look from the judge
  select name into new.player_name from public.players where device_id = auth.uid();
  new.image_path := new.contest_id || '/' || auth.uid() || '.webp';

  if tg_op = 'INSERT' then
    select count(*) into taken from public.submissions where contest_id = new.contest_id;
    if taken >= c.max_participants then raise exception 'contest_full'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Rank everyone by score (higher first; ties → whoever sent first). Top 3 get prize stars.
create or replace function public.publish_ranking(p_contest_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.contests;
  s record;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select * into c from public.contests where id = p_contest_id for update;
  if c.id is null then raise exception 'contest_not_found'; end if;
  if c.results_published then raise exception 'already_published'; end if;
  if not exists (select 1 from public.submissions where contest_id = p_contest_id and score is not null) then
    raise exception 'nothing_scored';
  end if;

  update public.submissions sub set rank = ranked.place
  from (
    select id, row_number() over (order by score desc nulls last, created_at asc) as place
    from public.submissions where contest_id = p_contest_id
  ) ranked
  where sub.id = ranked.id;

  for s in
    select device_id, rank from public.submissions
    where contest_id = p_contest_id and rank <= 3 and score is not null
  loop
    insert into public.point_ledger (device_id, delta, reason, ref)
      values (s.device_id, c.prizes[s.rank], 'prize', p_contest_id::text)
      on conflict do nothing;
  end loop;

  update public.contests set results_published = true where id = p_contest_id;
end $$;

revoke execute on function public.publish_ranking(uuid) from anon;

-- Star Artists = podium only.
create or replace view public.hall_of_fame with (security_invoker = false) as
  select s.id, s.contest_id, c.title as contest_title, c.ends_at, s.player_name, s.image_path, s.rank
  from public.submissions s
  join public.contests c on c.id = s.contest_id
  where c.results_published and s.rank between 1 and 3;

-- Who joined (names always; drawings after the end; rank + score once published).
drop view if exists public.contest_entries;
create view public.contest_entries with (security_invoker = false) as
  select
    s.id,
    s.contest_id,
    s.player_name,
    s.created_at,
    case when c.results_published or now() > c.ends_at then s.image_path end as image_path,
    case when c.results_published then s.rank end as rank,
    case when c.results_published then s.score end as score
  from public.submissions s
  join public.contests c on c.id = s.contest_id;

grant select on public.hall_of_fame, public.contest_entries to anon, authenticated;
