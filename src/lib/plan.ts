import type { Organization } from "./types";

// L'essai, l'offre Pro et le sur-mesure donnent accès à toutes les fonctionnalités.
export function isPro(org: Pick<Organization, "plan">) {
  return org.plan !== "essentiel";
}
