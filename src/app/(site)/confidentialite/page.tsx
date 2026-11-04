import type { Metadata } from "next";
import { LegalPage, ToFill } from "@/components/site/legal";
import { brand } from "@/lib/config";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" updated="4 novembre 2026">
      <p>
        Cette politique explique quelles données sont traitées par {brand.name}, pourquoi, et comment exercer vos droits. Elle doit être relue par un professionnel du droit avant la commercialisation.
      </p>
      <h2>Qui est responsable ?</h2>
      <p>
        Pour les données des salariés saisies dans un espace entreprise, <strong>l&apos;entreprise cliente est responsable du traitement</strong> et {brand.legalEntity} agit comme sous-traitant (article 28 du RGPD). Un accord de sous-traitance est fourni sur demande.
      </p>
      <p>Pour les données des visiteurs du site et des comptes clients (inscription, facturation), {brand.legalEntity} est responsable du traitement.</p>
      <h2>Données traitées</h2>
      <ul>
        <li>Identité et contact professionnel : nom, prénom, e-mail, poste, équipe, manager.</li>
        <li>Données contractuelles : type de contrat, dates d&apos;entrée et de fin, matricule, horaires.</li>
        <li>Absences : dates, types, motifs, commentaires, justificatifs, soldes de congés et leur historique.</li>
        <li>Données de connexion : journal d&apos;audit des actions, adresse IP technique chez l&apos;hébergeur.</li>
      </ul>
      <p>
        Les arrêts maladie et accidents du travail peuvent révéler des informations de santé : ils ne sont visibles que par le salarié, sa ligne managériale et les RH, et leurs justificatifs sont stockés dans un espace privé.
      </p>
      <h2>Finalités et bases légales</h2>
      <ul>
        <li>Gestion des congés et absences : exécution du contrat avec l&apos;entreprise cliente, obligations légales de l&apos;employeur.</li>
        <li>Sécurité et traçabilité : intérêt légitime (prévention des fraudes et des erreurs).</li>
        <li>Envoi des notifications : exécution du contrat ; chaque utilisateur peut désactiver les e-mails non essentiels.</li>
      </ul>
      <h2>Durées de conservation</h2>
      <p>
        Les données sont conservées pendant la durée de l&apos;abonnement, puis supprimées dans un délai de <ToFill>30 jours</ToFill> après la suppression de l&apos;espace, sauf obligation légale. Les données des anciens salariés peuvent être anonymisées par l&apos;entreprise à tout moment.
      </p>
      <h2>Sous-traitants</h2>
      <ul>
        <li>Supabase (base de données et stockage, région Paris, Union européenne).</li>
        <li>Vercel (hébergement de l&apos;application web).</li>
        <li>Resend (envoi des e-mails).</li>
      </ul>
      <p>
        <ToFill>Vérifier pour chaque prestataire les garanties applicables aux éventuels transferts hors Union européenne (clauses contractuelles types, Data Privacy Framework).</ToFill>
      </p>
      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité. Le téléchargement de vos données est disponible depuis votre profil. Pour les autres demandes, adressez-vous à votre employeur ou écrivez à {brand.contactEmail}. Vous pouvez saisir la CNIL (cnil.fr).
      </p>
      <h2>Cookies</h2>
      <p>Le service n&apos;utilise que des cookies nécessaires à la connexion et au choix de l&apos;entreprise active. Aucun cookie publicitaire ni de mesure d&apos;audience tierce.</p>
    </LegalPage>
  );
}
