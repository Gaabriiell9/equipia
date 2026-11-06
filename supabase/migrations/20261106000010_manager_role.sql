-- Seule une personne au rôle Manager (ou RH / administrateur) peut être le manager d'un salarié.

-- 1. Données existantes : un salarié désigné comme manager perd ce rattachement
update public.members m set manager_id = null
from public.members mg
where mg.id = m.manager_id and mg.role = 'employee';

-- 2. Contrôle à chaque ajout ou modification
create or replace function app.check_manager_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.manager_id is not null and (tg_op = 'INSERT' or new.manager_id is distinct from old.manager_id) then
    if (select role from public.members where id = new.manager_id) = 'employee' then
      perform app.err('Le manager choisi doit avoir le rôle Manager.');
    end if;
  end if;
  return new;
end $$;

drop trigger if exists check_manager_role on public.members;
create trigger check_manager_role before insert or update of manager_id on public.members
  for each row execute function app.check_manager_role();

-- 3. Un manager repassé salarié perd son équipe : ses demandes iront aux RH
create or replace function app.release_reports()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'employee' and old.role <> 'employee' then
    update public.members set manager_id = null where manager_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists release_reports on public.members;
create trigger release_reports after update of role on public.members
  for each row execute function app.release_reports();

-- 4. Import : le manager est promu avant le rattachement
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
        update public.members set role = 'manager' where id = v_mgr and role = 'employee';
        update public.members set manager_id = v_mgr where id = v_id;
      end if;
    end if;
  end loop;

  perform app.audit(p_org, v_actor.id, 'members.imported', 'organization', p_org,
    jsonb_build_object('created', v_created, 'updated', v_updated));
  return jsonb_build_object('dry_run', false, 'created', v_created, 'updated', v_updated, 'errors', v_errors, 'new_member_ids', v_new);
end $$;
