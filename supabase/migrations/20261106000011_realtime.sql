-- Actualisation en direct : les tables suivies sont publiées pour Supabase Realtime.
-- Les événements respectent les mêmes règles de lecture (RLS) que l'application.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['leave_requests', 'members', 'teams', 'leave_types', 'leave_ledger', 'notifications',
                             'holiday_work', 'member_contracts', 'organizations'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
