import { requireHR } from "@/lib/auth";
import { PageHeader } from "@/components/ui/display";
import { SettingsTabs } from "./tabs";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireHR();
  return (
    <>
      <PageHeader title="Paramètres" description="Les règles appliquées à toute l'entreprise. Chaque modification est tracée dans le journal d'audit." />
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </>
  );
}
