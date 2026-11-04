-- Chat between the judge (/admin) and the kid about one contest drawing, live over Supabase Realtime.
-- Additive only: creates a new table; existing contests, drawings and players are not touched.
-- Safe to run again.

create table if not exists public.submission_messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  -- Copied from the submission by the trigger, so /admin can listen to a whole contest at once.
  contest_id uuid not null references public.contests (id) on delete cascade,
  sender text not null check (sender in ('judge', 'artist')),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists submission_messages_thread
  on public.submission_messages (submission_id, created_at);
create index if not exists submission_messages_contest on public.submission_messages (contest_id);

-- The server decides who is talking: admins are the judge, the drawing's owner is the artist,
-- anyone else is refused. Kids are limited to 5 messages a minute.
create or replace function public.stamp_submission_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
  cid uuid;
  recent int;
begin
  select device_id, contest_id into owner, cid from public.submissions where id = new.submission_id;
  if owner is null then raise exception 'submission_not_found'; end if;

  if public.is_admin() then
    new.sender := 'judge';
  elsif owner = auth.uid() then
    new.sender := 'artist';
    select count(*) into recent from public.submission_messages
      where submission_id = new.submission_id and sender = 'artist'
        and created_at > now() - interval '1 minute';
    if recent >= 5 then raise exception 'slow_down'; end if;
  else
    raise exception 'not_allowed';
  end if;

  new.contest_id := cid;
  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end $$;

drop trigger if exists submission_messages_stamp on public.submission_messages;
create trigger submission_messages_stamp before insert on public.submission_messages
  for each row execute function public.stamp_submission_message();

alter table public.submission_messages enable row level security;

drop policy if exists "read own thread or admin" on public.submission_messages;
create policy "read own thread or admin" on public.submission_messages for select using (
  public.is_admin()
  or exists (select 1 from public.submissions s where s.id = submission_id and s.device_id = auth.uid())
);
drop policy if exists "write own thread or admin" on public.submission_messages;
create policy "write own thread or admin" on public.submission_messages for insert with check (
  public.is_admin()
  or exists (select 1 from public.submissions s where s.id = submission_id and s.device_id = auth.uid())
);
drop policy if exists "admins delete messages" on public.submission_messages;
create policy "admins delete messages" on public.submission_messages for delete using (public.is_admin());

grant select, insert, delete on public.submission_messages to authenticated;

-- Live delivery. Row security above still decides who receives each message.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submission_messages'
  ) then
    alter publication supabase_realtime add table public.submission_messages;
  end if;
end $$;
