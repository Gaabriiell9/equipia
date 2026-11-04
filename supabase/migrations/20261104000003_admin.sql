-- =====================================================================
-- Équipia : administration (entreprise, salariés, paramètres, exports, RGPD)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types d'absence par défaut
-- ---------------------------------------------------------------------
create or replace function app.seed_leave_types(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.organizations; v_hcr boolean;
begin
  select * into o from public.organizations where id = p_org;
  v_hcr := o.sector = 'hcr';
  insert into public.leave_types(org_id, code, name, color, category, counting, allow_half_days, deducts_balance,
    accrual_mode, accrual_amount, period_kind, min_seniority_months, carryover_max, requires_approval,
    requires_attachment, counts_as_absence, visible_to_colleagues, reasons, description, active, position)
  values
    (p_org, 'CP', 'Congés payés', '#2563eb', 'paid_leave', o.cp_counting, true, true,
      'monthly', case when o.cp_counting = 'ouvres' then 2.0833 else 2.5 end, 'cp', 0, 0, true,
      false, true, true, '[]', 'Acquis chaque mois (2,5 jours ouvrables ou 2,08 jours ouvrés).', true, 1),
    (p_org, 'RTT', 'RTT', '#7c3aed', 'rtt', 'ouvres', true, true,
      'monthly', 0, 'civil', 0, 0, true, false, true, true, '[]',
      'À activer si votre entreprise applique un accord RTT. Indiquez le nombre de jours acquis par mois.', false, 2),
    (p_org, 'FG', 'Fériés garantis (récupération)', '#ea580c', 'holiday_comp', 'ouvres', false, true,
      'annual', 6, 'civil', 12, 0, true, false, true, true, '[]',
      'Convention HCR : 6 jours fériés garantis par an après 1 an d''ancienneté. Le compteur baisse à chaque férié chômé ; le reste se récupère ou se paie.', v_hcr, 3),
    (p_org, 'REC', 'Récupération', '#0891b2', 'recovery', 'ouvres', true, true,
      'none', 0, 'civil', 0, null, true, false, true, true, '[]',
      'Repos compensateur (heures supplémentaires...). Le compteur est alimenté par les RH.', true, 4),
    (p_org, 'MAL', 'Arrêt maladie', '#dc2626', 'sick', 'calendaires', false, false,
      'none', 0, 'civil', 0, null, false, true, true, false, '[]',
      'Déclaration sans validation. Visible uniquement par le manager et les RH : les collègues voient « Absent ».', true, 5),
    (p_org, 'ATMP', 'Accident du travail / maladie pro.', '#9f1239', 'sick_pro', 'calendaires', false, false,
      'none', 0, 'civil', 0, null, false, true, true, false, '[]',
      'Arrêt d''origine professionnelle. Visible uniquement par le manager et les RH.', true, 6),
    (p_org, 'EVF', 'Événement familial', '#db2777', 'family', 'ouvrables', false, false,
      'none', 0, 'civil', 0, null, true, true, true, true,
      '[{"code":"mariage","label":"Mariage ou PACS du salarié","days":4},
        {"code":"mariage_enfant","label":"Mariage d''un enfant","days":1},
        {"code":"naissance","label":"Naissance ou adoption","days":3},
        {"code":"deces_enfant","label":"Décès d''un enfant","days":12},
        {"code":"deces_enfant_25","label":"Décès d''un enfant de moins de 25 ans","days":14},
        {"code":"deces_conjoint","label":"Décès du conjoint, partenaire de PACS ou concubin","days":3},
        {"code":"deces_parent","label":"Décès d''un parent, beau-parent, frère ou sœur","days":3},
        {"code":"annonce_enfant","label":"Annonce d''un handicap, d''une pathologie chronique ou d''un cancer chez un enfant","days":5}]',
      'Durées minimales du Code du travail (art. L3142-4) à vérifier : la loi du 12 juin 2026 en a allongé certaines et votre convention peut prévoir plus.', true, 7),
    (p_org, 'TT', 'Télétravail', '#059669', 'remote', 'ouvres', true, false,
      'none', 0, 'civil', 0, null, true, false, false, true, '[]',
      'Le salarié est compté comme présent dans le calcul de l''effectif minimum.', not v_hcr, 8),
    (p_org, 'CSS', 'Congé sans solde', '#64748b', 'unpaid', 'ouvres', true, false,
      'none', 0, 'civil', 0, null, true, false, true, true, '[]', 'N''ouvre pas de droits à congés payés.', true, 9),
    (p_org, 'AUT', 'Autre absence autorisée', '#a16207', 'other', 'ouvres', true, false,
      'none', 0, 'civil', 0, null, true, false, true, false, '[]',
      'Rendez-vous, formation, absence exceptionnelle... Le motif reste confidentiel pour les collègues.', true, 10)
  on conflict (org_id, code) do nothing;
end $$;

