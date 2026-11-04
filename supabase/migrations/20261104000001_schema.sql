-- =====================================================================
-- Équipia : schéma principal
-- Principe de sécurité : lecture filtrée par RLS, AUCUNE écriture directe
-- depuis le client. Toutes les écritures passent par des fonctions RPC
-- (security definer) qui vérifient les droits et appliquent les règles.
-- =====================================================================

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Entreprises (tenants)
-- ---------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  sector text not null default 'general' check (sector in ('general', 'hcr')),
  timezone text not null default 'Europe/Paris',
  holiday_region text not null default 'metropole'
    check (holiday_region in ('metropole', 'alsace_moselle', 'guadeloupe', 'martinique', 'guyane', 'reunion', 'mayotte')),
  holidays_off boolean not null default true,
  cp_counting text not null default 'ouvrables' check (cp_counting in ('ouvrables', 'ouvres')),
  cp_period_start_month smallint not null default 6 check (cp_period_start_month between 1 and 12),
  work_days smallint[] not null default '{1,2,3,4,5}',
  allow_anticipation boolean not null default true,
  allow_negative_balance boolean not null default false,
  negative_balance_limit numeric(5,2) not null default 0 check (negative_balance_limit between 0 and 30),
  hr_approval_required boolean not null default false,
  min_notice_days smallint not null default 0 check (min_notice_days between 0 and 365),
  fractionnement_enabled boolean not null default true,
  mfa_required boolean not null default false,
  plan text not null default 'trial' check (plan in ('trial', 'essentiel', 'pro', 'sur_mesure')),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  employee_count_range text check (char_length(employee_count_range) <= 20),
  has_demo_data boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (array_length(work_days, 1) between 1 and 7 and work_days <@ '{1,2,3,4,5,6,7}'::smallint[])
);

-- ---------------------------------------------------------------------
-- Équipes / services (Cuisine, Salle, Réception...)
-- ---------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  min_present smallint not null default 0 check (min_present between 0 and 500),
  created_at timestamptz not null default now(),
  unique (org_id, name)
);
create index teams_org_idx on public.teams(org_id);

-- ---------------------------------------------------------------------
-- Membres (annuaire de l'entreprise)
-- ---------------------------------------------------------------------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  role text not null default 'employee' check (role in ('employee', 'manager', 'hr', 'admin')),
  team_id uuid references public.teams(id) on delete set null,
  manager_id uuid references public.members(id) on delete set null,
  job_title text check (char_length(job_title) <= 120),
  work_days smallint[] check (work_days is null or work_days <@ '{1,2,3,4,5,6,7}'::smallint[]),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  notify_email boolean not null default true,
  is_demo boolean not null default false,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, email),
  check (manager_id is distinct from id)
);
create index members_user_idx on public.members(user_id);
create index members_org_idx on public.members(org_id);
create index members_manager_idx on public.members(manager_id);
create index members_team_idx on public.members(team_id);

