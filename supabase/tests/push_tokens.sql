-- Run on a disposable migrated database; all test data is rolled back.
begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
begin
 if has_table_privilege('authenticated','public.push_tokens','SELECT') then raise exception 'Client can list tokens'; end if;
 if has_function_privilege('anon','public.register_push_token(text,text,boolean)','EXECUTE') then raise exception 'Unauthenticated registration allowed'; end if;
 perform public.register_push_token('first-registration-token-for-test','ios',true);
 perform public.register_push_token('first-registration-token-for-test','ios',true);
 if (select count(*) from public.push_tokens where device_id=auth.uid())<>1 then raise exception 'Duplicate registration'; end if;
 perform public.register_push_token('rotated-registration-token-test','ios',true);
 if exists(select 1 from public.push_tokens where token='first-registration-token-for-test') then raise exception 'Old token retained'; end if;
 perform public.register_push_token(null,'ios',false);
 if exists(select 1 from public.push_tokens where device_id=auth.uid() and enabled) then raise exception 'Revoked permission still enabled'; end if;
 perform public.register_push_token('rotated-registration-token-test','ios',true);
 if not exists(select 1 from public.push_tokens where device_id=auth.uid() and enabled) then raise exception 'Permission reenable failed'; end if;
 begin
  perform public.register_push_token('bad','ios',true);raise exception 'Bad token accepted';
 exception when raise_exception then if sqlerrm<>'invalid_push_token' then raise; end if; end;
 perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
 perform public.register_push_token('second-device-registration-token','android',true);
 perform public.register_push_token(null,'android',false);
 if not exists(select 1 from public.push_tokens where device_id='11111111-1111-4111-8111-111111111111' and enabled) then raise exception 'Other device disabled'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 begin
  perform public.register_push_token('unsigned-registration-token-test','ios',true);raise exception 'Missing auth accepted';
 exception when raise_exception then if sqlerrm<>'not_signed_in' then raise; end if; end;
end $$;
rollback;
