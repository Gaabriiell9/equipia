// Secteurs d'activité proposés à l'inscription. Seul « hcr » active le pack convention HCR.
export const activities = [
  { id: "services", label: "Bureaux, conseil, services", teams: ["Direction", "Commercial", "Administration", "Support client"] },
  { id: "commerce", label: "Commerce, distribution", teams: ["Magasin", "Caisse", "Réserve", "Administration"] },
  { id: "industrie", label: "Industrie, production", teams: ["Production", "Maintenance", "Qualité", "Logistique"] },
  { id: "btp", label: "BTP, artisanat", teams: ["Chantier", "Atelier", "Bureau d'études", "Administration"] },
  { id: "transport", label: "Transport, logistique", teams: ["Conduite", "Entrepôt", "Exploitation", "Administration"] },
  { id: "sante", label: "Santé, médico-social", teams: ["Soins", "Accueil", "Administration", "Services généraux"] },
  { id: "associatif", label: "Association, éducation, culture", teams: ["Animation", "Accueil", "Administration"] },
  { id: "hcr", label: "Hôtellerie, restauration (convention HCR)", teams: ["Cuisine", "Salle", "Réception", "Étages", "Bar"] },
  { id: "autre", label: "Autre secteur", teams: ["Direction", "Administration", "Production", "Commercial"] },
] as const;

export type ActivityId = (typeof activities)[number]["id"];

export const activityIds = activities.map((a) => a.id) as [ActivityId, ...ActivityId[]];

export function teamSuggestions(activity: string | null | undefined, sector: string) {
  const a = activities.find((x) => x.id === activity) ?? activities.find((x) => x.id === (sector === "hcr" ? "hcr" : "autre"))!;
  return [...a.teams];
}
