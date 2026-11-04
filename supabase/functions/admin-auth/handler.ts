// Fonction Edge « admin-auth » : génère les liens d'authentification (inscription, invitation,
// réinitialisation, connexion par lien) avec la clé service_role, qui ne quitte jamais Supabase.
// Appelée uniquement par le serveur Next.js, authentifié par un secret partagé.
import { createClient } from "npm:@supabase/supabase-js@2";

const LINK_TYPES = new Set(["signup", "recovery", "invite", "magiclink"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function serviceKey(): string | undefined {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
    return keys.default ?? Object.values(keys)[0];
  } catch {
    return undefined;
  }
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

let cachedSecret: string | null = null;

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = serviceKey();
  if (!url || !key) return json({ error: "misconfigured" }, 500);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Secret partagé : variable d'environnement, sinon coffre-fort de la base (vault)
  if (!cachedSecret) {
    cachedSecret = Deno.env.get("EQUIPIA_EDGE_SECRET") ?? null;
    if (!cachedSecret) {
      const { data } = await admin.rpc("get_app_secret", { p_name: "edge_shared_secret" });
      cachedSecret = (data as string | null) ?? null;
    }
  }
  const provided = req.headers.get("x-equipia-secret") ?? "";
  if (!cachedSecret || !safeEqual(provided, cachedSecret)) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  if (body.action === "generate_link") {
    const type = String(body.type ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!LINK_TYPES.has(type) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "bad_request" }, 400);

    // Un compte non confirmé n'a encore aucune valeur : on le supprime avant d'émettre un nouveau lien,
    // pour qu'aucun mot de passe choisi par un tiers ne survive à la confirmation par le vrai titulaire.
    const { data: st } = await admin.rpc("auth_user_status", { p_email: email });
    let status = (st as { id: string; confirmed: boolean } | null) ?? null;
    if (status && !status.confirmed && type !== "recovery") {
      await admin.auth.admin.deleteUser(status.id);
      status = null;
    }

    // Aucun mot de passe n'est jamais fixé ici : il est choisi après la preuve de possession de l'e-mail.
    let linkType = type;
    if (type === "signup") {
      if (status) return json({ error: "user_exists" }, 422);
      linkType = "invite";
    } else if (type === "invite") {
      if (status) linkType = "magiclink";
    } else if (!status) {
      return json({ error: "not_found" }, 404);
    }

    // deno-lint-ignore no-explicit-any
    const { data, error } = await admin.auth.admin.generateLink({
      type: linkType,
      email,
      options: { redirectTo: body.redirect_to, data: body.data ?? undefined },
    } as any);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) return json({ error: "user_exists" }, 422);
      if (msg.includes("not found") || msg.includes("no user")) return json({ error: "not_found" }, 404);
      return json({ error: "failed", message: error.message }, 500);
    }
    return json({
      hashed_token: data.properties?.hashed_token,
      verification_type: linkType,
      user_id: data.user?.id,
    });
  }

  if (body.action === "delete_user") {
    const id = String(body.user_id ?? "");
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return json({ error: "failed", message: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
}
