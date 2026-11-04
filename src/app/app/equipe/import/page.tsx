import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireHR } from "@/lib/auth";
import { PageHeader } from "@/components/ui/display";
import { ImportWizard } from "./wizard";

export const metadata: Metadata = { title: "Importer des salariés" };

export default async function Page() {
  const ctx = await requireHR();
  return (
    <>
      <PageHeader
        back={
          <Link href="/app/equipe" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Salariés
          </Link>
        }
        title="Importer vos salariés"
        description="Depuis un export de votre logiciel de paie ou un fichier Excel enregistré en CSV. Les soldes de congés peuvent être repris en même temps."
      />
      <ImportWizard hcr={ctx.org.sector === "hcr"} />
    </>
  );
}
