-- Let admins delete a player from /admin → Players.
-- Removing the players row cascades to their submissions, point_ledger (stars) and purchases.
-- Drawings in Storage are removed by the admin page before calling this.
-- The device's anonymous auth user is kept: if that device opens the app again it simply starts over
-- as a new player with 0 stars. Safe to run again.

create or replace function public.admin_delete_player(p_device_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admin_only'; end if;
  delete from public.players where device_id = p_device_id;
  if not found then raise exception 'player_not_found'; end if;
end $$;

revoke execute on function public.admin_delete_player(uuid) from anon;
