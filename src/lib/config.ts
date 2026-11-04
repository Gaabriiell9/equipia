// Identité du produit : modifier ici pour renommer l'application partout.
export const brand = {
  name: "Équipia",
  tagline: "Les congés de votre équipe, sans fichier Excel ni e-mails perdus.",
  legalEntity: "GF Web",
  contactEmail: "contact@gf-web.fr",
  supportEmail: "contact@gf-web.fr",
  // Sur Vercel, l'URL de production est fournie automatiquement tant qu'aucune n'est fixée
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
};

export const plans = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: 3,
    unit: "€ HT / salarié / mois",
    minimum: "29 € HT minimum par mois",
    pitch: "Pour arrêter les e-mails et les fichiers Excel.",
    features: [
      "Demandes et validation en un clic",
      "Calcul automatique des soldes (CP, RTT, récupération)",
      "Calendrier d'équipe et effectif minimum",
      "Notifications e-mail et flux agenda (Google, Outlook)",
      "Export des absences pour la paie (CSV)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 5,
    unit: "€ HT / salarié / mois",
    minimum: "49 € HT minimum par mois",
    pitch: "Pour les RH qui veulent tout contrôler.",
    highlighted: true,
    features: [
      "Tout Essentiel",
      "Double validation manager puis RH",
      "Pack hôtellerie-restauration (6 fériés garantis, 1er mai, saisonniers)",
      "Fractionnement et clôture des périodes assistés",
      "Import de vos salariés et reprise des soldes",
      "Double authentification obligatoire et journal d'audit",
    ],
  },
] as const;

export const setupOffer = {
  name: "Mise en route accompagnée",
  price: "490 € HT",
  description: "Paramétrage de vos règles, import des salariés et des soldes, formation des managers en visio (1 h).",
};

export const trialDays = 30;
