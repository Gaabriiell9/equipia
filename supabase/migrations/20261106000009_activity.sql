-- Secteur d'activité détaillé (le champ sector reste le drapeau de la convention HCR)
alter table public.organizations add column if not exists activity text
  check (activity in ('services', 'commerce', 'industrie', 'btp', 'transport', 'sante', 'associatif', 'hcr', 'autre'));

create or replace function public.set_org_activity(p_org uuid, p_activity text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor public.members;
begin
  v_actor := app.require_hr(p_org);
  update public.organizations set activity = p_activity where id = p_org;
end $$;

revoke all on function public.set_org_activity(uuid, text) from public, anon;
grant execute on function public.set_org_activity(uuid, text) to authenticated, service_role;
