import type { Metadata } from "next";
import { requireHR } from "@/lib/auth";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/display";
import { ExportForm } from "./export-form";

export const metadata: Metadata = { title: "Export paie" };

export default async function Page() {
  const ctx = await requireHR();
  const [y, m] = ctx.today.split("-").map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const first = `${prevY}-${String(prevM).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(prevY, prevM, 0)).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Export paie" description="Les absences validées de la période, prêtes à reporter dans votre logiciel de paie ou à transmettre à votre expert-comptable." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Absences du mois" description="Une ligne par absence, jours recalculés sur la période (absences à cheval incluses). Fériés travaillés inclus." />
          <ExportForm defaultFrom={first} defaultTo={last} />
        </Panel>
        <Panel>
          <PanelHeader title="Soldes de congés" description="Solde N-1, N, acquis et en attente pour chaque salarié et chaque compteur, à la date du jour." />
          <div className="p-5">
            <a href="/api/exports/soldes" className="inline-flex h-10 items-center rounded-ctl border border-line-strong px-4 text-sm font-semibold hover:bg-surface">
              Télécharger les soldes (CSV)
            </a>
            <p className="mt-3 text-[13px] text-muted">Format CSV compatible Excel (séparateur point-virgule). Connecteurs Silae, Sage, PayFit et Pennylane : sur demande.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}
