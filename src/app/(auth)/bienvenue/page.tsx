import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard, NewPasswordForm } from "../forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  await supabase.rpc("claim_memberships");
  const { data: m } = await supabase
    .from("members")
    .select("first_name, organizations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const orgName = (m?.organizations as unknown as { name: string } | null)?.name;
  const firstName = m?.first_name ?? (user.user_metadata?.first_name as string | undefined);
  return (
    <AuthCard
      title={firstName ? `Bienvenue ${firstName}` : "Bienvenue"}
      description={
        orgName
          ? `Choisissez votre mot de passe pour accéder à l'espace ${orgName}.`
          : "Adresse confirmée. Choisissez votre mot de passe, puis vous créerez l'espace de votre entreprise."
      }
    >
      <NewPasswordForm next="/app" cta={orgName ? "Accéder à mon espace" : "Continuer"} />
    </AuthCard>
  );
}
