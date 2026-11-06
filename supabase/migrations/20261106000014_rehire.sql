-- Retour d'un ancien salarié : inviter une adresse déjà connue mais désactivée réactive sa fiche
-- (historique, soldes et compte conservés) au lieu de refuser le doublon.
create or replace function public.invite_member(p_org uuid, p_email text, p_first_name text, p_last_name text,
  p_role text default 'employee', p_team uuid default null, p_manager uuid default null, p_job_title text default null,
  p_contract_type text default 'cdi', p_hire_date date default null, p_end_date date default null, p_employee_number text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; v_id uuid; v_email text := lower(trim(p_email)); v_existing boolean; v_old public.members;
begin
  v_actor := app.require_hr(p_org);
  perform app.check_role_change(v_actor, p_org, null, null, coalesce(p_role, 'employee'));
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform app.err('Adresse e-mail invalide.'); end if;
  select * into v_old from public.members where org_id = p_org and email = v_email;
  if v_old.id is not null and v_old.status <> 'disabled' then
    perform app.err('Un salarié utilise déjà cette adresse e-mail.');
  end if;
  if p_team is not null and not exists (select 1 from public.teams where id = p_team and org_id = p_org) then
    perform app.err('Équipe invalide.');
  end if;
  if p_manager is not null and not exists (select 1 from public.members where id = p_manager and org_id = p_org and status <> 'disabled') then
    perform app.err('Manager invalide.');
  end if;

  if v_old.id is not null then
    -- Réintégration : même fiche, nouvelles informations
    update public.members set first_name = trim(p_first_name), last_name = trim(p_last_name),
      role = coalesce(p_role, 'employee'), team_id = p_team, manager_id = p_manager,
      job_title = nullif(trim(p_job_title), ''),
      status = case when user_id is null then 'invited' else 'active' end,
      invited_at = now()
    where id = v_old.id;
    insert into public.member_contracts(member_id, org_id) values (v_old.id, p_org) on conflict (member_id) do nothing;
    update public.member_contracts set contract_type = coalesce(p_contract_type, 'cdi'),
      hire_date = coalesce(p_hire_date, hire_date), end_date = p_end_date,
      employee_number = coalesce(nullif(trim(p_employee_number), ''), employee_number), updated_at = now()
    where member_id = v_old.id;
    insert into app.calendar_tokens(member_id) values (v_old.id) on conflict do nothing;
    perform app.audit(p_org, v_actor.id, 'member.reactivated', 'member', v_old.id, jsonb_build_object('email', v_email, 'role', p_role));
    return jsonb_build_object('member_id', v_old.id, 'email', v_email, 'existing_user', v_old.user_id is not null,
      'reactivated', true, 'has_account', v_old.user_id is not null);
  end if;

  insert into public.members(org_id, email, first_name, last_name, role, team_id, manager_id, job_title, status, invited_at)
  values (p_org, v_email, trim(p_first_name), trim(p_last_name), coalesce(p_role, 'employee'), p_team, p_manager,
    nullif(trim(p_job_title), ''), 'invited', now())
  returning id into v_id;
  insert into public.member_contracts(member_id, org_id, contract_type, hire_date, end_date, employee_number)
  values (v_id, p_org, coalesce(p_contract_type, 'cdi'), p_hire_date, p_end_date, nullif(trim(p_employee_number), ''));
  insert into app.calendar_tokens(member_id) values (v_id);
  select exists (select 1 from auth.users where lower(email) = v_email) into v_existing;
  perform app.audit(p_org, v_actor.id, 'member.invited', 'member', v_id, jsonb_build_object('email', v_email, 'role', p_role));
  return jsonb_build_object('member_id', v_id, 'email', v_email, 'existing_user', v_existing, 'reactivated', false, 'has_account', false);
end $$;

revoke all on function public.invite_member(uuid, text, text, text, text, uuid, uuid, text, text, date, date, text) from public, anon;
grant execute on function public.invite_member(uuid, text, text, text, text, uuid, uuid, text, text, date, date, text) to authenticated, service_role;
