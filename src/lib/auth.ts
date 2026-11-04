import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { todayIn } from "./format";
import type { Member, Organization } from "./types";

export const ORG_COOKIE = "equipia_org";

export type Membership = Member & { organizations: Organization };

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

async function loadMemberships(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("members")
    .select("*, organizations(*)")
    .eq("user_id", userId)
    .neq("status", "disabled")
    .order("created_at");
  return (data ?? []) as Membership[];
}

/**
 * Contexte de l'utilisateur connecté dans l'espace /app.
 * Redirige vers la connexion, la double authentification ou l'onboarding si nécessaire.
 */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Double authentification : si un facteur est enrôlé, la session doit être de niveau aal2
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect("/connexion/verification");

  let memberships = await loadMemberships(supabase, user.id);
  if (memberships.length === 0) {
    const { data: claimed } = await supabase.rpc("claim_memberships");
    if (claimed && claimed > 0) memberships = await loadMemberships(supabase, user.id);
  }
  if (memberships.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const wanted = cookieStore.get(ORG_COOKIE)?.value;
  const current = memberships.find((m) => m.org_id === wanted) ?? memberships[0];
  const org = current.organizations;
  const { count: reports } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("manager_id", current.id)
    .neq("status", "disabled");

  const isHR = current.role === "hr" || current.role === "admin";
  const isAdmin = current.role === "admin";
  const isManager = current.role === "manager" || (reports ?? 0) > 0;
  const mfaEnrolled = aal?.nextLevel === "aal2";

  const mfaMissing = org.mfa_required && isHR && !mfaEnrolled;
  if (mfaMissing) {
    const path = (await headers()).get("x-pathname") ?? "";
    if (path.startsWith("/app") && !path.startsWith("/app/profil")) redirect("/app/profil?mfa=obligatoire");
  }

  return {
    supabase,
    user,
    member: current as Member,
    org,
    memberships,
    isHR,
    isAdmin,
    isManager,
    canApprove: isHR || isManager,
    reportsCount: reports ?? 0,
    today: todayIn(org.timezone),
    mfaEnrolled,
    mfaMissing,
  };
});

export type AppContext = Awaited<ReturnType<typeof getContext>>;

export async function requireHR() {
  const ctx = await getContext();
  if (!ctx.isHR) redirect("/app");
  return ctx;
}

export async function requireApprover() {
  const ctx = await getContext();
  if (!ctx.canApprove) redirect("/app");
  return ctx;
}
