import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck2, Plus } from "lucide-react";
import { getContext } from "@/lib/auth";
import { myBalances, REQUEST_SELECT } from "@/lib/queries";
import { BalanceCards, BalanceTable } from "@/components/app/balances";
import { RequestRow, type RequestWithRefs } from "@/components/app/request-row";
import { LedgerHistory } from "@/components/app/ledger";
import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import type { LedgerEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Absences" };

export default async function Page() {
  const ctx = await getContext();
  const [balances, { data: reqs }, { data: ledger }] = await Promise.all([
    myBalances(ctx),
    ctx.supabase.from("leave_requests").select(REQUEST_SELECT).eq("member_id", ctx.member.id).order("start_date", { ascending: false }).limit(200),
    ctx.supabase
      .from("leave_ledger")
      .select("*, leave_types(name, color)")
      .eq("member_id", ctx.member.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  const rows = (reqs ?? []) as unknown as RequestWithRefs[];
  const upcoming = rows.filter((r) => r.end_date >= ctx.today && (r.status === "pending" || r.status === "approved")).reverse();
  const history = rows.filter((r) => !upcoming.includes(r));

  return (
    <>
      <PageHeader
        title="Absences"
        description="Vos demandes, vos soldes et l'historique de vos compteurs."
        actions={
          <Button asChild size="lg">
            <Link href="/app/absences/nouvelle">
              <Plus /> Poser une absence
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        <BalanceCards balances={balances} />

        <Panel>
          <PanelHeader title="À venir et en cours" />
          {upcoming.length ? (
            upcoming.map((r) => <RequestRow key={r.id} r={r} />)
          ) : (
            <EmptyState icon={<CalendarCheck2 />} title="Aucune absence à venir" description="Vos demandes en attente et vos congés validés apparaîtront ici." />
          )}
        </Panel>

        {balances.length > 0 && (
          <Panel>
            <PanelHeader title="Compteurs par période" description="Les jours de la période la plus ancienne sont consommés en premier." />
            <BalanceTable balances={balances} />
          </Panel>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel className="self-start">
            <PanelHeader title="Historique des demandes" />
            {history.length ? history.map((r) => <RequestRow key={r.id} r={r} />) : <p className="px-5 py-6 text-sm text-muted">Aucune demande passée.</p>}
          </Panel>
          <Panel className="self-start">
            <PanelHeader title="Mouvements des compteurs" description="Acquisitions mensuelles, prises, ajustements des RH." />
            <LedgerHistory entries={(ledger ?? []) as unknown as (LedgerEntry & { leave_types: { name: string; color: string } | null })[]} />
          </Panel>
        </div>
      </div>
    </>
  );
}
