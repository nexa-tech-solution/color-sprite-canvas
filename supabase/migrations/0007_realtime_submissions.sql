-- Live updates in /admin: new drawings show up without pressing refresh (Supabase Realtime).
-- Only adds the table to the realtime publication; no data is changed. Safe to run again.
-- Row security still applies: only admins (and each kid for their own row) receive changes.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
end $$;
