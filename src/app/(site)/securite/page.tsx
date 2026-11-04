import type { Metadata } from "next";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Sécurité et RGPD",
  description: `Hébergement à Paris, cloisonnement des accès par la base de données, double authentification, journal d'audit : les mesures de sécurité d'${brand.name}.`,
};

const sections = [
  {
    t: "Hébergement et chiffrement",
    p: [
      "La base de données et les justificatifs sont hébergés dans l'Union européenne, à Paris, chez Supabase (infrastructure AWS, région eu-west-3). L'application web est servie par Vercel, avec des fonctions exécutées à Paris.",
      "Toutes les communications sont chiffrées (HTTPS, TLS). Les données sont chiffrées au repos par l'hébergeur.",
    ],
  },
  {
    t: "Cloisonnement des accès",
    p: [
      "Les règles d'accès sont appliquées par la base de données elle-même (Row Level Security), et non seulement par l'interface. Même en cas d'erreur dans l'application, un utilisateur ne peut lire que ce que ses droits autorisent.",
      "Un salarié voit ses propres données ; un manager, celles de son équipe ; les RH, celles de l'entreprise. Une entreprise ne voit jamais les données d'une autre.",
      "Aucune écriture directe n'est possible depuis le navigateur : chaque action (demande, validation, ajustement) passe par une fonction contrôlée qui vérifie les droits et applique les règles.",
    ],
  },
  {
    t: "Données de santé",
    p: [
      "Les arrêts maladie et accidents du travail ne sont visibles que par le salarié, sa ligne managériale et les RH. Dans le planning, les collègues voient seulement « Absent ».",
      "Les justificatifs (arrêts de travail, actes) sont stockés dans un espace privé et ne s'ouvrent que par un lien temporaire de 60 secondes.",
    ],
  },
  {
    t: "Comptes et authentification",
    p: [
      "Mots de passe de 10 caractères minimum, jamais stockés en clair. Double authentification par application (code à 6 chiffres), que l'administrateur peut rendre obligatoire pour les RH.",
      "La clé d'administration de la base n'est jamais exposée au serveur web : les opérations sensibles (invitations, réinitialisations) passent par une fonction isolée.",
      "Les liens reçus par e-mail demandent une confirmation par bouton, pour que les antivirus de messagerie ne puissent pas les consommer à votre place.",
    ],
  },
  {
    t: "Traçabilité",
    p: ["Chaque action sensible est enregistrée dans un journal d'audit horodaté : création, validation, refus, annulation, ajustement de compteur, modification des paramètres. Le journal ne peut pas être modifié par les utilisateurs."],
  },
  {
    t: "RGPD",
    p: [
      `${brand.name} agit comme sous-traitant de votre entreprise, qui reste responsable du traitement des données de ses salariés.`,
      "Chaque utilisateur peut télécharger ses données (portabilité). Les anciens salariés peuvent être anonymisés (effacement) tout en conservant les absences nécessaires aux obligations légales. L'espace complet peut être supprimé par l'administrateur.",
      `Pour toute question ou pour obtenir l'accord de sous-traitance (article 28 du RGPD) : ${brand.contactEmail}.`,
    ],
  },
];

export default function Page() {
  return (
    <div className="mx-auto max-w-[860px] px-5 py-16">
      <h1 className="font-condensed text-[3rem] leading-[0.98] font-bold sm:text-[3.6rem]">Sécurité et RGPD</h1>
      <p className="mt-5 text-lg text-ink-soft">
        Soldes de congés, arrêts maladie, contrats : les données RH comptent parmi les plus sensibles de l&apos;entreprise. Voici comment elles sont protégées.
      </p>
      <div className="mt-12 flex flex-col gap-10">
        {sections.map((s) => (
          <section key={s.t}>
            <h2 className="text-2xl font-bold">{s.t}</h2>
            <div className="mt-3 flex flex-col gap-3 text-[17px] leading-relaxed text-ink-soft">
              {s.p.map((x) => (
                <p key={x}>{x}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
