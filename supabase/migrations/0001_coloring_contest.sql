-- Coloring contest: players, contests, submissions, points, premium pages.
-- Identity = Supabase anonymous auth user (one per device). Admins = email users in public.admins.
-- Run once in Supabase SQL editor (or `supabase db push`).

-- ───────────────────────────── tables ─────────────────────────────

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create table public.players (
  device_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Names are unique (case/space-insensitive) so leaderboards never show two "Mia"s.
create unique index players_name_unique on public.players (lower(btrim(name)));

create table public.contests (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '',
  page_id text, -- coloring page to use; null = free choice
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_participants int not null default 100 check (max_participants > 0),
  prizes int[] not null default '{100,60,30}' check (array_length(prizes, 1) = 3),
  results_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests (id) on delete cascade,
  device_id uuid not null default auth.uid() references public.players (device_id) on delete cascade,
  player_name text not null,
  image_path text not null,
  rank smallint check (rank between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contest_id, device_id)
);
create unique index submissions_one_rank_per_contest on public.submissions (contest_id, rank) where rank is not null;

create table public.point_ledger (
  id bigint generated always as identity primary key,
  device_id uuid not null references public.players (device_id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('entry', 'prize', 'purchase', 'admin')),
  ref text,
  created_at timestamptz not null default now()
);
create index point_ledger_device on public.point_ledger (device_id);
-- One entry bonus / prize per contest per device.
create unique index point_ledger_once on public.point_ledger (device_id, reason, ref) where reason in ('entry', 'prize', 'purchase');

create table public.premium_pages (
  id text primary key, -- matches bundled asset id, e.g. 'premium/candy-kingdom'
  price int not null check (price > 0),
  active boolean not null default true
);

create table public.purchases (
  device_id uuid not null references public.players (device_id) on delete cascade,
  page_id text not null references public.premium_pages (id),
  created_at timestamptz not null default now(),
  primary key (device_id, page_id)
);

-- ───────────────────────────── helpers ─────────────────────────────

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Lets the name sheet check a nickname before saving (players rows aren't readable by others).
create function public.name_available(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.players
    where lower(btrim(name)) = lower(btrim(p_name))
      and device_id is distinct from auth.uid()
  );
$$;

create view public.player_points with (security_invoker = true) as
  select p.device_id, p.name, coalesce(sum(l.delta), 0)::int as points
  from public.players p
  left join public.point_ledger l on l.device_id = p.device_id
  group by p.device_id, p.name;

-- Public, privacy-safe contest info incl. spots taken.
create view public.contest_overview with (security_invoker = false) as
  select c.*, (select count(*) from public.submissions s where s.contest_id = c.id)::int as entries
  from public.contests c;

-- Winners of published contests, for the Star Artists gallery.
create view public.hall_of_fame with (security_invoker = false) as
  select s.id, s.contest_id, c.title as contest_title, c.ends_at, s.player_name, s.image_path, s.rank
  from public.submissions s
  join public.contests c on c.id = s.contest_id
  where c.results_published and s.rank is not null;

-- ───────────────────────────── triggers ─────────────────────────────

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger players_touch before update on public.players
  for each row execute function public.touch_updated_at();

create function public.check_submission() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c public.contests;
  taken int;
begin
  if public.is_admin() then return new; end if; -- admins may set ranks any time

  select * into c from public.contests where id = new.contest_id;
  if c.id is null then raise exception 'contest_not_found'; end if;
  if now() < c.starts_at then raise exception 'contest_not_started'; end if;
  if now() > c.ends_at then raise exception 'contest_ended'; end if;

  new.device_id := auth.uid();
  new.rank := null; -- only admins rank
  select name into new.player_name from public.players where device_id = auth.uid();
  new.image_path := new.contest_id || '/' || auth.uid() || '.webp';

  if tg_op = 'INSERT' then
    select count(*) into taken from public.submissions where contest_id = new.contest_id;
    if taken >= c.max_participants then raise exception 'contest_full'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger submissions_check before insert or update on public.submissions
  for each row execute function public.check_submission();

create function public.award_entry_bonus() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.point_ledger (device_id, delta, reason, ref)
  values (new.device_id, 5, 'entry', new.contest_id::text)
  on conflict do nothing;
  return new;
end $$;

create trigger submissions_entry_bonus after insert on public.submissions
  for each row execute function public.award_entry_bonus();

-- ───────────────────────────── RPCs ─────────────────────────────

create function public.buy_premium_page(p_page_id text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_price int;
  v_balance int;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  if exists (select 1 from public.purchases where device_id = auth.uid() and page_id = p_page_id) then
    select points into v_balance from public.player_points where device_id = auth.uid();
    return v_balance;
  end if;

  select price into v_price from public.premium_pages where id = p_page_id and active;
  if v_price is null then raise exception 'page_not_for_sale'; end if;

  select coalesce(sum(delta), 0) into v_balance from public.point_ledger where device_id = auth.uid();
  if v_balance < v_price then raise exception 'not_enough_points'; end if;

  insert into public.purchases (device_id, page_id) values (auth.uid(), p_page_id);
  insert into public.point_ledger (device_id, delta, reason, ref) values (auth.uid(), -v_price, 'purchase', p_page_id);
  return v_balance - v_price;
end $$;

create function public.publish_results(p_contest_id uuid, p_first uuid, p_second uuid, p_third uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  c public.contests;
  winners uuid[] := array[p_first, p_second, p_third];
  i int;
  s public.submissions;
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  select * into c from public.contests where id = p_contest_id for update;
  if c.id is null then raise exception 'contest_not_found'; end if;
  if c.results_published then raise exception 'already_published'; end if;

  update public.submissions set rank = null where contest_id = p_contest_id;
  for i in 1..3 loop
    continue when winners[i] is null;
    update public.submissions set rank = i
      where id = winners[i] and contest_id = p_contest_id
      returning * into s;
    if s.id is null then raise exception 'submission_not_in_contest'; end if;
    insert into public.point_ledger (device_id, delta, reason, ref)
      values (s.device_id, c.prizes[i], 'prize', p_contest_id::text)
      on conflict do nothing;
  end loop;

  update public.contests set results_published = true where id = p_contest_id;
end $$;

create function public.admin_adjust_points(p_device_id uuid, p_delta int, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  insert into public.point_ledger (device_id, delta, reason, ref) values (p_device_id, p_delta, 'admin', p_note);
end $$;

revoke execute on function public.publish_results(uuid, uuid, uuid, uuid) from anon;
revoke execute on function public.admin_adjust_points(uuid, int, text) from anon;

-- ───────────────────────────── RLS ─────────────────────────────

alter table public.admins enable row level security;
alter table public.players enable row level security;
alter table public.contests enable row level security;
alter table public.submissions enable row level security;
alter table public.point_ledger enable row level security;
alter table public.premium_pages enable row level security;
alter table public.purchases enable row level security;

create policy "admins see admins" on public.admins for select using (public.is_admin());

create policy "own player" on public.players for select using (device_id = auth.uid() or public.is_admin());
create policy "create own player" on public.players for insert with check (device_id = auth.uid());
create policy "rename own player" on public.players for update using (device_id = auth.uid()) with check (device_id = auth.uid());

create policy "contests readable" on public.contests for select using (true);
create policy "admins manage contests" on public.contests for all using (public.is_admin()) with check (public.is_admin());

create policy "own or admin submissions" on public.submissions for select using (device_id = auth.uid() or public.is_admin());
create policy "submit own" on public.submissions for insert with check (device_id = auth.uid());
create policy "resubmit own" on public.submissions for update using (device_id = auth.uid() or public.is_admin());
create policy "admins delete submissions" on public.submissions for delete using (public.is_admin());

create policy "own ledger" on public.point_ledger for select using (device_id = auth.uid() or public.is_admin());

create policy "premium readable" on public.premium_pages for select using (true);
create policy "admins manage premium" on public.premium_pages for all using (public.is_admin()) with check (public.is_admin());

create policy "own purchases" on public.purchases for select using (device_id = auth.uid() or public.is_admin());

grant select on public.contest_overview, public.hall_of_fame to anon, authenticated;
grant select on public.player_points to authenticated;

-- ───────────────────────────── storage ─────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submissions', 'submissions', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- Path: {contest_id}/{device_id}.webp — only into a live contest, only your own file.
create policy "upload own entry" on storage.objects for insert to authenticated
with check (
  bucket_id = 'submissions'
  and (storage.foldername(name))[1]::uuid in (select id from public.contests where now() between starts_at and ends_at)
  and storage.filename(name) = auth.uid()::text || '.webp'
);
create policy "replace own entry" on storage.objects for update to authenticated
using (bucket_id = 'submissions' and storage.filename(name) = auth.uid()::text || '.webp')
with check (
  bucket_id = 'submissions'
  and (storage.foldername(name))[1]::uuid in (select id from public.contests where now() between starts_at and ends_at)
  and storage.filename(name) = auth.uid()::text || '.webp'
);
-- Upsert (re-sending a drawing) needs SELECT on your own object.
create policy "see own entry" on storage.objects for select to authenticated
using (bucket_id = 'submissions' and storage.filename(name) = auth.uid()::text || '.webp');
create policy "admins manage entries" on storage.objects for all to authenticated
using (bucket_id = 'submissions' and public.is_admin())
with check (bucket_id = 'submissions' and public.is_admin());

-- ───────────────────────────── seed ─────────────────────────────

insert into public.premium_pages (id, price) values
  ('premium/magic-unicorn-garden', 60),
  ('premium/underwater-palace', 80),
  ('premium/dragon-treasure-castle', 100),
  ('premium/enchanted-treehouse', 70),
  ('premium/space-adventure', 50),
  ('premium/candy-kingdom', 90)
on conflict (id) do nothing;
