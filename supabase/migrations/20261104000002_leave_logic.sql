-- =====================================================================
-- Équipia : moteur de congés (décompte, soldes, workflow, acquisitions)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------
create or replace function app.fmt_date(d date)
returns text language sql immutable set search_path = '' as $$
  select to_char(d, 'DD/MM/YYYY')
$$;

create or replace function app.fmt_num(n numeric)
returns text language sql immutable set search_path = '' as $$
  select replace(rtrim(rtrim(to_char(round(coalesce(n, 0), 2), 'FM9999990.00'), '0'), '.'), '.', ',')
$$;

create or replace function app.jarr_add(arr jsonb, x jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select case when x is null then coalesce(arr, '[]'::jsonb) else coalesce(arr, '[]'::jsonb) || jsonb_build_array(x) end
$$;

create or replace function app.err(p_message text, p_code text default 'P0001')
returns void language plpgsql set search_path = '' as $$
begin
  raise exception '%', p_message using errcode = p_code;
end $$;

create or replace function app.audit(p_org uuid, p_actor uuid, p_action text, p_entity text, p_entity_id uuid, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log(org_id, actor_member_id, actor_user_id, action, entity, entity_id, details)
  values (p_org, p_actor, (select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- Crée une notification in-app et renvoie la charge utile de l'e-mail (ou null)
create or replace function app.notify(p_org uuid, p_member uuid, p_kind text, p_title text, p_body text, p_link text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_m public.members;
begin
  select * into v_m from public.members where id = p_member and org_id = p_org;
  if v_m.id is null or v_m.status = 'disabled' then return null; end if;
  insert into public.notifications(org_id, member_id, kind, title, body, link)
  values (p_org, p_member, p_kind, p_title, p_body, p_link);
  if v_m.notify_email and v_m.status = 'active' and not v_m.is_demo then
    return jsonb_build_object('email', v_m.email, 'first_name', v_m.first_name, 'kind', p_kind,
      'title', p_title, 'body', p_body, 'link', p_link);
  end if;
  return null;
end $$;

create or replace function app.require_member(p_org uuid)
returns public.members language plpgsql stable security definer set search_path = '' as $$
declare v public.members;
begin
  select * into v from public.members
  where org_id = p_org and user_id = (select auth.uid()) and status <> 'disabled';
  if v.id is null then
    perform app.err('Accès refusé : vous ne faites pas partie de cette entreprise.', '42501');
  end if;
  return v;
end $$;

create or replace function app.require_hr(p_org uuid)
returns public.members language plpgsql stable security definer set search_path = '' as $$
declare v public.members;
begin
  v := app.require_member(p_org);
  if v.role not in ('hr', 'admin') then
    perform app.err('Action réservée aux RH et aux administrateurs.', '42501');
  end if;
  return v;
end $$;

create or replace function app.org_today(p_org uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone o.timezone)::date from public.organizations o where o.id = p_org
$$;

-- Le membre p_viewer peut-il voir les données personnelles de p_member ?
create or replace function app.can_see_private_as(p_viewer uuid, p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members target
    join public.members me on me.id = p_viewer and me.org_id = target.org_id and me.status <> 'disabled'
    where target.id = p_member
      and (me.id = target.id or me.role in ('hr', 'admin') or app.manages(me.id, target.id))
  )
$$;

-- ---------------------------------------------------------------------
-- Périodes de référence
-- ---------------------------------------------------------------------
create or replace function app.period_start(p_kind text, p_start_month smallint, p_date date)
returns date language sql immutable set search_path = '' as $$
  select case
    when p_kind = 'civil' or p_start_month = 1 then make_date(extract(year from p_date)::int, 1, 1)
    when extract(month from p_date)::int >= p_start_month then make_date(extract(year from p_date)::int, p_start_month, 1)
    else make_date(extract(year from p_date)::int - 1, p_start_month, 1)
  end
$$;

-- Dernière période dont les jours peuvent être pris pour une absence débutant à p_on
create or replace function app.max_takeable_period(t public.leave_types, o public.organizations, p_on date)
returns date language sql stable set search_path = '' as $$
  select case
    when t.period_kind = 'cp' and t.category = 'paid_leave' and not o.allow_anticipation
      then (app.period_start(t.period_kind, o.cp_period_start_month, p_on) - interval '1 year')::date
    else app.period_start(t.period_kind, o.cp_period_start_month, p_on)
  end
$$;

-- ---------------------------------------------------------------------
-- Décompte des jours (ouvrables, ouvrés, calendaires, demi-journées, fériés)
-- ---------------------------------------------------------------------
create or replace function app.is_counted_day(p_day date, p_counting text, p_work_days smallint[], p_region text, p_holidays_off boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select case p_counting
      when 'calendaires' then true
      when 'ouvrables' then extract(isodow from p_day) between 1 and 6
      else extract(isodow from p_day)::smallint = any(p_work_days)
    end
    and (
      p_counting = 'calendaires' or not p_holidays_off
      or not exists (select 1 from public.public_holidays h where h.region = p_region and h.day = p_day)
    )
$$;

create or replace function app.count_days(p_start date, p_start_half text, p_end date, p_end_half text,
  p_counting text, p_work_days smallint[], p_region text, p_holidays_off boolean)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare v_total numeric := 0;
begin
  if p_start is null or p_end is null or p_end < p_start then return 0; end if;
  select count(*) into v_total
  from generate_series(p_start, p_end, interval '1 day') g(d)
  where app.is_counted_day(g.d::date, p_counting, p_work_days, p_region, p_holidays_off);
  if p_start_half = 'pm' and app.is_counted_day(p_start, p_counting, p_work_days, p_region, p_holidays_off) then
    v_total := v_total - 0.5;
  end if;
  if p_end_half = 'am' and app.is_counted_day(p_end, p_counting, p_work_days, p_region, p_holidays_off) then
    v_total := v_total - 0.5;
  end if;
  return greatest(v_total, 0);
end $$;

-- Décompte pour un type et une entreprise donnés
create or replace function app.count_days_for(o public.organizations, t public.leave_types,
  p_start date, p_start_half text, p_end date, p_end_half text)
returns numeric language sql stable security definer set search_path = '' as $$
  select app.count_days(p_start, p_start_half, p_end, p_end_half, t.counting, o.work_days, o.holiday_region, o.holidays_off)
$$;

-- Demi-journées en entiers pour détecter les chevauchements
create or replace function app.slot_start(d date, half text)
returns int language sql immutable set search_path = '' as $$
  select (d - date '2000-01-01') * 2 + case when half = 'pm' then 1 else 0 end
$$;
create or replace function app.slot_end(d date, half text)
returns int language sql immutable set search_path = '' as $$
  select (d - date '2000-01-01') * 2 + case when half = 'am' then 0 else 1 end
$$;

-- ---------------------------------------------------------------------
-- Soldes
-- ---------------------------------------------------------------------
create or replace function app.available_balance(p_member uuid, p_type uuid, p_on date)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare t public.leave_types; o public.organizations; v_max date; v numeric;
begin
  select * into t from public.leave_types where id = p_type;
  select * into o from public.organizations where id = t.org_id;
  v_max := app.max_takeable_period(t, o, p_on);
  select coalesce(sum(l.amount), 0) into v from public.leave_ledger l
  where l.member_id = p_member and l.leave_type_id = p_type and l.period_start <= v_max;
  return round(v, 4);
end $$;

create or replace function app.pending_days(p_member uuid, p_type uuid, p_exclude uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(r.days), 0) from public.leave_requests r
  where r.member_id = p_member and r.leave_type_id = p_type and r.status = 'pending'
    and (p_exclude is null or r.id <> p_exclude)
$$;

-- Débite le compteur à la validation, en consommant d'abord les périodes les plus anciennes
create or replace function app.apply_request_debit(p_request uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.leave_requests; t public.leave_types; o public.organizations;
  v_max date; v_remaining numeric; p record; v_take numeric;
begin
  select * into r from public.leave_requests where id = p_request;
  select * into t from public.leave_types where id = r.leave_type_id;
  if not t.deducts_balance or r.days <= 0 then return; end if;
  select * into o from public.organizations where id = r.org_id;
  v_max := app.max_takeable_period(t, o, r.start_date);
  v_remaining := r.days;
  for p in
    select l.period_start, sum(l.amount) as bal from public.leave_ledger l
    where l.member_id = r.member_id and l.leave_type_id = t.id and l.period_start <= v_max
    group by l.period_start having sum(l.amount) > 0
    order by l.period_start
  loop
    exit when v_remaining <= 0;
    v_take := least(v_remaining, p.bal);
    insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, request_id, created_by)
    values (r.org_id, r.member_id, t.id, p.period_start, -v_take, 'request', r.id, p_actor);
    v_remaining := v_remaining - v_take;
  end loop;
  if v_remaining > 0 then
    insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, request_id, created_by)
    values (r.org_id, r.member_id, t.id, v_max, -v_remaining, 'request', r.id, p_actor);
  end if;
end $$;

-- Recrédite les jours d'une absence annulée, période par période
create or replace function app.reverse_request_debit(p_request uuid, p_actor uuid)
returns void language sql security definer set search_path = '' as $$
  insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, request_id, created_by, note)
  select l.org_id, l.member_id, l.leave_type_id, l.period_start, -sum(l.amount), 'request_cancel', l.request_id, p_actor,
    'Annulation de l''absence'
  from public.leave_ledger l
  where l.request_id = p_request and l.kind in ('request', 'request_cancel')
  group by l.org_id, l.member_id, l.leave_type_id, l.period_start, l.request_id
  having sum(l.amount) <> 0;
$$;

-- ---------------------------------------------------------------------
-- Évaluation d'une demande (utilisée pour l'aperçu en direct ET la soumission)
-- ---------------------------------------------------------------------
create or replace function app.evaluate_request(o public.organizations, v_actor public.members, v_target public.members,
  t public.leave_types, p_start date, p_start_half text, p_end date, p_end_half text, p_exclude uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_errors jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb; v_conflicts jsonb := '[]'::jsonb; v_holidays jsonb := '[]'::jsonb;
  v_days numeric := 0; v_available numeric; v_pending numeric; v_after numeric; v_floor numeric;
  v_today date := app.org_today(o.id);
  v_is_self boolean := v_actor.id = v_target.id;
  v_is_hr boolean := v_actor.role in ('hr', 'admin');
  v_c public.member_contracts; v_team public.teams; v_overlap record;
begin
  -- Cohérence des dates
  if p_start is null or p_end is null then
    return jsonb_build_object('days', 0, 'errors', jsonb_build_array('Indiquez une date de début et une date de fin.'),
      'warnings', '[]'::jsonb, 'conflicts', '[]'::jsonb, 'holidays', '[]'::jsonb, 'deducts', t.deducts_balance);
  end if;
  if p_end < p_start then
    v_errors := app.jarr_add(v_errors, to_jsonb('La date de fin doit être postérieure ou égale à la date de début.'::text));
  end if;
  if p_start_half not in ('full', 'pm') or p_end_half not in ('full', 'am') then
    v_errors := app.jarr_add(v_errors, to_jsonb('Demi-journée invalide.'::text));
  end if;
  if not t.allow_half_days and (p_start_half <> 'full' or p_end_half <> 'full') then
    v_errors := app.jarr_add(v_errors, to_jsonb('Ce type d''absence ne se pose pas à la demi-journée.'::text));
  end if;
  if p_start = p_end and p_start_half = 'pm' and p_end_half = 'am' then
    v_errors := app.jarr_add(v_errors, to_jsonb('Sur une seule journée, choisissez le matin OU l''après-midi.'::text));
  end if;
  if p_end - p_start > 366 then
    v_errors := app.jarr_add(v_errors, to_jsonb('Une absence ne peut pas dépasser un an : découpez-la en plusieurs demandes.'::text));
  end if;
  if not t.active then
    v_errors := app.jarr_add(v_errors, to_jsonb('Ce type d''absence n''est plus disponible.'::text));
  end if;
  if jsonb_array_length(v_errors) > 0 then
    return jsonb_build_object('days', 0, 'errors', v_errors, 'warnings', v_warnings, 'conflicts', v_conflicts,
      'holidays', v_holidays, 'deducts', t.deducts_balance);
  end if;

  -- Règles du libre-service salarié
  if v_is_self and not v_is_hr then
    if t.category in ('paid_leave', 'rtt', 'unpaid', 'recovery', 'holiday_comp', 'remote', 'other') and p_start < v_today then
      v_errors := app.jarr_add(v_errors, to_jsonb('Impossible de poser cette absence dans le passé. Contactez votre responsable ou les RH.'::text));
    end if;
    if o.min_notice_days > 0 and t.category in ('paid_leave', 'rtt', 'recovery', 'holiday_comp')
       and p_start < v_today + o.min_notice_days then
      v_errors := app.jarr_add(v_errors, to_jsonb(format(
        'Délai de prévenance : ces congés doivent être posés au moins %s jours à l''avance.', o.min_notice_days)));
    end if;
  end if;

  -- Contrat
  select * into v_c from public.member_contracts where member_id = v_target.id;
  if v_c.end_date is not null and p_start > v_c.end_date then
    v_errors := app.jarr_add(v_errors, to_jsonb(format('La période commence après la fin du contrat (%s).', app.fmt_date(v_c.end_date))));
  end if;
  if v_c.hire_date is not null and p_end < v_c.hire_date then
    v_errors := app.jarr_add(v_errors, to_jsonb(format('La période se termine avant la date d''embauche (%s).', app.fmt_date(v_c.hire_date))));
  end if;

  -- Nombre de jours décomptés
  v_days := app.count_days_for(o, t, p_start, p_start_half, p_end, p_end_half);
  if v_days <= 0 then
    v_errors := app.jarr_add(v_errors, to_jsonb('Aucun jour n''est décompté sur cette période (repos, week-end ou jour férié).'::text));
  end if;

  -- Chevauchement avec une autre absence
  select r.start_date, r.end_date, lt.name into v_overlap
  from public.leave_requests r join public.leave_types lt on lt.id = r.leave_type_id
  where r.member_id = v_target.id and r.status in ('pending', 'approved')
    and (p_exclude is null or r.id <> p_exclude)
    and app.slot_start(r.start_date, r.start_half) <= app.slot_end(p_end, p_end_half)
    and app.slot_start(p_start, p_start_half) <= app.slot_end(r.end_date, r.end_half)
  limit 1;
  if found then
    v_errors := app.jarr_add(v_errors, to_jsonb(format('Une autre absence existe déjà sur cette période (%s du %s au %s).',
      lower(v_overlap.name), app.fmt_date(v_overlap.start_date), app.fmt_date(v_overlap.end_date))));
  end if;

  -- Solde
  if t.deducts_balance then
    v_available := app.available_balance(v_target.id, t.id, p_start);
    v_pending := app.pending_days(v_target.id, t.id, p_exclude);
    v_after := v_available - v_pending - v_days;
    v_floor := case when o.allow_negative_balance then -o.negative_balance_limit else 0 end;
    if v_after < v_floor then
      if v_is_hr and not v_is_self then
        v_warnings := app.jarr_add(v_warnings, to_jsonb(format(
          'Solde insuffisant (%s jour(s) disponible(s)) : le compteur passera en négatif.', app.fmt_num(v_available - v_pending))));
      else
        v_errors := app.jarr_add(v_errors, to_jsonb(format(
          'Solde insuffisant : %s jour(s) disponible(s) pour %s jour(s) demandé(s).',
          app.fmt_num(v_available - v_pending), app.fmt_num(v_days))));
      end if;
    end if;
  end if;

  -- Justificatif
  if t.requires_attachment then
    v_warnings := app.jarr_add(v_warnings, to_jsonb('Un justificatif est demandé pour ce type d''absence.'::text));
  end if;

  -- Jours fériés inclus (information)
  select coalesce(jsonb_agg(jsonb_build_object('date', h.day, 'name', h.name) order by h.day), '[]'::jsonb) into v_holidays
  from public.public_holidays h where h.region = o.holiday_region and h.day between p_start and p_end;

  -- Effectif minimum de l'équipe
  if v_target.team_id is not null and t.counts_as_absence then
    select * into v_team from public.teams where id = v_target.team_id;
    if v_team.min_present > 0 then
      with days as (
        select g::date as d from generate_series(p_start, least(p_end, p_start + 92), interval '1 day') g
      ),
      work_days as (
        select d from days
        where extract(isodow from d)::smallint = any(coalesce(v_target.work_days, o.work_days))
          and (not o.holidays_off or not exists (select 1 from public.public_holidays h where h.region = o.holiday_region and h.day = days.d))
      ),
      mates as (
        select m.id, coalesce(m.work_days, o.work_days) as wd, c.hire_date, c.end_date
        from public.members m left join public.member_contracts c on c.member_id = m.id
        where m.team_id = v_team.id and m.status <> 'disabled' and m.id <> v_target.id
      ),
      presence as (
        select w.d, count(mt.id) filter (
          where extract(isodow from w.d)::smallint = any(mt.wd)
            and (mt.hire_date is null or mt.hire_date <= w.d) and (mt.end_date is null or mt.end_date >= w.d)
            and not exists (
              select 1 from public.leave_requests r join public.leave_types lt on lt.id = r.leave_type_id
              where r.member_id = mt.id and r.status in ('pending', 'approved') and lt.counts_as_absence
                and w.d between r.start_date and r.end_date and (p_exclude is null or r.id <> p_exclude)
            )
        ) as present
        from work_days w left join mates mt on true
        group by w.d
      )
      select coalesce(jsonb_agg(jsonb_build_object('date', p.d, 'present', p.present, 'min', v_team.min_present, 'team', v_team.name) order by p.d), '[]'::jsonb)
      into v_conflicts
      from presence p where p.present < v_team.min_present;
      if jsonb_array_length(v_conflicts) > 0 then
        v_warnings := app.jarr_add(v_warnings, to_jsonb(format(
          'Effectif minimum de l''équipe « %s » non respecté sur %s jour(s) (minimum %s présent(s)).',
          v_team.name, jsonb_array_length(v_conflicts), v_team.min_present)));
      end if;
    end if;
  end if;

  return jsonb_build_object('days', v_days, 'available', v_available, 'pending', v_pending, 'after', v_after,
    'errors', v_errors, 'warnings', v_warnings, 'conflicts', v_conflicts, 'holidays', v_holidays, 'deducts', t.deducts_balance);
end $$;

-- ---------------------------------------------------------------------
-- RPC : aperçu en direct d'une demande
-- ---------------------------------------------------------------------
create or replace function public.preview_leave_request(p_org uuid, p_leave_type uuid, p_start date, p_end date,
  p_start_half text default 'full', p_end_half text default 'full', p_member uuid default null, p_exclude uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor public.members; v_target public.members; t public.leave_types; o public.organizations;
begin
  v_actor := app.require_member(p_org);
  if p_member is null or p_member = v_actor.id then
    v_target := v_actor;
  else
    select * into v_target from public.members where id = p_member and org_id = p_org;
    if v_target.id is null or not (v_actor.role in ('hr', 'admin') or app.manages(v_actor.id, v_target.id)) then
      perform app.err('Accès refusé.', '42501');
    end if;
  end if;
  select * into t from public.leave_types where id = p_leave_type and org_id = p_org;
  if t.id is null then perform app.err('Type d''absence introuvable.'); end if;
  select * into o from public.organizations where id = p_org;
  return app.evaluate_request(o, v_actor, v_target, t, p_start, p_start_half, p_end, p_end_half, p_exclude);
end $$;

-- Informations pour le valideur sur une demande existante (soldes, conflits)
create or replace function public.request_insights(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.leave_requests; v_actor public.members; v_target public.members; t public.leave_types; o public.organizations;
begin
  select * into r from public.leave_requests where id = p_request;
  if r.id is null then perform app.err('Demande introuvable.'); end if;
  v_actor := app.require_member(r.org_id);
  if not app.can_see_private_as(v_actor.id, r.member_id) then perform app.err('Accès refusé.', '42501'); end if;
  select * into v_target from public.members where id = r.member_id;
  select * into t from public.leave_types where id = r.leave_type_id;
  select * into o from public.organizations where id = r.org_id;
  -- évaluée "comme les RH" pour ne pas bloquer sur les règles de libre-service
  v_actor.role := 'hr';
  return app.evaluate_request(o, v_actor, v_target, t, r.start_date, r.start_half, r.end_date, r.end_half, r.id);
end $$;

-- ---------------------------------------------------------------------
-- RPC : soumettre une demande
-- ---------------------------------------------------------------------
create or replace function public.submit_leave_request(p_org uuid, p_leave_type uuid, p_start date, p_end date,
  p_start_half text default 'full', p_end_half text default 'full', p_comment text default null,
  p_member uuid default null, p_reason_code text default null, p_attachment_path text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.members; v_target public.members; v_type public.leave_types; v_org public.organizations;
  v_mgr public.members; v_eval jsonb; v_id uuid; v_status text; v_step text; v_emails jsonb := '[]'::jsonb;
  v_is_hr boolean; v_is_mgr boolean; v_who text; v_what text; r record; v_days numeric;
begin
  v_actor := app.require_member(p_org);
  select * into v_org from public.organizations where id = p_org;
  if p_member is null or p_member = v_actor.id then
    v_target := v_actor;
  else
    select * into v_target from public.members where id = p_member and org_id = p_org;
    if v_target.id is null then perform app.err('Salarié introuvable.'); end if;
  end if;
  if v_target.status = 'disabled' then perform app.err('Ce salarié est désactivé.'); end if;
  v_is_hr := v_actor.role in ('hr', 'admin');
  v_is_mgr := app.manages(v_actor.id, v_target.id);
  if v_target.id <> v_actor.id and not v_is_hr and not v_is_mgr then
    perform app.err('Vous ne pouvez pas poser une absence pour ce salarié.', '42501');
  end if;

  select * into v_type from public.leave_types where id = p_leave_type and org_id = p_org;
  if v_type.id is null then perform app.err('Type d''absence introuvable.'); end if;
  if p_reason_code is not null and not exists (
    select 1 from jsonb_array_elements(v_type.reasons) e where e->>'code' = p_reason_code) then
    perform app.err('Motif invalide.');
  end if;
  if p_attachment_path is not null and p_attachment_path not like (p_org::text || '/' || v_target.id::text || '/%') then
    perform app.err('Justificatif invalide.');
  end if;

  v_eval := app.evaluate_request(v_org, v_actor, v_target, v_type, p_start, p_start_half, p_end, p_end_half, null);
  if jsonb_array_length(v_eval->'errors') > 0 then
    perform app.err(v_eval->'errors'->>0);
  end if;
  v_days := (v_eval->>'days')::numeric;

  -- Circuit de validation
  if not v_type.requires_approval then
    v_status := 'approved';
  elsif v_target.id <> v_actor.id and v_is_hr then
    v_status := 'approved';
  elsif v_target.id <> v_actor.id and v_is_mgr then
    if v_org.hr_approval_required then v_status := 'pending'; v_step := 'hr';
    else v_status := 'approved'; end if;
  else
    select * into v_mgr from public.members where id = v_target.manager_id and status = 'active';
    v_status := 'pending';
    v_step := case when v_mgr.id is not null then 'manager' else 'hr' end;
  end if;

  insert into public.leave_requests(org_id, member_id, leave_type_id, start_date, start_half, end_date, end_half, days,
    status, step, reason_code, comment, attachment_path, created_by, decided_by, decided_at, manager_approved_by, manager_approved_at)
  values (p_org, v_target.id, v_type.id, p_start, p_start_half, p_end, p_end_half, v_days,
    v_status, v_step, p_reason_code, nullif(trim(p_comment), ''), p_attachment_path, v_actor.id,
    case when v_status = 'approved' and v_target.id <> v_actor.id then v_actor.id end,
    case when v_status = 'approved' then now() end,
    case when v_step = 'hr' and v_is_mgr and v_target.id <> v_actor.id then v_actor.id end,
    case when v_step = 'hr' and v_is_mgr and v_target.id <> v_actor.id then now() end)
  returning id into v_id;

  if v_status = 'approved' then
    perform app.apply_request_debit(v_id, v_actor.id);
  end if;

  -- Notifications
  v_who := v_target.first_name || ' ' || v_target.last_name;
  v_what := format('%s (%s j) du %s au %s', v_type.name, app.fmt_num(v_days), app.fmt_date(p_start), app.fmt_date(p_end));
  if v_status = 'pending' and v_step = 'manager' then
    v_emails := app.jarr_add(v_emails, app.notify(p_org, v_mgr.id, 'request_to_approve',
      'Nouvelle demande à valider', format('%s demande : %s.', v_who, v_what), '/app/validations'));
  elsif v_status = 'pending' and v_step = 'hr' then
    for r in select m.id from public.members m
             where m.org_id = p_org and m.role in ('hr', 'admin') and m.status = 'active' and m.id <> v_target.id loop
      v_emails := app.jarr_add(v_emails, app.notify(p_org, r.id, 'request_to_approve',
        'Nouvelle demande à valider', format('%s demande : %s.', v_who, v_what), '/app/validations'));
    end loop;
  elsif v_status = 'approved' and v_target.id <> v_actor.id then
    v_emails := app.jarr_add(v_emails, app.notify(p_org, v_target.id, 'request_created_for_you',
      'Absence enregistrée', format('%s %s a enregistré pour vous : %s.', v_actor.first_name, v_actor.last_name, v_what), '/app/absences'));
  elsif v_status = 'approved' and not v_type.requires_approval then
    for r in select m.id from public.members m
             where m.org_id = p_org and m.status = 'active' and m.id <> v_target.id
               and (m.id = v_target.manager_id or m.role in ('hr', 'admin')) loop
      v_emails := app.jarr_add(v_emails, app.notify(p_org, r.id, 'absence_declared',
        'Absence déclarée', format('%s a déclaré : %s.', v_who, v_what), '/app/calendrier'));
    end loop;
  end if;

  perform app.audit(p_org, v_actor.id, 'leave_request.created', 'leave_request', v_id,
    jsonb_build_object('member_id', v_target.id, 'type', v_type.code, 'start', p_start, 'end', p_end, 'days', v_days, 'status', v_status));

  return jsonb_build_object('id', v_id, 'status', v_status, 'step', v_step, 'days', v_days,
    'warnings', v_eval->'warnings', 'emails', v_emails);
end $$;

-- ---------------------------------------------------------------------
-- RPC : valider ou refuser
-- ---------------------------------------------------------------------
create or replace function public.decide_leave_request(p_request uuid, p_approve boolean, p_comment text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_req public.leave_requests; v_actor public.members; v_target public.members; v_type public.leave_types;
  v_org public.organizations; v_is_hr boolean; v_is_mgr boolean; v_emails jsonb := '[]'::jsonb; v_status text;
  v_what text; v_floor numeric; v_after numeric; r record;
begin
  select * into v_req from public.leave_requests where id = p_request for update;
  if v_req.id is null then perform app.err('Demande introuvable.'); end if;
  v_actor := app.require_member(v_req.org_id);
  if v_req.status <> 'pending' then perform app.err('Cette demande a déjà été traitée.'); end if;
  select * into v_target from public.members where id = v_req.member_id;
  select * into v_type from public.leave_types where id = v_req.leave_type_id;
  select * into v_org from public.organizations where id = v_req.org_id;
  v_is_hr := v_actor.role in ('hr', 'admin');
  v_is_mgr := app.manages(v_actor.id, v_target.id);

  if v_actor.id = v_target.id then
    if not (v_actor.role = 'admin' and not exists (
      select 1 from public.members m where m.org_id = v_req.org_id and m.id <> v_actor.id
        and m.role in ('hr', 'admin') and m.status = 'active')) then
      perform app.err('Vous ne pouvez pas valider votre propre demande.', '42501');
    end if;
  elsif v_req.step = 'manager' and not (v_is_mgr or v_is_hr) then
    perform app.err('Cette demande doit être validée par le manager du salarié.', '42501');
  elsif v_req.step = 'hr' and not v_is_hr then
    perform app.err('Cette demande est en attente de validation par les RH.', '42501');
  end if;

  v_what := format('%s du %s au %s', v_type.name, app.fmt_date(v_req.start_date), app.fmt_date(v_req.end_date));

  if not p_approve then
    if coalesce(char_length(trim(p_comment)), 0) < 2 then
      perform app.err('Merci d''indiquer le motif du refus.');
    end if;
    update public.leave_requests set status = 'rejected', step = null, decided_by = v_actor.id, decided_at = now(),
      decision_comment = trim(p_comment), updated_at = now() where id = v_req.id;
    v_status := 'rejected';
    v_emails := app.jarr_add(v_emails, app.notify(v_req.org_id, v_target.id, 'request_rejected',
      'Demande refusée', format('Votre demande (%s) a été refusée : %s', v_what, trim(p_comment)), '/app/absences'));
  elsif v_req.step = 'manager' and v_org.hr_approval_required and not v_is_hr then
    update public.leave_requests set step = 'hr', manager_approved_by = v_actor.id, manager_approved_at = now(),
      decision_comment = nullif(trim(p_comment), ''), updated_at = now() where id = v_req.id;
    v_status := 'pending';
    for r in select m.id from public.members m
             where m.org_id = v_req.org_id and m.role in ('hr', 'admin') and m.status = 'active' and m.id <> v_target.id loop
      v_emails := app.jarr_add(v_emails, app.notify(v_req.org_id, r.id, 'request_to_approve',
        'Demande à valider (RH)', format('%s %s : %s, validée par le manager.', v_target.first_name, v_target.last_name, v_what), '/app/validations'));
    end loop;
    v_emails := app.jarr_add(v_emails, app.notify(v_req.org_id, v_target.id, 'request_manager_approved',
      'Validée par votre manager', format('Votre demande (%s) est validée par votre manager et attend la validation RH.', v_what), '/app/absences'));
  else
    if v_type.deducts_balance then
      v_after := app.available_balance(v_target.id, v_type.id, v_req.start_date)
        - app.pending_days(v_target.id, v_type.id, v_req.id) - v_req.days;
      v_floor := case when v_org.allow_negative_balance then -v_org.negative_balance_limit else 0 end;
      if v_after < v_floor and not v_is_hr then
        perform app.err(format('Solde insuffisant pour valider : il resterait %s jour(s).', app.fmt_num(v_after)));
      end if;
    end if;
    update public.leave_requests set status = 'approved', step = null, decided_by = v_actor.id, decided_at = now(),
      manager_approved_by = case when v_req.step = 'manager' then v_actor.id else manager_approved_by end,
      manager_approved_at = case when v_req.step = 'manager' then now() else manager_approved_at end,
      decision_comment = coalesce(nullif(trim(p_comment), ''), decision_comment), updated_at = now()
    where id = v_req.id;
    perform app.apply_request_debit(v_req.id, v_actor.id);
    v_status := 'approved';
    v_emails := app.jarr_add(v_emails, app.notify(v_req.org_id, v_target.id, 'request_approved',
      'Demande acceptée', format('Votre demande (%s) a été acceptée.%s', v_what,
        case when nullif(trim(p_comment), '') is not null then ' Commentaire : ' || trim(p_comment) else '' end), '/app/absences'));
  end if;

  perform app.audit(v_req.org_id, v_actor.id, case when p_approve then 'leave_request.approved' else 'leave_request.rejected' end,
    'leave_request', v_req.id, jsonb_build_object('member_id', v_target.id, 'step', v_req.step, 'result', v_status, 'comment', p_comment));
  return jsonb_build_object('id', v_req.id, 'status', v_status, 'emails', v_emails);
end $$;

-- ---------------------------------------------------------------------
-- RPC : annuler
-- ---------------------------------------------------------------------
create or replace function public.cancel_leave_request(p_request uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_req public.leave_requests; v_actor public.members; v_target public.members; v_type public.leave_types;
  v_is_hr boolean; v_is_self boolean; v_emails jsonb := '[]'::jsonb; v_what text; r record;
begin
  select * into v_req from public.leave_requests where id = p_request for update;
  if v_req.id is null then perform app.err('Demande introuvable.'); end if;
  v_actor := app.require_member(v_req.org_id);
  if v_req.status not in ('pending', 'approved') then perform app.err('Cette demande ne peut plus être annulée.'); end if;
  select * into v_target from public.members where id = v_req.member_id;
  select * into v_type from public.leave_types where id = v_req.leave_type_id;
  v_is_hr := v_actor.role in ('hr', 'admin');
  v_is_self := v_actor.id = v_target.id;

  if v_is_self and not v_is_hr then
    if v_req.status = 'approved' and v_req.start_date <= app.org_today(v_req.org_id) then
      perform app.err('Cette absence a déjà commencé : contactez votre responsable ou les RH pour la modifier.');
    end if;
  elsif not v_is_self and not v_is_hr and not app.manages(v_actor.id, v_target.id) then
    perform app.err('Accès refusé.', '42501');
  end if;

  update public.leave_requests set status = 'cancelled', step = null, cancelled_by = v_actor.id, cancelled_at = now(),
    decision_comment = coalesce(nullif(trim(p_reason), ''), decision_comment), updated_at = now()
  where id = v_req.id;
  if v_req.status = 'approved' then
    perform app.reverse_request_debit(v_req.id, v_actor.id);
  end if;

  v_what := format('%s du %s au %s', v_type.name, app.fmt_date(v_req.start_date), app.fmt_date(v_req.end_date));
  if v_is_self and v_req.status = 'approved' then
    for r in select m.id from public.members m
             where m.org_id = v_req.org_id and m.status = 'active' and m.id <> v_target.id
               and (m.id = v_target.manager_id or m.role in ('hr', 'admin')) loop
      v_emails := app.jarr_add(v_emails, app.notify(v_req.org_id, r.id, 'request_cancelled',
        'Absence annulée', format('%s %s a annulé : %s.', v_target.first_name, v_target.last_name, v_what), '/app/calendrier'));
    end loop;
  elsif not v_is_self then
    v_emails := app.jarr_add(v_emails, app.notify(v_req.org_id, v_target.id, 'request_cancelled',
      'Absence annulée', format('%s %s a annulé votre absence : %s.%s', v_actor.first_name, v_actor.last_name, v_what,
        case when nullif(trim(p_reason), '') is not null then ' Motif : ' || trim(p_reason) else '' end), '/app/absences'));
  end if;

  perform app.audit(v_req.org_id, v_actor.id, 'leave_request.cancelled', 'leave_request', v_req.id,
    jsonb_build_object('member_id', v_target.id, 'previous_status', v_req.status, 'reason', p_reason));
  return jsonb_build_object('id', v_req.id, 'status', 'cancelled', 'emails', v_emails);
end $$;

-- ---------------------------------------------------------------------
-- RPC : soldes d'un salarié (par type et par période)
-- ---------------------------------------------------------------------
create or replace function public.member_balances(p_org uuid, p_member uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_actor public.members; v_target uuid; o public.organizations; v_today date; v_result jsonb := '[]'::jsonb;
  t public.leave_types; v_cur date; v_periods jsonb; v_available numeric; v_pending numeric;
begin
  v_actor := app.require_member(p_org);
  v_target := coalesce(p_member, v_actor.id);
  if not app.can_see_private_as(v_actor.id, v_target) then perform app.err('Accès refusé.', '42501'); end if;
  select * into o from public.organizations where id = p_org;
  v_today := app.org_today(p_org);
  for t in select * from public.leave_types where org_id = p_org and deducts_balance and active order by position, name loop
    v_cur := app.period_start(t.period_kind, o.cp_period_start_month, v_today);
    select coalesce(jsonb_agg(x order by (x->>'period_start')::date desc), '[]'::jsonb) into v_periods
    from (
      select jsonb_build_object(
        'period_start', ps,
        'is_current', ps = v_cur,
        'acquired', round(coalesce(sum(l.amount) filter (where l.kind in ('opening', 'accrual', 'fractionnement')
            or (l.kind in ('adjustment', 'carryover') and l.amount > 0)), 0), 2),
        'taken', round(-coalesce(sum(l.amount) filter (where l.kind in ('request', 'request_cancel', 'holiday_off')), 0), 2),
        'other', round(coalesce(sum(l.amount) filter (where l.kind = 'expiry'
            or (l.kind in ('adjustment', 'carryover') and l.amount < 0)), 0), 2),
        'balance', round(coalesce(sum(l.amount), 0), 2)
      ) as x
      from (select v_cur as ps union select distinct period_start from public.leave_ledger
            where member_id = v_target and leave_type_id = t.id) periods
      left join public.leave_ledger l on l.member_id = v_target and l.leave_type_id = t.id and l.period_start = periods.ps
      group by ps
      having ps = v_cur or coalesce(sum(l.amount), 0) <> 0 or ps >= (v_cur - interval '1 year')::date
    ) s;
    v_available := app.available_balance(v_target, t.id, v_today);
    v_pending := app.pending_days(v_target, t.id, null);
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'leave_type_id', t.id, 'code', t.code, 'name', t.name, 'color', t.color, 'category', t.category,
      'counting', t.counting, 'period_kind', t.period_kind, 'available', round(v_available, 2),
      'pending', round(v_pending, 2), 'projected', round(v_available - v_pending, 2), 'periods', v_periods));
  end loop;
  return v_result;
end $$;

-- ---------------------------------------------------------------------
-- Calendrier d'équipe (avec masquage des absences sensibles)
-- ---------------------------------------------------------------------
create or replace function app.calendar_rows(p_org uuid, p_viewer uuid, p_from date, p_to date)
returns table (request_id uuid, member_id uuid, start_date date, start_half text, end_date date, end_half text,
  status text, leave_type_id uuid, label text, color text, masked boolean, counts_as_absence boolean, days numeric)
language sql stable security definer set search_path = '' as $$
  select r.id, r.member_id, r.start_date, r.start_half, r.end_date, r.end_half, r.status,
    case when v.priv or lt.visible_to_colleagues then lt.id end,
    case when v.priv or lt.visible_to_colleagues then lt.name else 'Absent' end,
    case when v.priv or lt.visible_to_colleagues then lt.color else '#94a3b8' end,
    not (v.priv or lt.visible_to_colleagues),
    lt.counts_as_absence,
    case when v.priv then r.days end
  from public.leave_requests r
  join public.leave_types lt on lt.id = r.leave_type_id
  cross join lateral (select app.can_see_private_as(p_viewer, r.member_id) as priv) v
  where r.org_id = p_org and r.status in ('approved', 'pending')
    and r.start_date <= p_to and r.end_date >= p_from
    and (r.status = 'approved' or v.priv)
$$;

create or replace function public.team_calendar(p_org uuid, p_from date, p_to date)
returns table (request_id uuid, member_id uuid, start_date date, start_half text, end_date date, end_half text,
  status text, leave_type_id uuid, label text, color text, masked boolean, counts_as_absence boolean, days numeric)
language plpgsql stable security definer set search_path = '' as $$
declare v_actor public.members;
begin
  v_actor := app.require_member(p_org);
  if p_to < p_from or p_to - p_from > 190 then perform app.err('Période d''affichage invalide.'); end if;
  return query select * from app.calendar_rows(p_org, v_actor.id, p_from, p_to);
end $$;

-- Flux iCal (Google Agenda, Outlook) : accès par jeton secret, sans session
create or replace function public.ics_feed(p_token uuid)
returns table (request_id uuid, member_name text, label text, start_date date, start_half text, end_date date,
  end_half text, status text, org_name text, updated_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare v_member public.members; v_today date;
begin
  select m.* into v_member from app.calendar_tokens ct join public.members m on m.id = ct.member_id
  where ct.token = p_token and m.status = 'active';
  if v_member.id is null then return; end if;
  v_today := app.org_today(v_member.org_id);
  return query
    select c.request_id, m.first_name || ' ' || m.last_name, c.label, c.start_date, c.start_half, c.end_date, c.end_half,
      c.status, o.name, r.updated_at
    from app.calendar_rows(v_member.org_id, v_member.id, v_today - 60, v_today + 365) c
    join public.members m on m.id = c.member_id
    join public.organizations o on o.id = m.org_id
    join public.leave_requests r on r.id = c.request_id
    where c.status = 'approved';
end $$;

-- ---------------------------------------------------------------------
-- Acquisition des droits (mensuelle / annuelle), maladie 2024 incluse
-- ---------------------------------------------------------------------
create or replace function app.absence_days_in(p_member uuid, p_category text, p_from date, p_to date)
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(sum(least(r.end_date, p_to) - greatest(r.start_date, p_from) + 1), 0)::int
  from public.leave_requests r join public.leave_types lt on lt.id = r.leave_type_id
  where r.member_id = p_member and r.status = 'approved' and lt.category = p_category
    and r.start_date <= p_to and r.end_date >= p_from
$$;

create or replace function app.compute_accruals(p_org uuid, p_month date)
returns int language plpgsql security definer set search_path = '' as $$
declare
  o public.organizations; t public.leave_types; m record;
  v_m1 date := date_trunc('month', p_month)::date;
  v_m2 date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  v_dim int; v_today date; v_period date; v_pend date; v_emp int; v_from date; v_sick int; v_sick_pro int; v_unpaid int;
  v_amount numeric; v_elig date; v_months int; v_count int := 0; v_note text;
begin
  select * into o from public.organizations where id = p_org;
  v_dim := v_m2 - v_m1 + 1;
  v_today := app.org_today(p_org);
  for t in select * from public.leave_types lt
           where lt.org_id = p_org and lt.active and lt.accrual_mode <> 'none' and lt.accrual_amount > 0 loop
    -- l'acquisition mensuelle n'est calculée que pour un mois terminé
    if t.accrual_mode = 'monthly' and v_m2 >= v_today then continue; end if;
    if t.accrual_mode = 'annual' and v_m1 > v_today then continue; end if;
    v_period := app.period_start(t.period_kind, o.cp_period_start_month, v_m1);
    v_pend := (v_period + interval '1 year - 1 day')::date;
    for m in
      select mb.id, c.hire_date, c.end_date from public.members mb
      left join public.member_contracts c on c.member_id = mb.id
      where mb.org_id = p_org and (mb.status <> 'disabled' or c.end_date is not null)
    loop
      v_elig := case when m.hire_date is null then null
                     else (m.hire_date + make_interval(months => t.min_seniority_months))::date end;
      if t.accrual_mode = 'monthly' then
        v_from := greatest(v_m1, coalesce(m.hire_date, v_m1));
        if t.min_seniority_months > 0 and v_elig is not null then v_from := greatest(v_from, v_elig); end if;
        v_emp := least(v_m2, coalesce(m.end_date, v_m2)) - v_from + 1;
        if v_emp <= 0 then continue; end if;
        v_sick := least(v_emp, app.absence_days_in(m.id, 'sick', v_from, v_m2));
        v_sick_pro := least(v_emp, app.absence_days_in(m.id, 'sick_pro', v_from, v_m2));
        v_unpaid := least(v_emp - v_sick, app.absence_days_in(m.id, 'unpaid', v_from, v_m2));
        if t.category = 'paid_leave' then
          -- Loi du 22/04/2024 : 2 jours ouvrables par mois d'arrêt non professionnel (soit 80 % du droit normal)
          v_amount := t.accrual_amount * ((v_emp - v_sick - v_unpaid) + 0.8 * v_sick)::numeric / v_dim;
        elsif t.category = 'rtt' then
          v_amount := t.accrual_amount * greatest(0, v_emp - v_sick - v_sick_pro - v_unpaid)::numeric / v_dim;
        else
          v_amount := t.accrual_amount * v_emp::numeric / v_dim;
        end if;
        v_note := format('Acquisition %s', to_char(v_m1, 'MM/YYYY'))
          || case when v_sick > 0 then format(' (dont %s j d''arrêt maladie)', v_sick) else '' end;
      else
        if v_m1 = v_period and (v_elig is null or v_elig <= v_m1) then
          v_amount := t.accrual_amount;
          v_note := format('Droits %s', extract(year from v_period));
        elsif v_elig is not null and v_elig between v_m1 and v_m2 and v_elig > v_period then
          v_months := ((extract(year from v_pend) - extract(year from v_m1)) * 12
            + extract(month from v_pend) - extract(month from v_m1) + 1)::int;
          v_amount := round(t.accrual_amount * v_months / 12.0, 2);
          v_note := format('Droits %s au prorata (%s mois)', extract(year from v_period), v_months);
        else
          continue;
        end if;
      end if;
      v_amount := round(greatest(v_amount, 0), 4);
      insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, accrual_month, note)
      values (p_org, m.id, t.id, v_period, v_amount, 'accrual', v_m1, v_note)
      on conflict (member_id, leave_type_id, accrual_month) where kind = 'accrual'
      do update set amount = excluded.amount, period_start = excluded.period_start, note = excluded.note;
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end $$;

create or replace function public.run_accruals(p_org uuid, p_month date)
returns int language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; v_n int;
begin
  v_actor := app.require_hr(p_org);
  if p_month < date '2020-01-01' or p_month > app.org_today(p_org) then perform app.err('Mois invalide.'); end if;
  v_n := app.compute_accruals(p_org, p_month);
  perform app.audit(p_org, v_actor.id, 'accruals.computed', 'organization', p_org,
    jsonb_build_object('month', date_trunc('month', p_month)::date, 'entries', v_n));
  return v_n;
end $$;

-- Tâche planifiée : chaque 1er du mois, acquisitions du mois écoulé + droits annuels du mois en cours
create or replace function public.run_accruals_cron()
returns int language plpgsql security definer set search_path = '' as $$
declare o record; v_n int := 0; v_today date;
begin
  for o in select id from public.organizations loop
    v_today := app.org_today(o.id);
    v_n := v_n + app.compute_accruals(o.id, (date_trunc('month', v_today) - interval '1 month')::date);
    v_n := v_n + app.compute_accruals(o.id, date_trunc('month', v_today)::date);
  end loop;
  return v_n;
end $$;

-- ---------------------------------------------------------------------
-- Clôture d'une période : report ou perte des jours restants
-- ---------------------------------------------------------------------
create or replace function public.close_leave_period(p_org uuid, p_leave_type uuid, p_period_start date, p_apply boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; t public.leave_types; o public.organizations; v_cur date; v_next date;
  v_rows jsonb := '[]'::jsonb; r record; v_carry numeric; v_expire numeric;
begin
  v_actor := app.require_hr(p_org);
  select * into t from public.leave_types where id = p_leave_type and org_id = p_org;
  if t.id is null or not t.deducts_balance then perform app.err('Type de compteur invalide.'); end if;
  select * into o from public.organizations where id = p_org;
  v_cur := app.period_start(t.period_kind, o.cp_period_start_month, app.org_today(p_org));
  if p_period_start >= v_cur then perform app.err('Seule une période terminée peut être clôturée.'); end if;
  v_next := (p_period_start + interval '1 year')::date;
  for r in
    select l.member_id, m.first_name, m.last_name, round(sum(l.amount), 4) as bal
    from public.leave_ledger l join public.members m on m.id = l.member_id
    where l.org_id = p_org and l.leave_type_id = t.id and l.period_start = p_period_start
    group by l.member_id, m.first_name, m.last_name having round(sum(l.amount), 4) <> 0
    order by m.last_name, m.first_name
  loop
    if r.bal > 0 then
      v_carry := case when t.carryover_max is null then r.bal else least(r.bal, t.carryover_max) end;
      v_expire := r.bal - v_carry;
    else
      v_carry := r.bal; v_expire := 0;
    end if;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object('member_id', r.member_id,
      'name', r.first_name || ' ' || r.last_name, 'balance', round(r.bal, 2), 'carry', round(v_carry, 2), 'expire', round(v_expire, 2)));
    if p_apply then
      if v_carry <> 0 then
        insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, created_by, note) values
          (p_org, r.member_id, t.id, p_period_start, -v_carry, 'carryover', v_actor.id, 'Report vers la période suivante'),
          (p_org, r.member_id, t.id, v_next, v_carry, 'carryover', v_actor.id, 'Report de la période précédente');
      end if;
      if v_expire > 0 then
        insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, created_by, note)
        values (p_org, r.member_id, t.id, p_period_start, -v_expire, 'expiry', v_actor.id, 'Jours non reportés à la clôture');
      end if;
    end if;
  end loop;
  if p_apply then
    perform app.audit(p_org, v_actor.id, 'period.closed', 'leave_type', t.id,
      jsonb_build_object('period_start', p_period_start, 'members', jsonb_array_length(v_rows)));
  end if;
  return jsonb_build_object('applied', p_apply, 'rows', v_rows, 'next_period', v_next);
end $$;

-- ---------------------------------------------------------------------
-- Jours de fractionnement (art. L3141-23 C. trav.), calcul au 31 octobre
-- ---------------------------------------------------------------------
create or replace function public.compute_fractionnement(p_org uuid, p_period_start date, p_apply boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; o public.organizations; t public.leave_types; v_w1 date; v_w2 date;
  v_cap numeric; v_min_cont numeric; r record; v_rows jsonb := '[]'::jsonb; v_in numeric; v_cont numeric;
  v_principal numeric; v_rest numeric; v_days int; v_reason text; v_already boolean;
begin
  v_actor := app.require_hr(p_org);
  select * into o from public.organizations where id = p_org;
  if not o.fractionnement_enabled then perform app.err('Le fractionnement est désactivé dans les paramètres.'); end if;
  select * into t from public.leave_types where org_id = p_org and category = 'paid_leave' and active order by position limit 1;
  if t.id is null then perform app.err('Aucun type « congés payés » actif.'); end if;
  v_w1 := make_date(extract(year from p_period_start)::int + 1, 5, 1);
  v_w2 := make_date(extract(year from p_period_start)::int + 1, 10, 31);
  if p_apply and app.org_today(p_org) <= v_w2 then
    perform app.err(format('Le fractionnement s''attribue après le %s.', app.fmt_date(v_w2)));
  end if;
  v_cap := case when t.counting = 'ouvres' then 20 else 24 end;
  v_min_cont := case when t.counting = 'ouvres' then 10 else 12 end;
  for r in
    select l.member_id, m.first_name, m.last_name,
      sum(l.amount) filter (where l.kind in ('opening', 'accrual', 'adjustment')) as acquired
    from public.leave_ledger l join public.members m on m.id = l.member_id
    where l.org_id = p_org and l.leave_type_id = t.id and l.period_start = p_period_start
    group by l.member_id, m.first_name, m.last_name
    order by m.last_name, m.first_name
  loop
    select coalesce(sum(app.count_days_for(o, t, greatest(q.start_date, v_w1),
             case when q.start_date >= v_w1 then q.start_half else 'full' end,
             least(q.end_date, v_w2), case when q.end_date <= v_w2 then q.end_half else 'full' end)), 0),
           coalesce(max(app.count_days_for(o, t, greatest(q.start_date, v_w1),
             case when q.start_date >= v_w1 then q.start_half else 'full' end,
             least(q.end_date, v_w2), case when q.end_date <= v_w2 then q.end_half else 'full' end)), 0)
      into v_in, v_cont
    from public.leave_requests q
    where q.member_id = r.member_id and q.leave_type_id = t.id and q.status = 'approved'
      and q.start_date <= v_w2 and q.end_date >= v_w1;
    v_principal := least(coalesce(r.acquired, 0), v_cap);
    v_rest := greatest(0, v_principal - v_in);
    v_days := 0; v_reason := null;
    if coalesce(r.acquired, 0) <= v_min_cont then
      v_reason := 'Droits acquis insuffisants';
    elsif v_cont < v_min_cont then
      v_reason := format('Pas de congé continu de %s jours entre mai et octobre', v_min_cont);
    elsif t.counting = 'ouvres' then
      v_days := case when v_rest >= 5 then 2 when v_rest >= 3 then 1 else 0 end;
    else
      v_days := case when v_rest >= 6 then 2 when v_rest >= 3 then 1 else 0 end;
    end if;
    if v_days = 0 and v_reason is null then v_reason := 'Moins de 3 jours du congé principal hors période'; end if;
    select exists (select 1 from public.leave_ledger where member_id = r.member_id and leave_type_id = t.id
      and period_start = p_period_start and kind = 'fractionnement') into v_already;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object('member_id', r.member_id, 'name', r.first_name || ' ' || r.last_name,
      'acquired', round(coalesce(r.acquired, 0), 2), 'taken_in_window', v_in, 'principal_outside', v_rest,
      'days', v_days, 'reason', v_reason, 'already_applied', v_already));
    if p_apply and v_days > 0 and not v_already then
      insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, created_by, note)
      values (p_org, r.member_id, t.id, p_period_start, v_days, 'fractionnement', v_actor.id,
        format('Jours de fractionnement (%s j du congé principal hors période)', app.fmt_num(v_rest)));
    end if;
  end loop;
  if p_apply then
    perform app.audit(p_org, v_actor.id, 'fractionnement.applied', 'leave_type', t.id, jsonb_build_object('period_start', p_period_start));
  end if;
  return jsonb_build_object('applied', p_apply, 'window_start', v_w1, 'window_end', v_w2, 'rows', v_rows);
end $$;

-- ---------------------------------------------------------------------
-- Jours fériés chômés / travaillés (6 fériés garantis HCR)
-- ---------------------------------------------------------------------
create or replace function public.set_holiday_status(p_org uuid, p_member uuid, p_day date, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor public.members; v_target public.members; o public.organizations; t public.leave_types;
  v_period date; v_debited boolean := false;
begin
  v_actor := app.require_member(p_org);
  select * into v_target from public.members where id = p_member and org_id = p_org;
  if v_target.id is null then perform app.err('Salarié introuvable.'); end if;
  if not (v_actor.role in ('hr', 'admin') or app.manages(v_actor.id, v_target.id)) then
    perform app.err('Action réservée aux managers et aux RH.', '42501');
  end if;
  select * into o from public.organizations where id = p_org;
  if not exists (select 1 from public.public_holidays where region = o.holiday_region and day = p_day) then
    perform app.err('Cette date n''est pas un jour férié.');
  end if;
  if p_status is not null and p_status not in ('off', 'worked') then perform app.err('Statut invalide.'); end if;

  if p_status is null then
    delete from public.holiday_work where member_id = p_member and day = p_day;
  else
    insert into public.holiday_work(member_id, org_id, day, status, updated_by, updated_at)
    values (p_member, p_org, p_day, p_status, v_actor.id, now())
    on conflict (member_id, day) do update set status = excluded.status, updated_by = excluded.updated_by, updated_at = now();
  end if;

  -- Compteur des fériés garantis (HCR), hors 1er mai qui suit son propre régime
  select * into t from public.leave_types where org_id = p_org and category = 'holiday_comp' and active order by position limit 1;
  if t.id is not null and o.sector = 'hcr' and not (extract(month from p_day) = 5 and extract(day from p_day) = 1) then
    delete from public.leave_ledger where member_id = p_member and leave_type_id = t.id and holiday_date = p_day and kind = 'holiday_off';
    if p_status = 'off' then
      v_period := app.period_start(t.period_kind, o.cp_period_start_month, p_day);
      if (select coalesce(sum(amount), 0) from public.leave_ledger
          where member_id = p_member and leave_type_id = t.id and period_start = v_period) >= 1 then
        insert into public.leave_ledger(org_id, member_id, leave_type_id, period_start, amount, kind, holiday_date, created_by, note)
        values (p_org, p_member, t.id, v_period, -1, 'holiday_off', p_day, v_actor.id, format('Férié chômé le %s', app.fmt_date(p_day)));
        v_debited := true;
      end if;
    end if;
  end if;

  perform app.audit(p_org, v_actor.id, 'holiday.status_set', 'member', p_member,
    jsonb_build_object('day', p_day, 'status', p_status, 'debited', v_debited));
  return jsonb_build_object('status', p_status, 'debited', v_debited);
end $$;
