-- Run against a disposable migrated database: psql -v ON_ERROR_STOP=1 -f supabase/tests/rewards.sql
begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111');
insert into public.players(device_id,name) values('11111111-1111-4111-8111-111111111111','Reward SQL Test');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
begin
 if not public.claim_daily_checkin() then raise exception 'First check-in failed'; end if;
 if public.claim_daily_checkin() then raise exception 'Duplicate check-in rewarded'; end if;
 if (select sum(delta) from public.point_ledger where device_id=auth.uid()) <> 10 then raise exception 'Wrong daily balance'; end if;
 if not (public.daily_checkin_status()->>'claimed')::boolean then raise exception 'Wrong daily status'; end if;
end $$;
rollback;
