-- Fonctionnalités réservées à l'offre Pro (l'essai et le sur-mesure y donnent accès).
-- Contrôle côté base, en plus de l'interface, pour qu'un appel direct à l'API ne les active pas.

create or replace function app.org_is_pro(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select o.plan <> 'essentiel' from public.organizations o where o.id = p_org), false)
$$;

create or replace function app.enforce_plan_org()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.plan = 'essentiel' and (
       (new.hr_approval_required and not old.hr_approval_required)
    or (new.mfa_required and not old.mfa_required)
    or (new.allow_negative_balance and not old.allow_negative_balance)
    or (new.min_notice_days > 0 and new.min_notice_days <> old.min_notice_days)
    or (new.sector = 'hcr' and old.sector <> 'hcr')
  ) then
    perform app.err('Cette fonctionnalité est disponible avec l''offre Pro.', '42501');
  end if;
  return new;
end $$;

drop trigger if exists enforce_plan_org on public.organizations;
create trigger enforce_plan_org before update on public.organizations
  for each row execute function app.enforce_plan_org();

create or replace function app.enforce_plan_team()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.min_present > 0 and (tg_op = 'INSERT' or new.min_present <> old.min_present)
     and not app.org_is_pro(new.org_id) then
    perform app.err('L''effectif minimum par équipe est disponible avec l''offre Pro.', '42501');
  end if;
  return new;
end $$;

drop trigger if exists enforce_plan_team on public.teams;
create trigger enforce_plan_team before insert or update on public.teams
  for each row execute function app.enforce_plan_team();

-- Journal d'audit consultable en offre Pro (il reste enregistré dans tous les cas)
drop policy if exists "audit : RH et administrateurs" on public.audit_log;
create policy "audit : RH et administrateurs (Pro)" on public.audit_log
  for select to authenticated using (app.is_hr(org_id) and app.org_is_pro(org_id));

revoke all on function app.org_is_pro(uuid) from public, anon;
grant execute on function app.org_is_pro(uuid) to authenticated, service_role;
