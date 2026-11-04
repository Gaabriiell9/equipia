"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { confirmUrl, generateLink } from "@/lib/admin-auth";
import { existingAccountEmail, recoveryEmail, sendEmail, signupEmail } from "@/lib/email";
import type { ActionResult } from "@/lib/actions";

function safeNext(v: FormDataEntryValue | string | null | undefined, fallback = "/app") {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

const signupSchema = z.object({
  first_name: z.string().trim().min(1, "Indiquez votre prénom").max(80),
  last_name: z.string().trim().min(1, "Indiquez votre nom").max(80),
  company: z.string().trim().min(2, "Indiquez le nom de votre entreprise").max(120),
  sector: z.enum(["general", "hcr"]),
  size: z.string().max(20).optional(),
  email: z.email("Adresse e-mail invalide").transform((v) => v.toLowerCase()),
  password: z.string().min(10, "10 caractères minimum").max(72),
  cgu: z.literal("on", { message: "Acceptez les conditions pour continuer" }),
});

export async function signUp(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (formData.get("website")) return { ok: true }; // piège à robots
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Vérifiez les champs indiqués.", fieldErrors };
  }
  const v = parsed.data;
  const link = await generateLink({
    type: "signup",
    email: v.email,
    password: v.password,
    data: { first_name: v.first_name, last_name: v.last_name, company: v.company, sector: v.sector, size: v.size ?? null },
  });
  try {
    if (link.ok) {
      await sendEmail({ to: v.email, ...signupEmail(confirmUrl(link.hashedToken, "signup", "/onboarding"), v.first_name) });
    } else if (link.error === "user_exists") {
      const magic = await generateLink({ type: "magiclink", email: v.email });
      if (magic.ok) await sendEmail({ to: v.email, ...existingAccountEmail(confirmUrl(magic.hashedToken, "magiclink", "/app")) });
    } else {
      console.error("[inscription]", link);
      return { ok: false, error: "Le service d'inscription est momentanément indisponible. Réessayez dans quelques minutes." };
    }
  } catch (e) {
    console.error("[inscription] e-mail", e);
    return { ok: false, error: "L'e-mail de confirmation n'a pas pu être envoyé. Réessayez dans quelques minutes." };
  }
  return { ok: true, message: v.email };
}

export async function signIn(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("suite"));
  if (!email || !password) return { ok: false, error: "Indiquez votre e-mail et votre mot de passe." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed")
      return { ok: false, error: "Confirmez d'abord votre adresse grâce au lien reçu par e-mail." };
    if (error.status === 429) return { ok: false, error: "Trop de tentatives. Patientez quelques minutes." };
    return { ok: false, error: "E-mail ou mot de passe incorrect." };
  }
  await supabase.rpc("claim_memberships");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/connexion/verification?suite=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export async function requestPasswordReset(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { ok: false, error: "Adresse e-mail invalide." };
  const link = await generateLink({ type: "recovery", email });
  if (link.ok) {
    try {
      await sendEmail({ to: email, ...recoveryEmail(confirmUrl(link.hashedToken, "recovery", "/nouveau-mot-de-passe")) });
    } catch (e) {
      console.error("[mot de passe] e-mail", e);
    }
  }
  // Même réponse que le compte existe ou non (pas d'énumération des comptes)
  return { ok: true, message: email };
}

const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email"] as const;

export async function confirmToken(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = String(formData.get("type") ?? "") as (typeof OTP_TYPES)[number];
  const next = safeNext(formData.get("suite"));
  if (!tokenHash || !OTP_TYPES.includes(type)) return { ok: false, error: "Lien invalide." };
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    return {
      ok: false,
      error:
        type === "recovery"
          ? "Ce lien a expiré ou a déjà servi. Demandez un nouveau lien de réinitialisation."
          : "Ce lien a expiré ou a déjà servi. Connectez-vous ou demandez un nouveau lien.",
    };
  }
  await supabase.rpc("claim_memberships");
  redirect(next);
}

export async function updatePassword(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = safeNext(formData.get("suite"));
  if (password.length < 10) return { ok: false, error: "Le mot de passe doit contenir au moins 10 caractères." };
  if (password !== confirm) return { ok: false, error: "Les deux mots de passe ne correspondent pas." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "Choisissez un mot de passe différent de l'actuel." };
    if (error.code === "weak_password") return { ok: false, error: "Mot de passe trop faible : mélangez lettres, chiffres et symboles." };
    return { ok: false, error: "Session expirée : redemandez un lien par e-mail." };
  }
  await supabase.rpc("claim_memberships");
  redirect(next);
}

export async function verifyMfa(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(formData.get("suite"));
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Saisissez les 6 chiffres affichés par votre application." };
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === "verified");
  if (!factor) redirect(next);
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { ok: false, error: "Code incorrect ou expiré. Réessayez avec le code suivant." };
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
