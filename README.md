# Équipia

Portail RH en libre-service pour les PME et l'hôtellerie-restauration : demandes de congés, validation, calcul automatique des soldes selon le droit français, planning d'équipe, export paie.

Nom provisoire : il se change dans `src/lib/config.ts` (marque, tarifs, contact).

## Ce qui est livré (phase 1 : congés + socle)

**Salarié** : demande en quelques secondes avec aperçu en direct (jours décomptés, fériés, solde restant, alerte d'effectif), demi-journées, justificatif, annulation, historique et mouvements des compteurs, flux iCal pour son agenda, export RGPD de ses données.

**Manager** : validations en un clic avec solde après validation et conflits d'effectif minimum, refus motivé, planning d'équipe (mois ou 2 semaines), absences posées pour son équipe.

**RH / administrateur** : salariés (ajout, invitation par e-mail, import CSV avec reprise des soldes N-1 / N / RTT / récupération / fériés garantis), équipes et effectif minimum, types d'absence paramétrables, règles de l'entreprise, compteurs de tous les salariés, recalcul des acquisitions, fractionnement, clôture de période (report / perte), jours fériés chômés ou travaillés, export paie CSV, export des soldes, journal d'audit, anonymisation RGPD, suppression de l'espace, données de démonstration.

**Règles légales intégrées** : 2,5 j ouvrables (ou 2,08 j ouvrés) par mois avec prorata, arrêt maladie non professionnel à 2 j/mois (loi du 22/04/2024), AT/MP à 2,5 j, jours fériés métropole / Alsace-Moselle / outre-mer 2020-2040, fractionnement (L3141-23), événements familiaux (L3142-4, durées à vérifier après la loi du 12/06/2026), périodes N-1 / N avec consommation des jours les plus anciens, anticipation, solde négatif plafonné, délai de prévenance, double validation manager puis RH.

**Pack HCR** : 6 fériés garantis crédités au 1er janvier après 1 an d'ancienneté (prorata à la date anniversaire), décompte des fériés chômés, 1er mai travaillé signalé « rémunération doublée » dans l'export, équipes Cuisine / Salle / Réception, jours d'ouverture du lundi au samedi.

**Site commercial** : accueil avec planning animé, page hôtellerie-restauration, tarifs, sécurité, FAQ, mentions légales / confidentialité / CGU (modèles à compléter, champs surlignés), SEO (sitemap, robots, image de partage).

## Architecture

- **Next.js 16** (App Router, Server Actions, `proxy.ts`), TypeScript, Tailwind CSS 4, Radix UI, police Instrument Sans locale.
- **Supabase** : Postgres 17, Auth (mot de passe, liens e-mail, TOTP), Storage (justificatifs), pg_cron (acquisitions le 1er de chaque mois).
- **Fonction Edge `admin-auth`** : seule détentrice de la clé `service_role`, elle génère les liens d'inscription, d'invitation et de réinitialisation. Le serveur web n'a jamais la clé d'administration.
- **Resend** pour les e-mails (gabarits en français, envoyés par le serveur).
- **Vercel** (région `cdg1`, Paris).

### Modèle de sécurité

1. **Lecture** : Row Level Security sur toutes les tables. Un salarié voit ses données, un manager celles de sa ligne managériale (n+1, n+2...), les RH celles de l'entreprise. Les motifs sensibles (maladie, AT) sont masqués aux collègues par la fonction `team_calendar`.
2. **Écriture** : aucune politique d'insertion ou de mise à jour. Toutes les écritures passent par des fonctions `security definer` (`submit_leave_request`, `decide_leave_request`, `adjust_balance`...) qui vérifient les droits et appliquent les règles. Le rôle `anon` n'a accès qu'au flux iCal par jeton.
3. **Compteurs** : table `leave_ledger` (mouvements), le solde est toujours la somme des mouvements : historique complet et auditable.
4. **Audit** : `audit_log` alimenté par chaque fonction, lisible par les RH uniquement.

Fichiers clés :

| Fichier | Rôle |
| --- | --- |
| `supabase/migrations/…01_schema.sql` | Tables, RLS, fonctions d'aide aux politiques |
| `supabase/migrations/…02_leave_logic.sql` | Décompte, soldes, demandes, validation, acquisitions, fractionnement, clôture, fériés |
| `supabase/migrations/…03_admin.sql` | Espace, salariés, import, paramètres, tableaux de bord, exports, RGPD, démo |
| `supabase/migrations/…04_holidays.sql` | Jours fériés (généré par `npm run holidays`) |
| `supabase/migrations/…05_storage_cron_grants.sql` | Bucket justificatifs, tâche pg_cron, privilèges |
| `supabase/functions/admin-auth/` | Fonction Edge d'administration |
| `supabase/tests/01_leave_rules.sql` | 60 tests SQL (règles, droits, cloisonnement) |
| `src/lib/auth.ts` | Contexte de session (entreprise active, rôle, double authentification) |
| `src/app/app/actions/*` | Actions serveur (appellent les RPC puis envoient les e-mails) |

## Développement local

```bash
npm install
cp .env.example .env.local   # renseigner l'URL et la clé Supabase, EMAIL_TRANSPORT=file
npm run dev
```

Avec `EMAIL_TRANSPORT=file`, les e-mails sont écrits dans `.emails/` (liens de confirmation compris).

Tests de la base (sur une base locale où les migrations sont appliquées) :

```bash
npm run test:db   # DATABASE_URL=postgres://... pour une autre base
```

## Déploiement

1. **Supabase** : créer un projet en région **Paris (eu-west-3)**, idéalement dans une organisation Pro (pas de mise en pause, sauvegardes quotidiennes).
2. Appliquer les migrations dans l'ordre (`supabase db push`, ou copier chaque fichier dans l'éditeur SQL).
3. Créer le secret partagé dans le coffre-fort :
   ```sql
   select vault.create_secret('<chaîne aléatoire de 48 caractères>', 'edge_shared_secret');
   ```
4. Déployer la fonction Edge sans vérification JWT (elle vérifie le secret partagé) :
   ```bash
   supabase functions deploy admin-auth --no-verify-jwt
   ```
5. **Auth Supabase** : Site URL = URL de production. La double authentification TOTP doit être active (par défaut). Recommandé : désactiver l'inscription publique directe (Authentication > Sign In), les inscriptions passant par la fonction Edge (à vérifier sur votre projet).
6. **Resend** : vérifier un domaine d'envoi (DNS chez Cloudflare), créer une clé API.
7. **Vercel** : importer le dépôt GitHub, renseigner les variables de `.env.example` (`EMAIL_TRANSPORT=resend`), puis ajouter le domaine.
8. Vérifier : `select * from cron.job;` (tâche `equipia-accruals`) et les conseillers de sécurité Supabase.

## Prochaines étapes conseillées

- Paiement en ligne (Stripe) et restriction des fonctionnalités par offre.
- Phase 2 du cahier des charges : notes de frais (OCR, export comptable).
- Relances automatiques des demandes en attente, intégrations Slack / Teams.
- Validation juridique des pages légales et des durées d'événements familiaux après la loi du 12 juin 2026.