-- Données contractuelles : visibles uniquement par le salarié, sa ligne managériale et les RH
create table public.member_contracts (
  member_id uuid primary key references public.members(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  contract_type text not null default 'cdi'
    check (contract_type in ('cdi', 'cdd', 'saisonnier', 'extra', 'apprentissage', 'stage', 'interim')),
  hire_date date,
  end_date date,
  weekly_hours numeric(4,1) check (weekly_hours between 0 and 60),
  employee_number text check (char_length(employee_number) <= 40),
  hr_notes text check (char_length(hr_notes) <= 2000),
  updated_at timestamptz not null default now(),
  check (end_date is null or hire_date is null or end_date >= hire_date)
);
create index member_contracts_org_idx on public.member_contracts(org_id);

-- Jeton secret du flux iCal (jamais exposé via l'API REST)
create table app.calendar_tokens (
  member_id uuid primary key references public.members(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Types d'absence et règles d'acquisition
-- ---------------------------------------------------------------------
create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9_]{1,12}$'),
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  category text not null check (category in
    ('paid_leave', 'rtt', 'sick', 'sick_pro', 'family', 'remote', 'unpaid', 'recovery', 'holiday_comp', 'other')),
  counting text not null default 'ouvres' check (counting in ('ouvrables', 'ouvres', 'calendaires')),
  allow_half_days boolean not null default true,
  deducts_balance boolean not null default false,
  accrual_mode text not null default 'none' check (accrual_mode in ('none', 'monthly', 'annual')),
  accrual_amount numeric(8,4) not null default 0 check (accrual_amount between 0 and 366),
  period_kind text not null default 'civil' check (period_kind in ('cp', 'civil')),
  min_seniority_months smallint not null default 0 check (min_seniority_months between 0 and 120),
  carryover_max numeric(6,2) check (carryover_max is null or carryover_max >= 0),
  requires_approval boolean not null default true,
  requires_attachment boolean not null default false,
  counts_as_absence boolean not null default true,
  visible_to_colleagues boolean not null default true,
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  description text check (char_length(description) <= 500),
  active boolean not null default true,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (org_id, code)
);
create index leave_types_org_idx on public.leave_types(org_id);

-- ---------------------------------------------------------------------
-- Demandes d'absence
-- ---------------------------------------------------------------------
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict,
  start_date date not null,
  start_half text not null default 'full' check (start_half in ('full', 'pm')),
  end_date date not null,
  end_half text not null default 'full' check (end_half in ('full', 'am')),
  days numeric(6,2) not null check (days >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  step text check (step in ('manager', 'hr')),
  reason_code text check (char_length(reason_code) <= 40),
  comment text check (char_length(comment) <= 1000),
  decision_comment text check (char_length(decision_comment) <= 1000),
  attachment_path text check (char_length(attachment_path) <= 300),
  manager_approved_by uuid references public.members(id) on delete set null,
  manager_approved_at timestamptz,
  decided_by uuid references public.members(id) on delete set null,
  decided_at timestamptz,
  cancelled_by uuid references public.members(id) on delete set null,
  cancelled_at timestamptz,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_date - start_date <= 366)
);
create index leave_requests_org_dates_idx on public.leave_requests(org_id, start_date, end_date);
create index leave_requests_member_idx on public.leave_requests(member_id, start_date);
create index leave_requests_org_status_idx on public.leave_requests(org_id, status);
create index leave_requests_type_idx on public.leave_requests(leave_type_id);

-- ---------------------------------------------------------------------
-- Mouvements de compteurs (historique complet, base du calcul des soldes)
-- ---------------------------------------------------------------------
create table public.leave_ledger (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  period_start date not null,
  amount numeric(9,4) not null,
  kind text not null check (kind in
    ('opening', 'accrual', 'adjustment', 'request', 'request_cancel', 'carryover', 'expiry', 'fractionnement', 'holiday_off')),
  request_id uuid references public.leave_requests(id) on delete set null,
  accrual_month date,
  holiday_date date,
  note text check (char_length(note) <= 500),
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index leave_ledger_member_idx on public.leave_ledger(member_id, leave_type_id, period_start);
create index leave_ledger_org_idx on public.leave_ledger(org_id);
create index leave_ledger_request_idx on public.leave_ledger(request_id);
create unique index leave_ledger_accrual_once on public.leave_ledger(member_id, leave_type_id, accrual_month) where kind = 'accrual';
create unique index leave_ledger_holiday_once on public.leave_ledger(member_id, leave_type_id, holiday_date) where kind = 'holiday_off';
create unique index leave_ledger_fract_once on public.leave_ledger(member_id, leave_type_id, period_start) where kind = 'fractionnement';

-- ---------------------------------------------------------------------
-- Jours fériés (par territoire) et suivi des fériés travaillés / chômés
-- ---------------------------------------------------------------------
create table public.public_holidays (
  region text not null,
  day date not null,
  name text not null,
  primary key (region, day)
);

create table public.holiday_work (
  member_id uuid not null references public.members(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  day date not null,
  status text not null check (status in ('off', 'worked')),
  updated_by uuid references public.members(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (member_id, day)
);
create index holiday_work_org_idx on public.holiday_work(org_id, day);

-- ---------------------------------------------------------------------
-- Notifications in-app et journal d'audit
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_member_idx on public.notifications(member_id, created_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_member_id uuid references public.members(id) on delete set null,
  actor_user_id uuid,
  action text not null,
  entity text,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_idx on public.audit_log(org_id, created_at desc);

-- =====================================================================
-- Fonctions d'aide aux politiques de sécurité
-- =====================================================================
create or replace function app.my_org_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.org_id from public.members m
  where m.user_id = (select auth.uid()) and m.status <> 'disabled'
$$;

create or replace function app.my_member_id(p_org uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select m.id from public.members m
  where m.org_id = p_org and m.user_id = (select auth.uid()) and m.status <> 'disabled'
  limit 1
$$;

create or replace function app.my_role(p_org uuid)
returns text language sql stable security definer set search_path = '' as $$
  select m.role from public.members m
  where m.org_id = p_org and m.user_id = (select auth.uid()) and m.status <> 'disabled'
  limit 1
$$;

create or replace function app.is_hr(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(app.my_role(p_org) in ('hr', 'admin'), false)
$$;

-- p_manager est-il dans la ligne managériale (n+1, n+2...) de p_member ?
create or replace function app.manages(p_manager uuid, p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  with recursive chain as (
    select m.manager_id, 1 as depth from public.members m where m.id = p_member
    union all
    select m.manager_id, c.depth + 1 from public.members m
    join chain c on m.id = c.manager_id
    where c.manager_id is not null and c.depth < 12
  )
  select p_manager is not null and exists (select 1 from chain where manager_id = p_manager)
$$;

-- L'utilisateur courant peut-il voir les données personnelles (absences détaillées, soldes, contrat) de ce membre ?
create or replace function app.can_see_member_private(p_member uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members target
    join public.members me on me.org_id = target.org_id
      and me.user_id = (select auth.uid()) and me.status <> 'disabled'
    where target.id = p_member
      and (me.id = target.id or me.role in ('hr', 'admin') or app.manages(me.id, target.id))
  )
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.organizations enable row level security;
alter table public.teams enable row level security;
alter table public.members enable row level security;
alter table public.member_contracts enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_ledger enable row level security;
alter table public.public_holidays enable row level security;
alter table public.holiday_work enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;
alter table app.calendar_tokens enable row level security;

create policy "membres : voir son entreprise" on public.organizations
  for select to authenticated using (id in (select app.my_org_ids()));

create policy "membres : voir les équipes" on public.teams
  for select to authenticated using (org_id in (select app.my_org_ids()));

create policy "membres : voir l'annuaire" on public.members
  for select to authenticated using (org_id in (select app.my_org_ids()));

create policy "contrat : soi, ligne managériale, RH" on public.member_contracts
  for select to authenticated using (app.can_see_member_private(member_id));

create policy "membres : voir les types d'absence" on public.leave_types
  for select to authenticated using (org_id in (select app.my_org_ids()));

create policy "demandes : soi, ligne managériale, RH" on public.leave_requests
  for select to authenticated using (app.can_see_member_private(member_id));

create policy "compteurs : soi, ligne managériale, RH" on public.leave_ledger
  for select to authenticated using (app.can_see_member_private(member_id));

create policy "jours fériés : lecture" on public.public_holidays
  for select to authenticated using (true);

create policy "fériés travaillés : soi, ligne managériale, RH" on public.holiday_work
  for select to authenticated using (app.can_see_member_private(member_id));

create policy "notifications : les siennes" on public.notifications
  for select to authenticated using (
    member_id in (select m.id from public.members m where m.user_id = (select auth.uid()))
  );

create policy "audit : RH et administrateurs" on public.audit_log
  for select to authenticated using (app.is_hr(org_id));

-- =====================================================================
-- Privilèges : lecture seule pour les utilisateurs connectés, rien pour anon
-- =====================================================================
revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema app from anon, authenticated;
grant select on public.organizations, public.teams, public.members, public.member_contracts,
  public.leave_types, public.leave_requests, public.leave_ledger, public.public_holidays,
  public.holiday_work, public.notifications, public.audit_log to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
