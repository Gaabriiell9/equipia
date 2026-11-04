export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

type PgError = { message?: string; code?: string; details?: string | null };

/** Transforme une erreur Supabase/Postgres en message lisible pour l'utilisateur */
export function readableError(error: unknown): string {
  const e = error as PgError;
  if (!e) return "Une erreur inattendue est survenue.";
  if (e.code === "P0001" || e.code === "42501") return e.message ?? "Action impossible.";
  if (e.code === "23505") return "Cette valeur existe déjà.";
  if (e.code === "23514" || e.code === "22P02" || e.code === "22007" || e.code === "22008")
    return "Certaines valeurs saisies sont invalides.";
  if (e.code === "PGRST202") return "Fonction indisponible : la base n'est pas à jour.";
  console.error("[erreur]", e);
  return "Une erreur inattendue est survenue. Réessayez dans un instant.";
}

export function fail(error: unknown): { ok: false; error: string } {
  return { ok: false, error: readableError(error) };
}
