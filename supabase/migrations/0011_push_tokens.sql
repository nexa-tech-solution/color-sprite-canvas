-- No artist name required: token ownership follows the WebView's anonymous auth identity.
create table if not exists public.push_tokens (
 token text primary key check (char_length(token) between 20 and 4096),
 device_id uuid not null references auth.users(id) on delete cascade,
 platform text not null check (platform in ('ios','android')),
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists push_tokens_device on public.push_tokens(device_id);
create index if not exists push_tokens_active on public.push_tokens(platform,updated_at) where enabled;
alter table public.push_tokens enable row level security;
-- Token lists are only available to trusted server-side send scripts, never other clients.
revoke all on public.push_tokens from public,anon,authenticated;
grant select,update,delete on public.push_tokens to service_role;

create or replace function public.register_push_token(p_token text, p_platform text, p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'not_signed_in'; end if;
 if p_enabled is null or p_platform is null or p_platform not in ('ios','android') then raise exception 'invalid_push_state'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if not p_enabled then
   update public.push_tokens set enabled=false,updated_at=now() where device_id=auth.uid();
   return;
 end if;
 if p_token is null or char_length(p_token) not between 20 and 4096 then raise exception 'invalid_push_token'; end if;
 -- Rotations replace the old token for this anonymous device instead of accumulating duplicates.
 delete from public.push_tokens where device_id=auth.uid() and token<>p_token;
 insert into public.push_tokens(token,device_id,platform,enabled)
 values(p_token,auth.uid(),p_platform,true)
 on conflict(token) do update set device_id=auth.uid(),platform=excluded.platform,enabled=true,updated_at=now();
end $$;
revoke all on function public.register_push_token(text,text,boolean) from public,anon;
grant execute on function public.register_push_token(text,text,boolean) to authenticated;
notify pgrst, 'reload schema';
