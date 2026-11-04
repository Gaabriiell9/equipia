-- =====================================================================
-- Équipia : stockage des justificatifs, tâche planifiée, privilèges
-- =====================================================================

-- Justificatifs (arrêts de travail, actes...) : bucket privé, chemin org/membre/fichier
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage')
     and exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('justificatifs', 'justificatifs', false, 10485760,
      array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
    on conflict (id) do nothing;

    execute $p$
      create policy "justificatifs : dépôt par le salarié, son manager ou les RH" on storage.objects
      for insert to authenticated with check (
        bucket_id = 'justificatifs'
        and (storage.foldername(name))[1]::uuid in (select app.my_org_ids())
        and app.can_see_member_private((storage.foldername(name))[2]::uuid)
      )
    $p$;
    execute $p$
      create policy "justificatifs : lecture par le salarié, son manager ou les RH" on storage.objects
      for select to authenticated using (
        bucket_id = 'justificatifs'
        and (storage.foldername(name))[1]::uuid in (select app.my_org_ids())
        and app.can_see_member_private((storage.foldername(name))[2]::uuid)
      )
    $p$;
  end if;
end $$;

-- Acquisition automatique des droits le 1er de chaque mois à 03h15 (UTC)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('equipia-accruals', '15 3 1 * *', 'select public.run_accruals_cron()');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Secrets applicatifs lus par la fonction Edge (coffre-fort Supabase Vault si disponible)
-- ---------------------------------------------------------------------
create table if not exists app.app_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table app.app_secrets enable row level security;

create or replace function public.get_app_secret(p_name text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v using p_name;
  end if;
  if v is null then
    select s.value into v from app.app_secrets s where s.name = p_name;
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------
-- Privilèges des fonctions : rien pour anon (sauf le flux iCal), RPC pour les connectés
-- ---------------------------------------------------------------------
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema app revoke execute on functions from public, anon;

revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema app from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
grant execute on all functions in schema app to authenticated, service_role;

revoke execute on function public.run_accruals_cron() from authenticated;
revoke execute on function public.get_app_secret(text) from authenticated;
grant execute on function public.ics_feed(uuid) to anon;
