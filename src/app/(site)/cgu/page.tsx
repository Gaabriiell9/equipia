import type { Metadata } from "next";
import { LegalPage, ToFill } from "@/components/site/legal";
import { brand, trialDays } from "@/lib/config";

export const metadata: Metadata = { title: "Conditions générales" };

export default function Page() {
  return (
    <LegalPage title="Conditions générales d'utilisation et de vente" updated="4 novembre 2026">
      <p>
        Modèle à faire valider par un professionnel du droit avant la commercialisation. Les passages <ToFill>surlignés</ToFill> sont à compléter.
      </p>
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions encadrent l&apos;accès au service {brand.name}, logiciel en ligne de gestion des congés et absences, édité par {brand.legalEntity}, par des clients professionnels (entreprises, associations, établissements).
      </p>
      <h2>2. Compte et accès</h2>
      <p>
        Le client crée un espace entreprise et désigne un ou plusieurs administrateurs, responsables des accès accordés à ses salariés. Chaque utilisateur garde ses identifiants confidentiels et active la double authentification lorsqu&apos;elle est exigée.
      </p>
      <h2>3. Essai gratuit</h2>
      <p>L&apos;essai dure {trialDays} jours, avec l&apos;ensemble des fonctionnalités, sans moyen de paiement. Il ne se transforme pas automatiquement en abonnement payant.</p>
      <h2>4. Prix et paiement</h2>
      <p>
        Les prix sont indiqués hors taxes sur la page Tarifs, par salarié actif et par mois, avec un minimum mensuel. La facturation est mensuelle, payable à <ToFill>30 jours</ToFill>. Tout retard entraîne des pénalités au taux légal et l&apos;indemnité forfaitaire de 40 € pour frais de recouvrement.
      </p>
      <h2>5. Durée et résiliation</h2>
      <p>L&apos;abonnement est sans engagement et résiliable à tout moment avec effet à la fin du mois en cours. Le client peut exporter ses données avant la suppression de son espace.</p>
      <h2>6. Obligations du client</h2>
      <p>
        Le client reste responsable des règles de congés qu&apos;il paramètre, des informations saisies et de leur conformité à sa convention collective et à ses accords. Les calculs fournis par le service sont une aide à la gestion et doivent être vérifiés avant leur report en paie.
      </p>
      <h2>7. Disponibilité et support</h2>
      <p>
        L&apos;éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité du service, hors maintenance et incidents des hébergeurs. Support par e-mail à {brand.supportEmail}, réponse sous <ToFill>2 jours ouvrés</ToFill>.
      </p>
      <h2>8. Données personnelles</h2>
      <p>Les conditions de traitement sont décrites dans la politique de confidentialité et, pour les données des salariés, dans l&apos;accord de sous-traitance.</p>
      <h2>9. Responsabilité</h2>
      <p>
        La responsabilité de l&apos;éditeur est limitée aux dommages directs et plafonnée aux sommes versées par le client au cours des <ToFill>12 derniers mois</ToFill>.
      </p>
      <h2>10. Droit applicable</h2>
      <p>Droit français. En cas de litige, et après tentative de règlement amiable, compétence des tribunaux de <ToFill>ville</ToFill>.</p>
    </LegalPage>
  );
}
