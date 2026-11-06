import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./form";

export const metadata: Metadata = { title: "Créer l'espace de votre entreprise" };

export default async function Page({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  await supabase.rpc("claim_memberships");
  const { count } = await supabase.from("members").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "disabled");
  if ((count ?? 0) > 0 && !sp.nouveau) redirect("/app");
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  return (
    <div className="min-h-dvh bg-surface">
      <header className="px-5 py-5 sm:px-8"><Logo /></header>
      <main className="mx-auto max-w-[520px] px-4 pb-16">
        <div className="rounded-panel border border-line bg-paper p-6 sm:p-8">
          <h1 className="font-condensed text-[2rem] leading-[1.05] font-bold">Votre espace en 1 minute</h1>
          <p className="mt-2 text-[15px] text-muted">
            Les types d&apos;absence courants (congés payés, maladie, événements familiaux...) sont créés automatiquement selon le droit français. Tout reste modifiable ensuite.
          </p>
          <div className="mt-6">
            <OnboardingForm defaults={{ first_name: meta.first_name ?? "", last_name: meta.last_name ?? "", company: meta.company ?? "", sector: meta.sector ?? "general", activity: meta.activity ?? "", size: meta.size ?? "" }} />
          </div>
        </div>
      </main>
    </div>
  );
}