-- ---------------------------------------------------------------------
-- Création d'une entreprise (inscription)
-- ---------------------------------------------------------------------
create or replace function public.create_organization(p_name text, p_sector text, p_first_name text, p_last_name text,
  p_size text default null, p_region text default 'metropole', p_with_demo boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text; v_org uuid; v_member uuid;
begin
  if v_uid is null then perform app.err('Connexion requise.', '42501'); end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then perform app.err('Confirmez votre adresse e-mail avant de créer votre espace.'); end if;
  if (select count(*) from public.organizations where created_by = v_uid) >= 5 then
    perform app.err('Limite de 5 espaces atteinte pour ce compte.');
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then perform app.err('Indiquez le nom de votre entreprise.'); end if;

  insert into public.organizations(name, sector, holiday_region, employee_count_range, created_by, work_days)
  values (trim(p_name), coalesce(p_sector, 'general'), coalesce(p_region, 'metropole'), p_size, v_uid,
    case when p_sector = 'hcr' then '{1,2,3,4,5,6}'::smallint[] else '{1,2,3,4,5}'::smallint[] end)
  returning id into v_org;

  insert into public.members(org_id, user_id, email, first_name, last_name, role, status, joined_at, job_title)
  values (v_org, v_uid, v_email, trim(p_first_name), trim(p_last_name), 'admin', 'active', now(), 'Administrateur')
  returning id into v_member;
  insert into public.member_contracts(member_id, org_id) values (v_member, v_org);
  insert into app.calendar_tokens(member_id) values (v_member);

  if p_sector = 'hcr' then
    insert into public.teams(org_id, name, color, min_present) values
      (v_org, 'Cuisine', '#ea580c', 0), (v_org, 'Salle', '#2563eb', 0), (v_org, 'Réception', '#7c3aed', 0);
  end if;

  perform app.seed_leave_types(v_org);
  perform app.audit(v_org, v_member, 'organization.created', 'organization', v_org,
    jsonb_build_object('name', p_name, 'sector', p_sector));
  if p_with_demo then perform app.seed_demo_data(v_org, v_member); end if;
  return v_org;
end $$;

-- Rattache l'utilisateur connecté aux invitations reçues sur son e-mail vérifié
create or replace function public.claim_memberships()
returns int language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text; r record; v_n int := 0;
begin
  if v_uid is null then return 0; end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  for r in update public.members set user_id = v_uid, status = 'active', joined_at = coalesce(joined_at, now())
           where email = v_email and user_id is null and status = 'invited' and not is_demo
           returning id, org_id loop
    insert into app.calendar_tokens(member_id) values (r.id) on conflict do nothing;
    perform app.audit(r.org_id, r.id, 'member.joined', 'member', r.id, '{}'::jsonb);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ---------------------------------------------------------------------
-- Paramètres de l'entreprise
-- ---------------------------------------------------------------------
create or replace function public.update_org_settings(p_org uuid, p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; o public.organizations;
begin
  v_actor := app.require_hr(p_org);
  select * into o from public.organizations where id = p_org for update;
  if (p_data ? 'mfa_required' or p_data ? 'name' or p_data ? 'sector') and v_actor.role <> 'admin' then
    perform app.err('Seul un administrateur peut modifier ces paramètres.', '42501');
  end if;
  update public.organizations set
    name = case when p_data ? 'name' then trim(p_data->>'name') else name end,
    sector = coalesce(p_data->>'sector', sector),
    timezone = coalesce(p_data->>'timezone', timezone),
    holiday_region = coalesce(p_data->>'holiday_region', holiday_region),
    holidays_off = coalesce((p_data->>'holidays_off')::boolean, holidays_off),
    cp_counting = coalesce(p_data->>'cp_counting', cp_counting),
    cp_period_start_month = coalesce((p_data->>'cp_period_start_month')::smallint, cp_period_start_month),
    work_days = case when p_data ? 'work_days'
      then (select array_agg(distinct x::smallint order by x::smallint) from jsonb_array_elements_text(p_data->'work_days') x)
      else work_days end,
    allow_anticipation = coalesce((p_data->>'allow_anticipation')::boolean, allow_anticipation),
    allow_negative_balance = coalesce((p_data->>'allow_negative_balance')::boolean, allow_negative_balance),
    negative_balance_limit = coalesce((p_data->>'negative_balance_limit')::numeric, negative_balance_limit),
    hr_approval_required = coalesce((p_data->>'hr_approval_required')::boolean, hr_approval_required),
    min_notice_days = coalesce((p_data->>'min_notice_days')::smallint, min_notice_days),
    fractionnement_enabled = coalesce((p_data->>'fractionnement_enabled')::boolean, fractionnement_enabled),
    mfa_required = coalesce((p_data->>'mfa_required')::boolean, mfa_required)
  where id = p_org;

  -- Synchronise le type CP avec le mode de décompte choisi
  if p_data ? 'cp_counting' and p_data->>'cp_counting' <> o.cp_counting then
    update public.leave_types set counting = p_data->>'cp_counting',
      accrual_amount = case when accrual_amount in (2.5, 2.0833) then
        case when p_data->>'cp_counting' = 'ouvres' then 2.0833 else 2.5 end else accrual_amount end
    where org_id = p_org and category = 'paid_leave';
  end if;
  -- Active le compteur des fériés garantis si l'entreprise passe en HCR
  if p_data->>'sector' = 'hcr' then
    perform app.seed_leave_types(p_org);
    update public.leave_types set active = true where org_id = p_org and code = 'FG';
  end if;
  perform app.audit(p_org, v_actor.id, 'organization.settings_updated', 'organization', p_org, p_data);
end $$;

-- ---------------------------------------------------------------------
-- Équipes
-- ---------------------------------------------------------------------
create or replace function public.upsert_team(p_org uuid, p_id uuid, p_name text, p_color text default '#64748b', p_min_present int default 0)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; v_id uuid;
begin
  v_actor := app.require_hr(p_org);
  if char_length(trim(coalesce(p_name, ''))) = 0 then perform app.err('Indiquez un nom d''équipe.'); end if;
  if exists (select 1 from public.teams where org_id = p_org and lower(name) = lower(trim(p_name)) and (p_id is null or id <> p_id)) then
    perform app.err('Une équipe porte déjà ce nom.');
  end if;
  if p_id is null then
    insert into public.teams(org_id, name, color, min_present) values (p_org, trim(p_name), p_color, coalesce(p_min_present, 0))
    returning id into v_id;
  else
    update public.teams set name = trim(p_name), color = p_color, min_present = coalesce(p_min_present, 0)
    where id = p_id and org_id = p_org returning id into v_id;
    if v_id is null then perform app.err('Équipe introuvable.'); end if;
  end if;
  perform app.audit(p_org, v_actor.id, 'team.saved', 'team', v_id, jsonb_build_object('name', p_name, 'min_present', p_min_present));
  return v_id;
end $$;

create or replace function public.delete_team(p_team uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_org uuid; v_actor public.members;
begin
  select org_id into v_org from public.teams where id = p_team;
  if v_org is null then perform app.err('Équipe introuvable.'); end if;
  v_actor := app.require_hr(v_org);
  delete from public.teams where id = p_team;
  perform app.audit(v_org, v_actor.id, 'team.deleted', 'team', p_team, '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- Types d'absence
-- ---------------------------------------------------------------------
create or replace function public.upsert_leave_type(p_org uuid, p_id uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; v_id uuid;
begin
  v_actor := app.require_hr(p_org);
  if p_id is null then
    insert into public.leave_types(org_id, code, name, color, category, counting, allow_half_days, deducts_balance,
      accrual_mode, accrual_amount, period_kind, min_seniority_months, carryover_max, requires_approval,
      requires_attachment, counts_as_absence, visible_to_colleagues, description, active, position)
    values (p_org, upper(trim(p_data->>'code')), trim(p_data->>'name'), coalesce(p_data->>'color', '#2563eb'),
      coalesce(p_data->>'category', 'other'), coalesce(p_data->>'counting', 'ouvres'),
      coalesce((p_data->>'allow_half_days')::boolean, true), coalesce((p_data->>'deducts_balance')::boolean, false),
      coalesce(p_data->>'accrual_mode', 'none'), coalesce((p_data->>'accrual_amount')::numeric, 0),
      coalesce(p_data->>'period_kind', 'civil'), coalesce((p_data->>'min_seniority_months')::smallint, 0),
      (p_data->>'carryover_max')::numeric, coalesce((p_data->>'requires_approval')::boolean, true),
      coalesce((p_data->>'requires_attachment')::boolean, false), coalesce((p_data->>'counts_as_absence')::boolean, true),
      coalesce((p_data->>'visible_to_colleagues')::boolean, true), p_data->>'description', true,
      coalesce((select max(position) + 1 from public.leave_types where org_id = p_org), 1))
    returning id into v_id;
  else
    update public.leave_types set
      name = coalesce(trim(p_data->>'name'), name),
      color = coalesce(p_data->>'color', color),
      counting = coalesce(p_data->>'counting', counting),
      allow_half_days = coalesce((p_data->>'allow_half_days')::boolean, allow_half_days),
      deducts_balance = coalesce((p_data->>'deducts_balance')::boolean, deducts_balance),
      accrual_mode = coalesce(p_data->>'accrual_mode', accrual_mode),
      accrual_amount = coalesce((p_data->>'accrual_amount')::numeric, accrual_amount),
      period_kind = coalesce(p_data->>'period_kind', period_kind),
      min_seniority_months = coalesce((p_data->>'min_seniority_months')::smallint, min_seniority_months),
      carryover_max = case when p_data ? 'carryover_max' then (p_data->>'carryover_max')::numeric else carryover_max end,
      requires_approval = coalesce((p_data->>'requires_approval')::boolean, requires_approval),
      requires_attachment = coalesce((p_data->>'requires_attachment')::boolean, requires_attachment),
      counts_as_absence = coalesce((p_data->>'counts_as_absence')::boolean, counts_as_absence),
      visible_to_colleagues = coalesce((p_data->>'visible_to_colleagues')::boolean, visible_to_colleagues),
      description = case when p_data ? 'description' then p_data->>'description' else description end,
      active = coalesce((p_data->>'active')::boolean, active)
    where id = p_id and org_id = p_org returning id into v_id;
    if v_id is null then perform app.err('Type d''absence introuvable.'); end if;
  end if;
  perform app.audit(p_org, v_actor.id, 'leave_type.saved', 'leave_type', v_id, p_data);
  return v_id;
exception when unique_violation then
  perform app.err('Ce code est déjà utilisé par un autre type d''absence.');
  return null;
end $$;

-- ---------------------------------------------------------------------
-- Salariés
-- ---------------------------------------------------------------------
create or replace function app.check_role_change(v_actor public.members, p_org uuid, p_member uuid, p_old_role text, p_new_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_new_role not in ('employee', 'manager', 'hr', 'admin') then perform app.err('Rôle invalide.'); end if;
  if (p_new_role in ('hr', 'admin') or p_old_role in ('hr', 'admin')) and p_new_role is distinct from p_old_role
     and v_actor.role <> 'admin' then
    perform app.err('Seul un administrateur peut attribuer ou retirer les rôles RH et administrateur.', '42501');
  end if;
  if p_old_role = 'admin' and p_new_role <> 'admin' and not exists (
    select 1 from public.members where org_id = p_org and role = 'admin' and status = 'active' and id <> p_member) then
    perform app.err('Il doit rester au moins un administrateur actif.');
  end if;
end $$;

create or replace function public.invite_member(p_org uuid, p_email text, p_first_name text, p_last_name text,
  p_role text default 'employee', p_team uuid default null, p_manager uuid default null, p_job_title text default null,
  p_contract_type text default 'cdi', p_hire_date date default null, p_end_date date default null, p_employee_number text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; v_id uuid; v_email text := lower(trim(p_email)); v_existing boolean;
begin
  v_actor := app.require_hr(p_org);
  perform app.check_role_change(v_actor, p_org, null, null, coalesce(p_role, 'employee'));
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform app.err('Adresse e-mail invalide.'); end if;
  if exists (select 1 from public.members where org_id = p_org and email = v_email) then
    perform app.err('Un salarié utilise déjà cette adresse e-mail.');
  end if;
  if p_team is not null and not exists (select 1 from public.teams where id = p_team and org_id = p_org) then
    perform app.err('Équipe invalide.');
  end if;
  if p_manager is not null and not exists (select 1 from public.members where id = p_manager and org_id = p_org and status <> 'disabled') then
    perform app.err('Manager invalide.');
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
  return jsonb_build_object('member_id', v_id, 'email', v_email, 'existing_user', v_existing);
end $$;

-- Prépare (ou relance) l'envoi d'une invitation : renvoie les informations nécessaires à l'e-mail
create or replace function public.prepare_invitation(p_member uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_m public.members; v_actor public.members; v_org text; v_existing boolean;
begin
  select * into v_m from public.members where id = p_member;
  if v_m.id is null then perform app.err('Salarié introuvable.'); end if;
  v_actor := app.require_hr(v_m.org_id);
  if v_m.status <> 'invited' then perform app.err('Ce salarié a déjà rejoint l''espace ou est désactivé.'); end if;
  if v_m.is_demo then perform app.err('Les salariés de démonstration ne peuvent pas être invités.'); end if;
  update public.members set invited_at = now() where id = p_member;
  select name into v_org from public.organizations where id = v_m.org_id;
  select exists (select 1 from auth.users where lower(email) = v_m.email) into v_existing;
  perform app.audit(v_m.org_id, v_actor.id, 'member.invitation_sent', 'member', p_member, '{}'::jsonb);
  return jsonb_build_object('email', v_m.email, 'first_name', v_m.first_name, 'org_name', v_org,
    'inviter', v_actor.first_name || ' ' || v_actor.last_name, 'existing_user', v_existing);
end $$;

create or replace function public.update_member(p_member uuid, p_data jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_m public.members; v_actor public.members; v_mgr uuid; v_team uuid;
begin
  select * into v_m from public.members where id = p_member for update;
  if v_m.id is null then perform app.err('Salarié introuvable.'); end if;
  v_actor := app.require_hr(v_m.org_id);
  if p_data ? 'role' then perform app.check_role_change(v_actor, v_m.org_id, v_m.id, v_m.role, p_data->>'role'); end if;
  if p_data ? 'email' and lower(trim(p_data->>'email')) <> v_m.email then
    if v_m.user_id is not null then perform app.err('L''e-mail d''un compte déjà activé ne peut pas être modifié ici.'); end if;
    if exists (select 1 from public.members where org_id = v_m.org_id and email = lower(trim(p_data->>'email'))) then
      perform app.err('Un salarié utilise déjà cette adresse e-mail.');
    end if;
  end if;
  if p_data ? 'manager_id' then
    v_mgr := nullif(p_data->>'manager_id', '')::uuid;
    if v_mgr is not null then
      if v_mgr = v_m.id then perform app.err('Un salarié ne peut pas être son propre manager.'); end if;
      if not exists (select 1 from public.members where id = v_mgr and org_id = v_m.org_id) then perform app.err('Manager invalide.'); end if;
      if app.manages(v_m.id, v_mgr) then perform app.err('Ce choix créerait une boucle hiérarchique.'); end if;
    end if;
  end if;
  if p_data ? 'team_id' then
    v_team := nullif(p_data->>'team_id', '')::uuid;
    if v_team is not null and not exists (select 1 from public.teams where id = v_team and org_id = v_m.org_id) then
      perform app.err('Équipe invalide.');
    end if;
  end if;

  update public.members set
    first_name = coalesce(nullif(trim(p_data->>'first_name'), ''), first_name),
    last_name = coalesce(nullif(trim(p_data->>'last_name'), ''), last_name),
    email = case when p_data ? 'email' then lower(trim(p_data->>'email')) else email end,
    role = coalesce(p_data->>'role', role),
    team_id = case when p_data ? 'team_id' then v_team else team_id end,
    manager_id = case when p_data ? 'manager_id' then v_mgr else manager_id end,
    job_title = case when p_data ? 'job_title' then nullif(trim(p_data->>'job_title'), '') else job_title end,
    work_days = case when p_data ? 'work_days' then
      case when jsonb_typeof(p_data->'work_days') = 'array' and jsonb_array_length(p_data->'work_days') > 0
        then (select array_agg(distinct x::smallint order by x::smallint) from jsonb_array_elements_text(p_data->'work_days') x)
        else null end
      else work_days end
  where id = p_member;

  insert into public.member_contracts(member_id, org_id) values (p_member, v_m.org_id) on conflict (member_id) do nothing;
  update public.member_contracts set
    contract_type = coalesce(p_data->>'contract_type', contract_type),
    hire_date = case when p_data ? 'hire_date' then nullif(p_data->>'hire_date', '')::date else hire_date end,
    end_date = case when p_data ? 'end_date' then nullif(p_data->>'end_date', '')::date else end_date end,
    weekly_hours = case when p_data ? 'weekly_hours' then nullif(p_data->>'weekly_hours', '')::numeric else weekly_hours end,
    employee_number = case when p_data ? 'employee_number' then nullif(trim(p_data->>'employee_number'), '') else employee_number end,
    hr_notes = case when p_data ? 'hr_notes' then nullif(trim(p_data->>'hr_notes'), '') else hr_notes end,
    updated_at = now()
  where member_id = p_member;

  perform app.audit(v_m.org_id, v_actor.id, 'member.updated', 'member', p_member, p_data - 'hr_notes');
end $$;

create or replace function public.set_member_status(p_member uuid, p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_m public.members; v_actor public.members;
begin
  select * into v_m from public.members where id = p_member for update;
  if v_m.id is null then perform app.err('Salarié introuvable.'); end if;
  v_actor := app.require_hr(v_m.org_id);
  if not p_active then
    if v_m.id = v_actor.id then perform app.err('Vous ne pouvez pas désactiver votre propre compte.'); end if;
    if v_m.role = 'admin' and v_actor.role <> 'admin' then perform app.err('Seul un administrateur peut désactiver un administrateur.', '42501'); end if;
    if v_m.role = 'admin' and not exists (select 1 from public.members where org_id = v_m.org_id and role = 'admin'
       and status = 'active' and id <> v_m.id) then
      perform app.err('Il doit rester au moins un administrateur actif.');
    end if;
    update public.members set status = 'disabled' where id = p_member;
  else
    update public.members set status = case when user_id is null then 'invited' else 'active' end where id = p_member;
  end if;
  perform app.audit(v_m.org_id, v_actor.id, case when p_active then 'member.reactivated' else 'member.disabled' end,
    'member', p_member, '{}'::jsonb);
end $$;

-- Ajustement manuel d'un compteur (reprise de solde, correction, heures sup...)
create or replace function public.adjust_balance(p_org uuid, p_member uuid, p_leave_type uuid, p_amount numeric,
  p_period text default 'current', p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; t public.leave_types; o public.organizations; v_period date;
begin
  v_actor := app.require_hr(p_org);
  if not exists (select 1 from public.members where id = p_member and org_id = p_org) then perform app.err('Salarié introuvable.'); end if;
  select * into t from public.leave_types where id = p_leave_type and org_id = p_org;
  if t.id is null or not t.deducts_balance then perform app.err('Ce type d''absence n''a pas de compteur.'); end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 400 then perform app.err('Montant invalide.'); end if;
  if char_length(trim(coalesce(p_note, ''))) < 3 then perform app.err('Indiquez le motif de l''ajustement.'); end if;
  select * into o from public.organizations where id = p_org;
  v_period := app.period_start(t.period_kind, o.cp_period_start_month, app.org_today(p_org));
  if p_period = 'previous' then v_period := (v_period - interval '1 year')::date; end if;
  insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, created_by, note)
  values (p_org, p_member, t.id, v_period, round(p_amount, 4), 'adjustment', v_actor.id, trim(p_note));
  perform app.audit(p_org, v_actor.id, 'balance.adjusted', 'member', p_member,
    jsonb_build_object('type', t.code, 'amount', p_amount, 'period_start', v_period, 'note', p_note));
end $$;

-- ---------------------------------------------------------------------
-- Import CSV des salariés (avec reprise des soldes)
-- ---------------------------------------------------------------------
create or replace function public.import_members(p_org uuid, p_rows jsonb, p_dry_run boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.members; o public.organizations; r jsonb; i int := 0; v_errors jsonb := '[]'::jsonb;
  v_created int := 0; v_updated int := 0; v_email text; v_role text; v_team uuid; v_id uuid; v_mgr uuid;
  v_cur date; t record; v_amount numeric; v_period date; v_line_err text; v_new jsonb := '[]'::jsonb;
begin
  v_actor := app.require_hr(p_org);
  select * into o from public.organizations where id = p_org;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then perform app.err('Fichier vide.'); end if;
  if jsonb_array_length(p_rows) > 2000 then perform app.err('2 000 lignes maximum par import.'); end if;

  -- Validation
  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1; v_line_err := null;
    v_email := lower(trim(r->>'email'));
    v_role := coalesce(nullif(lower(trim(r->>'role')), ''), 'employee');
    if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_line_err := 'e-mail invalide';
    elsif coalesce(trim(r->>'first_name'), '') = '' or coalesce(trim(r->>'last_name'), '') = '' then v_line_err := 'prénom et nom obligatoires';
    elsif v_role not in ('employee', 'manager', 'hr', 'admin') then v_line_err := 'rôle inconnu (employee, manager, hr, admin)';
    elsif v_role in ('hr', 'admin') and v_actor.role <> 'admin' then v_line_err := 'seul un administrateur peut importer des RH ou administrateurs';
    elsif coalesce(r->>'contract_type', '') <> '' and r->>'contract_type' not in ('cdi', 'cdd', 'saisonnier', 'extra', 'apprentissage', 'stage', 'interim') then
      v_line_err := 'type de contrat inconnu';
    end if;
    if v_line_err is null then
      begin
        perform nullif(r->>'hire_date', '')::date, nullif(r->>'end_date', '')::date,
          nullif(r->>'cp_previous', '')::numeric, nullif(r->>'cp_current', '')::numeric,
          nullif(r->>'rtt', '')::numeric, nullif(r->>'rec', '')::numeric, nullif(r->>'fg', '')::numeric;
      exception when others then v_line_err := 'date (AAAA-MM-JJ) ou nombre invalide';
      end;
    end if;
    if v_line_err is null and (select count(*) from jsonb_array_elements(p_rows) x where lower(trim(x->>'email')) = v_email) > 1 then
      v_line_err := 'e-mail en double dans le fichier';
    end if;
    if v_line_err is not null then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('line', i + 1, 'email', r->>'email', 'message', v_line_err));
    end if;
  end loop;

  if p_dry_run or jsonb_array_length(v_errors) > 0 then
    return jsonb_build_object('dry_run', true, 'rows', jsonb_array_length(p_rows), 'errors', v_errors,
      'new', (select count(*) from jsonb_array_elements(p_rows) x
              where not exists (select 1 from public.members m where m.org_id = p_org and m.email = lower(trim(x->>'email'))))::int);
  end if;

  -- Passe 1 : salariés et équipes
  for r in select * from jsonb_array_elements(p_rows) loop
    v_email := lower(trim(r->>'email'));
    v_team := null;
    if coalesce(trim(r->>'team'), '') <> '' then
      select id into v_team from public.teams where org_id = p_org and lower(name) = lower(trim(r->>'team'));
      if v_team is null then
        insert into public.teams(org_id, name) values (p_org, trim(r->>'team')) returning id into v_team;
      end if;
    end if;
    select id into v_id from public.members where org_id = p_org and email = v_email;
    if v_id is null then
      insert into public.members(org_id, email, first_name, last_name, role, team_id, job_title, status)
      values (p_org, v_email, trim(r->>'first_name'), trim(r->>'last_name'),
        coalesce(nullif(lower(trim(r->>'role')), ''), 'employee'), v_team, nullif(trim(r->>'job_title'), ''), 'invited')
      returning id into v_id;
      insert into public.member_contracts(member_id, org_id) values (v_id, p_org);
      insert into app.calendar_tokens(member_id) values (v_id);
      v_created := v_created + 1;
      v_new := v_new || jsonb_build_array(v_id);
    else
      update public.members set first_name = trim(r->>'first_name'), last_name = trim(r->>'last_name'),
        team_id = coalesce(v_team, team_id), job_title = coalesce(nullif(trim(r->>'job_title'), ''), job_title),
        role = case when role = 'admin' then role else coalesce(nullif(lower(trim(r->>'role')), ''), role) end
      where id = v_id;
      insert into public.member_contracts(member_id, org_id) values (v_id, p_org) on conflict do nothing;
      v_updated := v_updated + 1;
    end if;
    update public.member_contracts set
      contract_type = coalesce(nullif(r->>'contract_type', ''), contract_type),
      hire_date = coalesce(nullif(r->>'hire_date', '')::date, hire_date),
      end_date = coalesce(nullif(r->>'end_date', '')::date, end_date),
      employee_number = coalesce(nullif(trim(r->>'employee_number'), ''), employee_number),
      updated_at = now()
    where member_id = v_id;

    -- Reprise des soldes (remplace une éventuelle reprise précédente sur la même période)
    for t in
      select lt.id, lt.period_kind, k.key as col
      from (values ('cp_previous', 'paid_leave'), ('cp_current', 'paid_leave'), ('rtt', 'rtt'), ('rec', 'recovery'), ('fg', 'holiday_comp')) k(key, cat)
      join lateral (select * from public.leave_types where org_id = p_org and category = k.cat order by position limit 1) lt on true
    loop
      v_amount := nullif(r->>t.col, '')::numeric;
      if v_amount is not null then
        v_cur := app.period_start(t.period_kind, o.cp_period_start_month, app.org_today(p_org));
        v_period := case when t.col = 'cp_previous' then (v_cur - interval '1 year')::date else v_cur end;
        delete from public.leave_ledger where member_id = v_id and leave_type_id = t.id and period_start = v_period and kind = 'opening';
        insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, created_by, note)
        values (p_org, v_id, t.id, v_period, v_amount, 'opening', v_actor.id, 'Reprise de solde (import)');
      end if;
    end loop;
  end loop;

  -- Passe 2 : managers
  for r in select * from jsonb_array_elements(p_rows) loop
    if coalesce(trim(r->>'manager_email'), '') <> '' then
      select id into v_id from public.members where org_id = p_org and email = lower(trim(r->>'email'));
      select id into v_mgr from public.members where org_id = p_org and email = lower(trim(r->>'manager_email'));
      if v_mgr is null then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('email', r->>'email', 'message', 'manager introuvable : ' || (r->>'manager_email')));
      elsif v_mgr = v_id or app.manages(v_id, v_mgr) then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('email', r->>'email', 'message', 'boucle hiérarchique ignorée'));
      else
        update public.members set manager_id = v_mgr where id = v_id;
        update public.members set role = 'manager' where id = v_mgr and role = 'employee';
      end if;
    end if;
  end loop;

  perform app.audit(p_org, v_actor.id, 'members.imported', 'organization', p_org,
    jsonb_build_object('created', v_created, 'updated', v_updated));
  return jsonb_build_object('dry_run', false, 'created', v_created, 'updated', v_updated, 'errors', v_errors, 'new_member_ids', v_new);
end $$;

-- ---------------------------------------------------------------------
-- Profil, notifications, flux iCal
-- ---------------------------------------------------------------------
create or replace function public.update_my_profile(p_org uuid, p_first_name text, p_last_name text, p_notify_email boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me public.members;
begin
  v_me := app.require_member(p_org);
  if char_length(trim(coalesce(p_first_name, ''))) = 0 or char_length(trim(coalesce(p_last_name, ''))) = 0 then
    perform app.err('Prénom et nom obligatoires.');
  end if;
  update public.members set first_name = trim(p_first_name), last_name = trim(p_last_name),
    notify_email = coalesce(p_notify_email, notify_email) where id = v_me.id;
end $$;

create or replace function public.mark_notifications_read(p_org uuid, p_ids uuid[] default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me public.members;
begin
  v_me := app.require_member(p_org);
  update public.notifications set read_at = now()
  where member_id = v_me.id and read_at is null and (p_ids is null or id = any(p_ids));
end $$;

create or replace function public.my_calendar_token(p_org uuid, p_rotate boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_me public.members; v_token uuid;
begin
  v_me := app.require_member(p_org);
  if p_rotate then
    delete from app.calendar_tokens where member_id = v_me.id;
  end if;
  insert into app.calendar_tokens(member_id) values (v_me.id) on conflict (member_id) do nothing;
  select token into v_token from app.calendar_tokens where member_id = v_me.id;
  return v_token;
end $$;

-- ---------------------------------------------------------------------
-- Tableaux de bord et exports
-- ---------------------------------------------------------------------
create or replace function public.hr_dashboard(p_org uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor public.members; o public.organizations; v_today date; v_head int; v_theory numeric; v_sick numeric;
  v_by_type jsonb; v_months jsonb; v_cp numeric; v_cp_type uuid;
begin
  v_actor := app.require_hr(p_org);
  if p_to < p_from or p_to - p_from > 400 then perform app.err('Période invalide.'); end if;
  select * into o from public.organizations where id = p_org;
  v_today := app.org_today(p_org);
  select count(*) into v_head from public.members m left join public.member_contracts c on c.member_id = m.id
  where m.org_id = p_org and m.status <> 'disabled' and (c.end_date is null or c.end_date >= v_today);

  select coalesce(jsonb_agg(jsonb_build_object('code', x.code, 'name', x.name, 'color', x.color, 'category', x.category, 'days', x.days)
    order by x.days desc), '[]'::jsonb) into v_by_type
  from (
    select lt.code, lt.name, lt.color, lt.category,
      round(sum(app.count_days_for(o, lt, greatest(r.start_date, p_from), case when r.start_date >= p_from then r.start_half else 'full' end,
        least(r.end_date, p_to), case when r.end_date <= p_to then r.end_half else 'full' end)), 1) as days
    from public.leave_requests r join public.leave_types lt on lt.id = r.leave_type_id
    where r.org_id = p_org and r.status = 'approved' and r.start_date <= p_to and r.end_date >= p_from
    group by lt.code, lt.name, lt.color, lt.category
  ) x;

  v_theory := v_head * app.count_days(p_from, 'full', least(p_to, v_today), 'full', 'ouvres', o.work_days, o.holiday_region, true);
  select coalesce(sum(app.count_days(greatest(r.start_date, p_from), 'full', least(r.end_date, p_to, v_today), 'full',
           'ouvres', o.work_days, o.holiday_region, true)), 0) into v_sick
  from public.leave_requests r join public.leave_types lt on lt.id = r.leave_type_id
  where r.org_id = p_org and r.status = 'approved' and lt.category in ('sick', 'sick_pro')
    and r.start_date <= least(p_to, v_today) and r.end_date >= p_from;

  select coalesce(jsonb_agg(jsonb_build_object('month', mo.m, 'days', coalesce(mo.days, 0)) order by mo.m), '[]'::jsonb) into v_months
  from (
    select g.m::date as m,
      (select round(sum(app.count_days_for(o, lt, greatest(r.start_date, g.m::date), case when r.start_date >= g.m::date then r.start_half else 'full' end,
          least(r.end_date, (g.m + interval '1 month - 1 day')::date), case when r.end_date <= (g.m + interval '1 month - 1 day')::date then r.end_half else 'full' end)), 1)
       from public.leave_requests r join public.leave_types lt on lt.id = r.leave_type_id
       where r.org_id = p_org and r.status = 'approved' and lt.counts_as_absence
         and r.start_date <= (g.m + interval '1 month - 1 day')::date and r.end_date >= g.m::date) as days
    from generate_series(date_trunc('month', v_today) - interval '5 months', date_trunc('month', v_today) + interval '1 month', interval '1 month') g(m)
  ) mo;

  select id into v_cp_type from public.leave_types where org_id = p_org and category = 'paid_leave' order by position limit 1;
  select coalesce(sum(l.amount), 0) into v_cp from public.leave_ledger l join public.members m on m.id = l.member_id
  where l.org_id = p_org and l.leave_type_id = v_cp_type and m.status <> 'disabled';

  return jsonb_build_object(
    'headcount', v_head,
    'pending', (select count(*) from public.leave_requests where org_id = p_org and status = 'pending'),
    'absent_today', (select count(distinct r.member_id) from public.leave_requests r join public.leave_types lt on lt.id = r.leave_type_id
      where r.org_id = p_org and r.status = 'approved' and lt.counts_as_absence and v_today between r.start_date and r.end_date),
    'remote_today', (select count(distinct r.member_id) from public.leave_requests r join public.leave_types lt on lt.id = r.leave_type_id
      where r.org_id = p_org and r.status = 'approved' and lt.category = 'remote' and v_today between r.start_date and r.end_date),
    'upcoming_14', (select count(*) from public.leave_requests r join public.leave_types lt on lt.id = r.leave_type_id
      where r.org_id = p_org and r.status = 'approved' and lt.counts_as_absence and r.start_date between v_today + 1 and v_today + 14),
    'absenteeism_rate', case when v_theory > 0 then round(100 * v_sick / v_theory, 2) else 0 end,
    'sick_days', v_sick,
    'by_type', v_by_type,
    'months', v_months,
    'cp_liability', round(v_cp, 1),
    'invited', (select count(*) from public.members where org_id = p_org and status = 'invited' and not is_demo)
  );
end $$;

create or replace function public.payroll_export(p_org uuid, p_from date, p_to date)
returns table (line_type text, employee_number text, last_name text, first_name text, email text, team text, code text,
  label text, category text, start_date date, start_half text, end_date date, end_half text, days_in_period numeric,
  total_days numeric, reason text, comment text)
language plpgsql stable security definer set search_path = '' as $$
declare v_actor public.members; o public.organizations;
begin
  v_actor := app.require_hr(p_org);
  if p_to < p_from or p_to - p_from > 370 then perform app.err('Période invalide (un an maximum).'); end if;
  select * into o from public.organizations where id = p_org;
  return query
    select 'absence'::text, c.employee_number, m.last_name, m.first_name, m.email, tm.name, lt.code, lt.name, lt.category,
      r.start_date, r.start_half, r.end_date, r.end_half,
      app.count_days_for(o, lt, greatest(r.start_date, p_from), case when r.start_date >= p_from then r.start_half else 'full' end,
        least(r.end_date, p_to), case when r.end_date <= p_to then r.end_half else 'full' end),
      r.days,
      (select e->>'label' from jsonb_array_elements(lt.reasons) e where e->>'code' = r.reason_code limit 1),
      r.comment
    from public.leave_requests r
    join public.members m on m.id = r.member_id
    join public.leave_types lt on lt.id = r.leave_type_id
    left join public.member_contracts c on c.member_id = m.id
    left join public.teams tm on tm.id = m.team_id
    where r.org_id = p_org and r.status = 'approved' and r.start_date <= p_to and r.end_date >= p_from
    union all
    select 'holiday_worked'::text, c.employee_number, m.last_name, m.first_name, m.email, tm.name, 'FERIE_TRAV'::text,
      'Férié travaillé : ' || h.name || case when extract(month from hw.day) = 5 and extract(day from hw.day) = 1
        then ' (rémunération doublée)' else '' end,
      'holiday_worked'::text, hw.day, 'full'::text, hw.day, 'full'::text, 1::numeric, 1::numeric, null::text, null::text
    from public.holiday_work hw
    join public.members m on m.id = hw.member_id
    join public.public_holidays h on h.region = o.holiday_region and h.day = hw.day
    left join public.member_contracts c on c.member_id = m.id
    left join public.teams tm on tm.id = m.team_id
    where hw.org_id = p_org and hw.status = 'worked' and hw.day between p_from and p_to
    order by 3, 4, 10;
end $$;

create or replace function public.balances_report(p_org uuid)
returns table (member_id uuid, first_name text, last_name text, team_id uuid, status text, leave_type_id uuid, code text,
  available numeric, pending numeric, previous_balance numeric, current_balance numeric, current_acquired numeric)
language plpgsql stable security definer set search_path = '' as $$
declare v_actor public.members; o public.organizations; v_today date;
begin
  v_actor := app.require_hr(p_org);
  select * into o from public.organizations where id = p_org;
  v_today := app.org_today(p_org);
  return query
    select m.id, m.first_name, m.last_name, m.team_id, m.status, lt.id, lt.code,
      round(app.available_balance(m.id, lt.id, v_today), 2),
      round(app.pending_days(m.id, lt.id, null), 2),
      round(coalesce((select sum(l.amount) from public.leave_ledger l where l.member_id = m.id and l.leave_type_id = lt.id
        and l.period_start < app.period_start(lt.period_kind, o.cp_period_start_month, v_today)), 0), 2),
      round(coalesce((select sum(l.amount) from public.leave_ledger l where l.member_id = m.id and l.leave_type_id = lt.id
        and l.period_start >= app.period_start(lt.period_kind, o.cp_period_start_month, v_today)), 0), 2),
      round(coalesce((select sum(l.amount) from public.leave_ledger l where l.member_id = m.id and l.leave_type_id = lt.id
        and l.period_start = app.period_start(lt.period_kind, o.cp_period_start_month, v_today)
        and l.kind in ('opening', 'accrual', 'fractionnement')), 0), 2)
    from public.members m
    cross join public.leave_types lt
    where m.org_id = p_org and lt.org_id = p_org and lt.deducts_balance and lt.active and m.status <> 'disabled'
    order by m.last_name, m.first_name, lt.position;
end $$;

-- ---------------------------------------------------------------------
-- RGPD : export de ses données, anonymisation, suppression de l'espace
-- ---------------------------------------------------------------------
create or replace function public.export_my_data(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_me public.members;
begin
  v_me := app.require_member(p_org);
  return jsonb_build_object(
    'exported_at', now(),
    'member', to_jsonb(v_me),
    'contract', (select to_jsonb(c) - 'hr_notes' from public.member_contracts c where c.member_id = v_me.id),
    'requests', (select coalesce(jsonb_agg(to_jsonb(r) order by r.start_date), '[]'::jsonb) from public.leave_requests r where r.member_id = v_me.id),
    'ledger', (select coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb) from public.leave_ledger l where l.member_id = v_me.id),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]'::jsonb) from public.notifications n where n.member_id = v_me.id)
  );
end $$;

create or replace function public.anonymize_member(p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_m public.members; v_actor public.members;
begin
  select * into v_m from public.members where id = p_member for update;
  if v_m.id is null then perform app.err('Salarié introuvable.'); end if;
  v_actor := app.require_member(v_m.org_id);
  if v_actor.role <> 'admin' then perform app.err('Action réservée aux administrateurs.', '42501'); end if;
  if v_m.id = v_actor.id then perform app.err('Vous ne pouvez pas anonymiser votre propre compte.'); end if;
  if v_m.status <> 'disabled' then perform app.err('Désactivez d''abord ce salarié.'); end if;
  update public.members set first_name = 'Ancien', last_name = 'salarié ' || left(v_m.id::text, 6),
    email = 'anonyme-' || v_m.id::text || '@anonyme.invalid', user_id = null, job_title = null, manager_id = null
  where id = p_member;
  update public.member_contracts set hr_notes = null, employee_number = null where member_id = p_member;
  update public.leave_requests set comment = null, attachment_path = null where member_id = p_member;
  delete from public.notifications where member_id = p_member;
  delete from app.calendar_tokens where member_id = p_member;
  perform app.audit(v_m.org_id, v_actor.id, 'member.anonymized', 'member', p_member, '{}'::jsonb);
end $$;

create or replace function public.delete_organization(p_org uuid, p_confirm_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; o public.organizations;
begin
  v_actor := app.require_member(p_org);
  if v_actor.role <> 'admin' then perform app.err('Action réservée aux administrateurs.', '42501'); end if;
  select * into o from public.organizations where id = p_org;
  if trim(coalesce(p_confirm_name, '')) <> o.name then perform app.err('Le nom saisi ne correspond pas.'); end if;
  delete from public.organizations where id = p_org;
end $$;

-- ---------------------------------------------------------------------
-- Données de démonstration (pour tester sans saisir son équipe)
-- ---------------------------------------------------------------------
create or replace function app.seed_demo_data(p_org uuid, p_admin uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.organizations; v_today date; v_cur date; v_months int; v_cp uuid; v_fg uuid; v_mal uuid; v_tt uuid; v_evf uuid;
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_ids uuid[] := '{}'; v_id uuid; v_req uuid; rec record; i int := 0;
  v_mgr1 uuid; v_mgr2 uuid; v_monday date;
begin
  select * into o from public.organizations where id = p_org;
  v_today := app.org_today(p_org);
  v_cur := app.period_start('cp', o.cp_period_start_month, v_today);
  v_months := ((extract(year from v_today) - extract(year from v_cur)) * 12 + extract(month from v_today) - extract(month from v_cur))::int;
  v_monday := v_today + (8 - extract(isodow from v_today)::int);

  if o.sector = 'hcr' then
    select id into v_t1 from public.teams where org_id = p_org and name = 'Cuisine';
    select id into v_t2 from public.teams where org_id = p_org and name = 'Salle';
    select id into v_t3 from public.teams where org_id = p_org and name = 'Réception';
    update public.teams set min_present = case name when 'Cuisine' then 2 when 'Salle' then 2 else 1 end where org_id = p_org;
  else
    insert into public.teams(org_id, name, color, min_present) values (p_org, 'Commercial', '#2563eb', 1) returning id into v_t1;
    insert into public.teams(org_id, name, color, min_present) values (p_org, 'Production', '#ea580c', 2) returning id into v_t2;
    insert into public.teams(org_id, name, color, min_present) values (p_org, 'Administration', '#7c3aed', 1) returning id into v_t3;
  end if;

  for rec in
    select * from (values
      (1, 'Karim', 'Benali', 'manager', 1, case when o.sector = 'hcr' then 'Chef de cuisine' else 'Responsable commercial' end, 'cdi', date '2018-03-12'),
      (2, 'Julie', 'Moreau', 'employee', 1, case when o.sector = 'hcr' then 'Sous-cheffe' else 'Commerciale' end, 'cdi', date '2021-09-01'),
      (3, 'Thomas', 'Petit', 'employee', 1, case when o.sector = 'hcr' then 'Commis de cuisine' else 'Chargé de clientèle' end, 'cdd', date '2025-04-14'),
      (4, 'Moussa', 'Diallo', 'employee', 1, case when o.sector = 'hcr' then 'Plongeur' else 'Commercial terrain' end, 'cdi', date '2023-01-09'),
      (5, 'Sophie', 'Laurent', 'manager', 2, case when o.sector = 'hcr' then 'Maîtresse d''hôtel' else 'Cheffe d''atelier' end, 'cdi', date '2016-06-01'),
      (6, 'Lucas', 'Girard', 'employee', 2, case when o.sector = 'hcr' then 'Serveur' else 'Technicien' end, 'cdi', date '2022-02-21'),
      (7, 'Emma', 'Roux', 'employee', 2, case when o.sector = 'hcr' then 'Serveuse' else 'Technicienne' end, 'saisonnier', date '2026-04-01'),
      (8, 'Hugo', 'Lefèvre', 'employee', 2, case when o.sector = 'hcr' then 'Barman' else 'Opérateur' end, 'cdi', date '2020-10-05'),
      (9, 'Chloé', 'Fontaine', 'employee', 3, case when o.sector = 'hcr' then 'Réceptionniste' else 'Assistante administrative' end, 'cdi', date '2019-11-18')
    ) as d(n, fn, ln, role, team, job, contract, hire)
  loop
    insert into public.members(org_id, email, first_name, last_name, role, team_id, job_title, status, is_demo)
    values (p_org, lower(app.unaccent_simple(rec.fn) || '.' || app.unaccent_simple(rec.ln)) || '.' || left(p_org::text, 6) || '@demo.equipia.invalid',
      rec.fn, rec.ln, rec.role, case rec.team when 1 then v_t1 when 2 then v_t2 else v_t3 end, rec.job, 'invited', true)
    returning id into v_id;
    insert into public.member_contracts(member_id, org_id, contract_type, hire_date, end_date, employee_number)
    values (v_id, p_org, rec.contract, rec.hire, case when rec.contract in ('cdd', 'saisonnier') then v_today + 120 end, 'D' || lpad(rec.n::text, 3, '0'));
    v_ids := v_ids || v_id;
  end loop;
  v_mgr1 := v_ids[1]; v_mgr2 := v_ids[5];
  update public.members set manager_id = v_mgr1 where id = any(v_ids[2:4]);
  update public.members set manager_id = v_mgr2 where id = any(v_ids[6:8]);
  update public.members set manager_id = p_admin where id in (v_mgr1, v_mgr2, v_ids[9]);

  select id into v_cp from public.leave_types where org_id = p_org and code = 'CP';
  select id into v_fg from public.leave_types where org_id = p_org and code = 'FG';
  select id into v_mal from public.leave_types where org_id = p_org and code = 'MAL';
  select id into v_tt from public.leave_types where org_id = p_org and code = 'TT';
  select id into v_evf from public.leave_types where org_id = p_org and code = 'EVF';

  -- Soldes de départ (période précédente + acquisition de la période en cours)
  foreach v_id in array (v_ids || p_admin) loop
    i := i + 1;
    insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, note) values
      (p_org, v_id, v_cp, (v_cur - interval '1 year')::date, (array[18, 24, 6, 12.5, 30, 9, 4, 21, 15, 20])[1 + (i - 1) % 10], 'opening', 'Reprise de solde (démo)'),
      (p_org, v_id, v_cp, v_cur, round(v_months * 2.5, 2), 'opening', 'Acquis depuis le début de la période (démo)');
    if o.sector = 'hcr' and v_fg is not null then
      insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, note)
      values (p_org, v_id, v_fg, make_date(extract(year from v_today)::int, 1, 1), 6, 'opening', 'Fériés garantis de l''année (démo)');
    end if;
  end loop;

  -- Absences validées, en attente et arrêt maladie
  for rec in
    select * from (values
      (2, v_cp, v_monday, v_monday + 4, 'approved'),
      (6, v_cp, v_monday + 7, v_monday + 11, 'approved'),
      (8, v_cp, v_monday + 2, v_monday + 4, 'approved'),
      (3, v_cp, v_monday + 7, v_monday + 9, 'pending'),
      (7, v_cp, v_monday + 14, v_monday + 18, 'pending'),
      (9, v_cp, v_monday + 21, v_monday + 25, 'pending'),
      (4, v_mal, v_today - 2, v_today + 3, 'approved'),
      (1, v_cp, v_today - 40, v_today - 33, 'approved')
    ) as d(n, t, s, e, st)
  loop
    if rec.t is null then continue; end if;
    insert into public.leave_requests(org_id, member_id, leave_type_id, start_date, end_date, days, status, step, created_by, decided_by, decided_at)
    select p_org, v_ids[rec.n], lt.id, rec.s, rec.e, app.count_days_for(o, lt, rec.s, 'full', rec.e, 'full'), rec.st,
      case when rec.st = 'pending' then 'hr' end, v_ids[rec.n],
      case when rec.st = 'approved' then p_admin end, case when rec.st = 'approved' then now() end
    from public.leave_types lt where lt.id = rec.t
    returning id into v_req;
    if rec.st = 'approved' then perform app.apply_request_debit(v_req, p_admin); end if;
  end loop;
  if v_tt is not null and o.sector <> 'hcr' then
    insert into public.leave_requests(org_id, member_id, leave_type_id, start_date, end_date, days, status, created_by, decided_by, decided_at)
    values (p_org, v_ids[2], v_tt, v_monday + 15, v_monday + 15, 1, 'approved', v_ids[2], v_mgr1, now());
  end if;

  update public.organizations set has_demo_data = true where id = p_org;
  perform app.audit(p_org, p_admin, 'demo.seeded', 'organization', p_org, '{}'::jsonb);
end $$;

create or replace function app.unaccent_simple(p text)
returns text language sql immutable set search_path = '' as $$
  select translate(p, 'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ''', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC')
$$;

create or replace function public.remove_demo_data(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor public.members;
begin
  v_actor := app.require_hr(p_org);
  delete from public.leave_requests where member_id in (select id from public.members where org_id = p_org and is_demo);
  delete from public.members where org_id = p_org and is_demo;
  delete from public.leave_ledger where org_id = p_org and member_id = v_actor.id and note like '%(démo)%';
  update public.organizations set has_demo_data = false where id = p_org;
  perform app.audit(p_org, v_actor.id, 'demo.removed', 'organization', p_org, '{}'::jsonb);
end $$;

create or replace function public.add_demo_data(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor public.members;
begin
  v_actor := app.require_hr(p_org);
  if (select has_demo_data from public.organizations where id = p_org) then perform app.err('Les données de démonstration sont déjà présentes.'); end if;
  perform app.seed_demo_data(p_org, v_actor.id);
end $$;
