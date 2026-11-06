import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireHR } from "@/lib/auth";
import { PageHeader } from "@/components/ui/display";
import { SettingsTabs } from "./tabs";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const ctx = await requireHR();
  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Les règles appliquées à toute l'entreprise. Chaque modification est tracée dans le journal d'audit."
        actions={
          ctx.isAdmin ? (
            <Button asChild variant="outline">
              <Link href="/onboarding/parametrage">Assistant de paramétrage</Link>
            </Button>
          ) : undefined
        }
      />
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </>
  );
}
