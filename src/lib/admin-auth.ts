import "server-only";
import { brand } from "./config";

/**
 * Appels à la fonction Edge « admin-auth » (seule détentrice de la clé service_role).
 * Le serveur web n'a jamais accès à la clé d'administration de Supabase.
 */
type LinkType = "signup" | "recovery" | "invite" | "magiclink";

type LinkResult =
  | { ok: true; hashedToken: string; verificationType: string }
  | { ok: false; error: "user_exists" | "not_found" | "failed"; message?: string };

function endpoint() {
  return (
    process.env.SUPABASE_ADMIN_FUNCTION_URL ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-auth`
  );
}

export async function generateLink(p: {
  type: LinkType;
  email: string;
  password?: string;
  data?: Record<string, unknown>;
}): Promise<LinkResult> {
  const secret = process.env.EQUIPIA_EDGE_SECRET;
  if (!secret) return { ok: false, error: "failed", message: "EQUIPIA_EDGE_SECRET manquant" };
  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-equipia-secret": secret },
      body: JSON.stringify({ action: "generate_link", ...p, redirect_to: `${brand.siteUrl}/auth/confirmer` }),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error ?? "failed", message: body.message };
    return { ok: true, hashedToken: body.hashed_token, verificationType: body.verification_type };
  } catch (e) {
    return { ok: false, error: "failed", message: (e as Error).message };
  }
}

export function confirmUrl(hashedToken: string, type: string, next: string) {
  const u = new URL("/auth/confirmer", brand.siteUrl);
  u.searchParams.set("token_hash", hashedToken);
  u.searchParams.set("type", type);
  u.searchParams.set("suite", next);
  return u.toString();
}
