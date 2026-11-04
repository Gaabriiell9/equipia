-- Tests des règles métier et du cloisonnement (exécutés dans une transaction annulée)
-- Usage : psql -v ON_ERROR_STOP=1 -f supabase/tests/01_leave_rules.sql
\set QUIET on
\pset tuples_only on
\pset format unaligned
begin;

create or replace function pg_temp.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;
create or replace function pg_temp.check(p_ok boolean, p_label text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'ÉCHEC : %', p_label; end if;
  raise notice 'ok  %', p_label;
end $$;
create or replace function pg_temp.fails(p_sql text, p_expected text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm ilike '%' || p_expected || '%' then raise notice 'ok  % (%)', p_label, sqlerrm; return; end if;
    raise exception 'ÉCHEC : % : erreur inattendue « % »', p_label, sqlerrm;
  end;
  raise exception 'ÉCHEC : % : aucune erreur levée', p_label;
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- Utilisateurs de test
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, is_sso_user, is_anonymous)
select u.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, '', now(), now(), now(), false, false
from (values
  ('a0000000-0000-0000-0000-000000000001', 'alice@bistrot.test'),
  ('a0000000-0000-0000-0000-000000000002', 'bob@bistrot.test'),
  ('a0000000-0000-0000-0000-000000000003', 'carla@bistrot.test'),
  ('a0000000-0000-0000-0000-000000000004', 'dan@bistrot.test'),
  ('a0000000-0000-0000-0000-000000000005', 'eve@bistrot.test'),
  ('a0000000-0000-0000-0000-000000000009', 'mallory@autre.test')
) u(id, email);

-- ---------------------------------------------------------------- décompte
select pg_temp.check(app.count_days('2026-12-21', 'full', '2027-01-03', 'full', 'ouvrables', '{1,2,3,4,5}', 'metropole', true) = 10,
  'Jours ouvrables 21/12 au 03/01 = 10 (Noël et 1er janvier exclus)');
select pg_temp.check(app.count_days('2026-12-21', 'full', '2027-01-03', 'full', 'ouvres', '{1,2,3,4,5}', 'metropole', true) = 8,
  'Jours ouvrés 21/12 au 03/01 = 8');
select pg_temp.check(app.count_days('2026-12-10', 'pm', '2026-12-11', 'am', 'ouvres', '{1,2,3,4,5}', 'metropole', true) = 1,
  'Jeudi après-midi au vendredi matin = 1 jour');
select pg_temp.check(app.count_days('2026-06-08', 'full', '2026-06-12', 'full', 'ouvres', '{1,2,3,4,5}', 'guyane', true) = 4,
  'Guyane : le 10 juin (abolition) est férié');
select pg_temp.check(app.count_days('2026-12-21', 'full', '2027-01-03', 'full', 'ouvrables', '{1,2,3,4,5}', 'metropole', false) = 12,
  'Fériés non chômés dans l''entreprise : ils sont décomptés');

-- ---------------------------------------------------------------- création de l'espace
set local role authenticated;
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select public.create_organization('Le Bistrot du Port', 'hcr', 'Alice', 'Martin', '11-50', 'metropole', false) as org \gset
select pg_temp.check((select count(*) from public.leave_types where org_id = :'org') = 10, '10 types d''absence créés');
select pg_temp.check((select active from public.leave_types where org_id = :'org' and code = 'FG'), 'Compteur fériés garantis actif en HCR');
select pg_temp.check((select count(*) from public.teams where org_id = :'org') = 3, 'Équipes HCR créées');
select id as cuisine from public.teams where org_id = :'org' and name = 'Cuisine' \gset
select public.upsert_team(:'org', :'cuisine', 'Cuisine', '#ea580c', 2);

select (public.invite_member(:'org', 'Bob@Bistrot.test', 'Bob', 'Chef', 'manager', :'cuisine', null, 'Chef de cuisine', 'cdi', '2019-01-01'))->>'member_id' as bob \gset
select (public.invite_member(:'org', 'carla@bistrot.test', 'Carla', 'Commis', 'employee', :'cuisine', :'bob', 'Commis', 'cdi', '2020-05-01'))->>'member_id' as carla \gset
select (public.invite_member(:'org', 'dan@bistrot.test', 'Dan', 'Plonge', 'employee', :'cuisine', null, 'Plongeur', 'cdi', '2025-03-01'))->>'member_id' as dan \gset
select (public.invite_member(:'org', 'eve@bistrot.test', 'Eve', 'RH', 'hr', null, null, 'Responsable RH', 'cdi', '2018-01-01'))->>'member_id' as eve \gset
select pg_temp.fails($$select public.invite_member('$$ || :'org' || $$', 'carla@bistrot.test', 'X', 'Y')$$, 'déjà', 'E-mail en double refusé');

select pg_temp.login('a0000000-0000-0000-0000-000000000002'); select public.claim_memberships();
select pg_temp.login('a0000000-0000-0000-0000-000000000003'); select public.claim_memberships();
select pg_temp.login('a0000000-0000-0000-0000-000000000004'); select public.claim_memberships();
select pg_temp.login('a0000000-0000-0000-0000-000000000005'); select public.claim_memberships();
select pg_temp.check((select status from public.members where id = :'carla') = 'active', 'Invitation rattachée au compte vérifié');

-- ---------------------------------------------------------------- cloisonnement
select pg_temp.login('a0000000-0000-0000-0000-000000000009');
select pg_temp.check((select count(*) from public.members) = 0, 'Un utilisateur extérieur ne voit aucun salarié');
select pg_temp.fails($$select public.member_balances('$$ || :'org' || $$')$$, 'Accès refusé', 'Un extérieur ne peut pas lire les soldes');

-- ---------------------------------------------------------------- soldes et demande
select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select id as cp from public.leave_types where org_id = :'org' and code = 'CP' \gset
select id as mal from public.leave_types where org_id = :'org' and code = 'MAL' \gset
select id as fg from public.leave_types where org_id = :'org' and code = 'FG' \gset
select pg_temp.fails($$select public.submit_leave_request('$$ || :'org' || $$', '$$ || :'cp' || $$', '2026-12-21', '2027-01-03')$$,
  'Solde insuffisant', 'Demande refusée si le solde est insuffisant');
select pg_temp.fails($$select public.adjust_balance('$$ || :'org' || $$', '$$ || :'carla' || $$', '$$ || :'cp' || $$', 10, 'previous', 'test')$$,
  'réservée aux RH', 'Un salarié ne peut pas modifier son compteur');
select pg_temp.fails($$select public.submit_leave_request('$$ || :'org' || $$', '$$ || :'cp' || $$', '2026-10-01', '2026-10-02')$$,
  'passé', 'Pas de congé dans le passé en libre-service');

select pg_temp.login('a0000000-0000-0000-0000-000000000005');
select public.adjust_balance(:'org', :'carla', :'cp', 10, 'previous', 'Reprise de solde');

select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select (public.preview_leave_request(:'org', :'cp', '2026-12-21', '2027-01-03'))->>'days' as pdays \gset
select pg_temp.check(:'pdays'::numeric = 10, 'Aperçu : 10 jours décomptés');
select public.submit_leave_request(:'org', :'cp', '2026-12-21', '2027-01-03', 'full', 'full', 'Vacances de Noël') as sub \gset
select (:'sub'::jsonb)->>'id' as req1 \gset
select pg_temp.check((:'sub'::jsonb)->>'step' = 'manager', 'La demande part chez le manager');
select pg_temp.check(jsonb_array_length((:'sub'::jsonb)->'emails') = 1 and (:'sub'::jsonb)->'emails'->0->>'email' = 'bob@bistrot.test',
  'E-mail préparé pour le manager');
select pg_temp.fails($$select public.submit_leave_request('$$ || :'org' || $$', '$$ || :'cp' || $$', '2026-12-28', '2026-12-29')$$,
  'existe déjà', 'Chevauchement refusé');
select pg_temp.fails($$select public.submit_leave_request('$$ || :'org' || $$', '$$ || :'cp' || $$', '2027-01-11', '2027-01-12')$$,
  'Solde insuffisant', 'Les jours en attente sont réservés');
select pg_temp.fails($$select public.decide_leave_request('$$ || :'req1' || $$', true)$$, 'propre demande', 'Auto-validation interdite');

-- Effectif minimum : Bob absent la même semaine => conflit signalé
select pg_temp.login('a0000000-0000-0000-0000-000000000004');
select pg_temp.check((select count(*) from public.leave_requests where id = :'req1') = 0, 'Un collègue ne voit pas une demande en attente');
select pg_temp.check((select count(*) from public.leave_ledger where member_id = :'carla') = 0, 'Un collègue ne voit pas les compteurs');

select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select pg_temp.check((select count(*) from public.leave_requests where id = :'req1') = 1, 'Le manager voit la demande');
select pg_temp.check(jsonb_array_length((public.request_insights(:'req1'))->'conflicts') = 0, 'Pas de conflit tant que 2 cuisiniers restent');
select public.decide_leave_request(:'req1', true, 'Bonnes fêtes');
select pg_temp.check((select status from public.leave_requests where id = :'req1') = 'approved', 'Validée par le manager');
select pg_temp.check(app.available_balance(:'carla', :'cp', '2026-12-21') = 0, 'Solde débité de 10 jours');
select pg_temp.check((select sum(amount) from public.leave_ledger where request_id = :'req1') = -10, 'Mouvement de compteur -10');

-- Le manager pose son propre congé : conflit d'effectif détecté (Carla et Bob absents, Dan seul)
select (public.preview_leave_request(:'org', :'cp', '2026-12-22', '2026-12-23'))->'conflicts' as conf \gset
select pg_temp.check(jsonb_array_length(:'conf'::jsonb) = 2, 'Conflit d''effectif minimum détecté sur 2 jours');

-- Annulation par la salariée d'une absence future validée : recrédit
select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select public.cancel_leave_request(:'req1', 'Changement de programme');
select pg_temp.check(app.available_balance(:'carla', :'cp', '2026-12-21') = 10, 'Jours recrédités après annulation');

-- ---------------------------------------------------------------- double validation manager + RH
select pg_temp.login('a0000000-0000-0000-0000-000000000001');
select public.update_org_settings(:'org', '{"hr_approval_required": true}');
select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select (public.submit_leave_request(:'org', :'cp', '2027-02-01', '2027-02-03'))->>'id' as req2 \gset
select pg_temp.login('a0000000-0000-0000-0000-000000000002');
select public.decide_leave_request(:'req2', true);
select pg_temp.check((select step from public.leave_requests where id = :'req2') = 'hr', 'Après le manager, la demande passe aux RH');
select pg_temp.fails($$select public.decide_leave_request('$$ || :'req2' || $$', true)$$, 'attente de validation par les RH', 'Le manager ne valide pas l''étape RH');
select pg_temp.login('a0000000-0000-0000-0000-000000000005');
select pg_temp.fails($$select public.decide_leave_request('$$ || :'req2' || $$', false, '')$$, 'motif', 'Motif obligatoire pour un refus');
select public.decide_leave_request(:'req2', true);
select pg_temp.check((select status from public.leave_requests where id = :'req2') = 'approved', 'Validée par les RH');
select pg_temp.check(app.available_balance(:'carla', :'cp', '2027-02-01') = 7, 'Solde 10 - 3 = 7');

-- ---------------------------------------------------------------- arrêt maladie et confidentialité
select pg_temp.login('a0000000-0000-0000-0000-000000000005');
select (public.submit_leave_request(:'org', :'mal', '2026-10-12', '2026-10-21', 'full', 'full', null, :'dan'))->>'status' as st \gset
select pg_temp.check(:'st' = 'approved', 'Arrêt maladie enregistré sans validation');
select pg_temp.check((select label from public.team_calendar(:'org', '2026-10-01', '2026-10-31') where member_id = :'dan') = 'Arrêt maladie',
  'Les RH voient le motif');
select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select pg_temp.check((select label from public.team_calendar(:'org', '2026-10-01', '2026-10-31') where member_id = :'dan') = 'Absent',
  'Les collègues voient seulement « Absent »');
select pg_temp.check((select leave_type_id from public.team_calendar(:'org', '2026-10-01', '2026-10-31') where member_id = :'dan') is null,
  'Le type est masqué aux collègues');

-- ---------------------------------------------------------------- acquisition mensuelle (loi 2024)
select pg_temp.login('a0000000-0000-0000-0000-000000000005');
select public.run_accruals(:'org', '2026-10-01');
select pg_temp.check((select amount from public.leave_ledger where member_id = :'carla' and leave_type_id = :'cp' and kind = 'accrual') = 2.5,
  'Carla acquiert 2,5 jours en octobre');
-- Dan : 10 jours d'arrêt sur 31 => 2,5 x (21 + 0,8 x 10) / 31 = 2,3387
select pg_temp.check((select amount from public.leave_ledger where member_id = :'dan' and leave_type_id = :'cp' and kind = 'accrual') = 2.3387,
  'Dan : acquisition réduite à 2 j/mois pendant l''arrêt maladie');
select public.run_accruals(:'org', '2026-10-01');
select pg_temp.check((select count(*) from public.leave_ledger where member_id = :'carla' and kind = 'accrual') = 1, 'Recalcul idempotent');
select pg_temp.fails($$select public.run_accruals('$$ || :'org' || $$', '2027-01-01')$$, 'invalide', 'Pas d''acquisition pour un mois futur');

-- ---------------------------------------------------------------- fériés garantis HCR
select public.run_accruals(:'org', '2026-01-01');
select pg_temp.check(app.available_balance(:'carla', :'fg', '2026-11-11') = 6, 'Carla (6 ans d''ancienneté) : 6 fériés garantis');
select pg_temp.check(app.available_balance(:'dan', :'fg', '2026-11-11') = 0, 'Dan (moins d''un an au 01/01) : pas encore de droit');
select public.run_accruals(:'org', '2026-03-01');
select pg_temp.check(app.available_balance(:'dan', :'fg', '2026-11-11') = 5, 'Dan : droit au prorata à son 1 an (10 mois sur 12)');
select public.set_holiday_status(:'org', :'carla', '2026-11-11', 'off');
select pg_temp.check(app.available_balance(:'carla', :'fg', '2026-11-11') = 5, 'Férié chômé : compteur garanti -1');
select public.set_holiday_status(:'org', :'carla', '2026-11-11', 'worked');
select pg_temp.check(app.available_balance(:'carla', :'fg', '2026-11-11') = 6, 'Férié travaillé : le droit reste à compenser');
select public.set_holiday_status(:'org', :'carla', '2026-05-01', 'worked');
select pg_temp.check((select count(*) from public.payroll_export(:'org', '2026-05-01', '2026-05-31') where line_type = 'holiday_worked') = 1,
  '1er mai travaillé remonte dans l''export paie');
select pg_temp.fails($$select public.set_holiday_status('$$ || :'org' || $$', '$$ || :'carla' || $$', '2026-11-12', 'off')$$,
  'pas un jour férié', 'Date non fériée refusée');

-- ---------------------------------------------------------------- fractionnement (période 06/2025-05/2026)
select public.adjust_balance(:'org', :'carla', :'cp', 15, 'previous', 'Complément acquis 2025-2026');
select public.submit_leave_request(:'org', :'cp', '2026-07-06', '2026-07-20', 'full', 'full', null, :'carla');
select (public.compute_fractionnement(:'org', '2025-06-01', true))->'rows' as fr \gset
select pg_temp.check((select (x->>'days')::int from jsonb_array_elements(:'fr'::jsonb) x where x->>'member_id' = :'carla') = 2,
  'Fractionnement : 2 jours (12 j pris en été, 12 j du congé principal restants)');
select pg_temp.check((select count(*) from public.leave_ledger where member_id = :'carla' and kind = 'fractionnement') = 1,
  'Jours de fractionnement crédités');

-- ---------------------------------------------------------------- clôture
select (public.close_leave_period(:'org', :'cp', '2025-06-01', false))->'rows' as cl \gset
select pg_temp.check(jsonb_array_length(:'cl'::jsonb) >= 1, 'Aperçu de clôture disponible');
select pg_temp.fails($$select public.close_leave_period('$$ || :'org' || $$', '$$ || :'cp' || $$', '2026-06-01', true)$$,
  'période terminée', 'Impossible de clôturer la période en cours');

-- ---------------------------------------------------------------- import CSV
select public.import_members(:'org', '[{"email":"pas-un-email","first_name":"A","last_name":"B"}]', true) as imp \gset
select pg_temp.check(jsonb_array_length((:'imp'::jsonb)->'errors') = 1, 'Import : erreur de ligne détectée');
select public.import_members(:'org', '[
  {"email":"fanny@bistrot.test","first_name":"Fanny","last_name":"Serveuse","team":"Salle","manager_email":"bob@bistrot.test","contract_type":"saisonnier","hire_date":"2026-04-01","cp_current":"12.5"},
  {"email":"gael@bistrot.test","first_name":"Gaël","last_name":"Barman","team":"Terrasse","cp_previous":"4"}
]', false) as imp2 \gset
select pg_temp.check(((:'imp2'::jsonb)->>'created')::int = 2, 'Import : 2 salariés créés');
select pg_temp.check((select count(*) from public.teams where org_id = :'org' and name = 'Terrasse') = 1, 'Import : équipe créée à la volée');

-- ---------------------------------------------------------------- tableaux de bord, RGPD
select pg_temp.check(((public.hr_dashboard(:'org', '2026-01-01', '2026-12-31'))->>'headcount')::int = 7, 'Tableau de bord RH : effectif');
select pg_temp.login('a0000000-0000-0000-0000-000000000003');
select pg_temp.fails($$select public.hr_dashboard('$$ || :'org' || $$', '2026-01-01', '2026-12-31')$$, 'réservée', 'Tableau de bord RH interdit aux salariés');
select pg_temp.check(jsonb_array_length((public.export_my_data(:'org'))->'requests') >= 2, 'Export RGPD de ses données');
select pg_temp.check(jsonb_array_length(public.member_balances(:'org')) >= 2, 'Soldes du salarié');
select pg_temp.check(public.my_calendar_token(:'org') is not null, 'Jeton iCal personnel');

-- Flux iCal en anonyme avec le jeton
select public.my_calendar_token(:'org') as tok \gset
reset role;
set local role anon;
select pg_temp.check((select count(*) from public.ics_feed(:'tok')) >= 1, 'Flux iCal accessible avec le jeton');
select pg_temp.check((select count(*) from public.ics_feed(gen_random_uuid())) = 0, 'Flux iCal vide avec un faux jeton');
select pg_temp.fails('select count(*) from public.members', 'permission denied', 'Anonyme : aucune lecture de table');
reset role;

-- ---------------------------------------------------------------- données de démonstration
set local role authenticated;
select pg_temp.login('a0000000-0000-0000-0000-000000000009');
select public.create_organization('Atelier Demo', 'general', 'Mallory', 'Test', '11-50', 'metropole', true) as org2 \gset
select pg_temp.check((select count(*) from public.members where org_id = :'org2') = 10, 'Démo : 9 salariés fictifs + admin');
select pg_temp.check((select count(*) from public.leave_requests where org_id = :'org2' and status = 'pending') = 3, 'Démo : 3 demandes à valider');
select pg_temp.check((select count(*) from public.members where org_id = :'org') = 0, 'Isolation entre entreprises');
select public.remove_demo_data(:'org2');
select pg_temp.check((select count(*) from public.members where org_id = :'org2') = 1, 'Données de démo supprimées');

reset role;
rollback;
\echo 'TOUS LES TESTS SONT PASSÉS'
