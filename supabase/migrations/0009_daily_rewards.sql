-- Daily rewards use the server's Vietnam calendar date, never the device clock.
alter table public.point_ledger drop constraint point_ledger_reason_check;
alter table public.point_ledger add constraint point_ledger_reason_check
  check (reason in ('entry', 'prize', 'purchase', 'admin', 'daily'));
create unique index daily_reward_once on public.point_ledger(device_id, ref) where reason = 'daily';

create function public.daily_checkin_status() returns jsonb
language sql stable security definer set search_path = public as $$
 select jsonb_build_object('claimed', exists(select 1 from public.point_ledger
 where device_id = auth.uid() and reason = 'daily'
 and ref = (now() at time zone 'Asia/Ho_Chi_Minh')::date::text), 'reward', 10);
$$;

create function public.claim_daily_checkin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
 if auth.uid() is null then raise exception 'not_signed_in'; end if;
 if not exists(select 1 from public.players where device_id = auth.uid()) then
   raise exception 'name_required';
 end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 insert into public.point_ledger(device_id, delta, reason, ref)
 values(auth.uid(), 10, 'daily', (now() at time zone 'Asia/Ho_Chi_Minh')::date::text)
 on conflict do nothing;
 return found;
end $$;

revoke all on function public.claim_daily_checkin(),public.daily_checkin_status() from public,anon;
grant execute on function public.claim_daily_checkin(),public.daily_checkin_status() to authenticated;
