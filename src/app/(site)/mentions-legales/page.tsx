import type { Metadata } from "next";
import { LegalPage, ToFill } from "@/components/site/legal";
import { brand } from "@/lib/config";

export const metadata: Metadata = { title: "Mentions légales" };

export default function Page() {
  return (
    <LegalPage title="Mentions légales" updated="4 novembre 2026">
      <h2>Éditeur</h2>
      <p>
        {brand.name} est un service édité par <strong>{brand.legalEntity}</strong>, entreprise individuelle (micro-entreprise), <ToFill>nom et prénom de l&apos;exploitant</ToFill>,
        SIRET <ToFill>numéro SIRET</ToFill>, <ToFill>adresse du siège</ToFill>.
      </p>
      <p>Contact : {brand.contactEmail}. Directeur de la publication : <ToFill>nom du responsable</ToFill>.</p>
      <p>TVA : <ToFill>TVA non applicable, art. 293 B du CGI, ou numéro de TVA intracommunautaire</ToFill>.</p>
      <h2>Hébergement</h2>
      <p>
        Application web : Vercel Inc., <ToFill>adresse</ToFill>, vercel.com. Fonctions exécutées dans la région de Paris.
      </p>
      <p>
        Base de données et fichiers : Supabase Inc., <ToFill>adresse</ToFill>, supabase.com. Données hébergées dans l&apos;Union européenne (région Paris, eu-west-3).
      </p>
      <p>Envoi des e-mails : Resend, resend.com.</p>
      <h2>Propriété intellectuelle</h2>
      <p>
        Le service, sa marque, ses textes et son code sont la propriété de l&apos;éditeur. Toute reproduction sans autorisation est interdite.
      </p>
    </LegalPage>
  );
}
