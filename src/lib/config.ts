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
    pitch: "La solution simple pour centraliser les congés de votre équipe.",
    lead: "Inclus",
    features: [
      "Demandes depuis le téléphone, validation en un clic",
      "Soldes calculés selon le Code du travail (CP, RTT, récupération)",
      "Planning d'équipe partagé, arrêts maladie confidentiels",
      "Notifications e-mail et synchronisation agenda",
      "Import des salariés et reprise des soldes",
      "Export des absences pour la paie (CSV)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 5,
    unit: "€ HT / salarié / mois",
    minimum: "49 € HT minimum par mois",
    pitch: "Gardez le contrôle total sur vos validations, règles et exports paie.",
    lead: "Tout Essentiel, plus",
    highlighted: true,
    features: [
      "Double validation manager puis RH",
      "Effectif minimum par équipe, alerte avant chaque validation",
      "Règles avancées : délai de prévenance, solde négatif autorisé",
      "Fractionnement et clôture des périodes assistés",
      "Tableau de bord RH : absentéisme, congés à provisionner",
      "Pack hôtellerie-restauration (6 fériés garantis, 1er mai)",
      "Double authentification obligatoire et journal d'audit",
      "Support prioritaire (réponse sous 4 h ouvrées)",
    ],
  },
] as const;

export const customPlan = {
  name: "Sur mesure",
  audience: "Plus de 150 salariés ou plusieurs sites",
  pitch: "Pour les structures multi-sites nécessitant une intégration paie sur-mesure.",
  features: ["Tout Pro", "Plusieurs établissements, consolidation des exports", "Connecteur vers votre logiciel de paie", "Interlocuteur dédié et formation des équipes"],
};

// Comparatif détaillé (page Tarifs)
export const featureMatrix: { group: string; rows: [string, boolean | string, boolean | string][] }[] = [
  {
    group: "Congés au quotidien",
    rows: [
      ["Demandes depuis le téléphone, validation en un clic", true, true],
      ["Soldes calculés automatiquement (CP, RTT, récupération)", true, true],
      ["Jours fériés et demi-journées décomptés", true, true],
      ["Planning d'équipe, motifs sensibles masqués", true, true],
      ["Notifications e-mail, flux agenda Google et Outlook", true, true],
      ["Import des salariés et reprise des soldes", true, true],
    ],
  },
  {
    group: "Contrôle et règles",
    rows: [
      ["Validation par le manager", true, true],
      ["Double validation manager puis RH", false, true],
      ["Effectif minimum par équipe, alerte avant validation", false, true],
      ["Délai de prévenance et solde négatif autorisé", false, true],
      ["Fractionnement et clôture de période assistés", false, true],
      ["Pack hôtellerie-restauration (convention HCR)", false, true],
    ],
  },
  {
    group: "Paie et pilotage",
    rows: [
      ["Export mensuel des absences (CSV)", true, true],
      ["Tableau de bord RH : absentéisme, congés à provisionner", false, true],
    ],
  },
  {
    group: "Sécurité",
    rows: [
      ["Hébergement en France, chiffrement, outils RGPD", true, true],
      ["Double authentification pour chaque compte", true, true],
      ["Double authentification obligatoire pour les RH", false, true],
      ["Journal d'audit consultable", false, true],
    ],
  },
  {
    group: "Accompagnement",
    rows: [["Support par e-mail", "Sous 48 h", "Prioritaire, sous 4 h ouvrées"]],
  },
];

export const setupOffer = {
  name: "Mise en route accompagnée",
  price: "490 € HT",
  description: "Paramétrage de vos règles, import des salariés et des soldes, formation des managers en visio (1 h).",
};

export const trialDays = 30;
