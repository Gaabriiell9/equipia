import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/app/shell-actions";

export const metadata: Metadata = { title: "Accès désactivé", robots: { index: false } };

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  const { count } = await supabase.from("members").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "disabled");
  if ((count ?? 0) > 0) redirect("/app");
  const { data } = await supabase.rpc("my_removed_orgs");
  const orgs = ((data ?? []) as { org_name: string }[]).map((o) => o.org_name);
  if (orgs.length === 0) redirect("/onboarding");
  const names = orgs.length === 1 ? orgs[0] : orgs.slice(0, -1).join(", ") + " et " + orgs[orgs.length - 1];

  return (
    <div className="w-full max-w-[440px] rounded-panel border border-line bg-paper p-6 text-center sm:p-8">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface">
        <UserX className="size-7 text-ink-soft" />
      </span>
      <h1 className="font-condensed mt-5 text-[2rem] leading-[1.05] font-bold">Votre accès a été désactivé</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        {names} a retiré votre compte de son espace. Vous ne pouvez plus consulter le planning ni poser d&apos;absence.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        Vos absences et vos soldes restent conservés par l&apos;entreprise. Pour toute question (solde de tout compte, attestation, erreur), contactez votre responsable ou le service RH.
      </p>
      <p className="mt-3 text-sm text-muted">Un e-mail de confirmation vous a été envoyé ({user.email}).</p>
      <form action={signOutAction} className="mt-6">
        <Button type="submit" size="lg" variant="dark" className="w-full">
          Se déconnecter
        </Button>
      </form>
    </div>
  );
}
