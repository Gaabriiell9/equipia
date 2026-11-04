import Link from "next/link";
import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireHR } from "@/lib/auth";
import { cn, fmtNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/display";
import type { LeaveType } from "@/lib/types";
import { CounterTools } from "./tools";

export const metadata: Metadata = { title: "Compteurs" };

type Row = { member_id: string; first_name: string; last_name: string; leave_type_id: string; code: string; available: number; pending: number; previous_balance: number; current_balance: number };

function periodStart(kind: "cp" | "civil", startMonth: number, today: string) {
  const [y, m] = today.split("-").map(Number);
  if (kind === "civil" || startMonth === 1) return `${y}-01-01`;
  return m >= startMonth ? `${y}-${String(startMonth).padStart(2, "0")}-01` : `${y - 1}-${String(startMonth).padStart(2, "0")}-01`;
}
const minusYears = (iso: string, n: number) => `${Number(iso.slice(0, 4)) - n}${iso.slice(4)}`;

export default async function Page() {
  const ctx = await requireHR();
  const [{ data: report }, { data: types }] = await Promise.all([
    ctx.supabase.rpc("balances_report", { p_org: ctx.org.id }),
    ctx.supabase.from("leave_types").select("*").eq("org_id", ctx.org.id).eq("deducts_balance", true).eq("active", true).order("position"),
  ]);
  const rows = (report ?? []) as Row[];
  const typeList = (types ?? []) as LeaveType[];
  const members = [...new Map(rows.map((r) => [r.member_id, r])).values()];
  const cell = new Map(rows.map((r) => [`${r.member_id}:${r.leave_type_id}`, r]));

  const periods = typeList.map((t) => {
    const cur = periodStart(t.period_kind, ctx.org.cp_period_start_month, ctx.today);
    return { typeId: t.id, name: t.name, kind: t.period_kind, options: [1, 2, 3].map((n) => minusYears(cur, n)) };
  });
  const cpType = typeList.find((t) => t.category === "paid_leave");
  const lastMonth = (() => {
    const [y, m] = ctx.today.split("-").map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  })();

  return (
    <>
      <PageHeader
        title="Compteurs"
        description="Soldes de tous les salariés. Les acquisitions sont calculées automatiquement le 1er de chaque mois."
        actions={
          <Button asChild variant="outline">
            <Link href="/api/exports/soldes" prefetch={false}>
              <Download /> Exporter les soldes
            </Link>
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[13px] text-muted">
                  <th className="sticky left-0 bg-paper px-5 py-2.5 font-medium">Salarié</th>
                  {typeList.map((t) => (
                    <th key={t.id} className="px-4 py-2.5 text-right font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-[2px]" style={{ background: t.color }} />
                        {t.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.member_id} className="border-b border-line last:border-0 hover:bg-surface/60">
                    <td className="sticky left-0 bg-paper px-5 py-2.5">
                      <Link href={`/app/equipe/${m.member_id}`} className="font-medium hover:underline">
                        {m.first_name} {m.last_name}
                      </Link>
                    </td>
                    {typeList.map((t) => {
                      const c = cell.get(`${m.member_id}:${t.id}`);
                      const proj = (c?.available ?? 0) - (c?.pending ?? 0);
                      return (
                        <td key={t.id} className="tabular px-4 py-2.5 text-right">
                          <span className={cn("font-semibold", proj < 0 && "text-danger")}>{fmtNum(proj)}</span>
                          {t.period_kind === "cp" && c && (
                            <span className="block text-xs text-muted">
                              N-1 {fmtNum(c.previous_balance)}, N {fmtNum(c.current_balance)}
                            </span>
                          )}
                          {c && c.pending > 0 && <span className="block text-xs text-wait">{fmtNum(c.pending)} en attente</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Opérations sur les compteurs" description="Chaque opération affiche d'abord un aperçu. Rien n'est modifié avant votre confirmation." />
          <CounterTools
            lastMonth={lastMonth}
            periods={periods}
            cpPeriods={cpType ? periods.find((p) => p.typeId === cpType.id)!.options : []}
            fractionnementEnabled={ctx.org.fractionnement_enabled}
            cpCounting={ctx.org.cp_counting}
          />
        </Panel>
      </div>
    </>
  );
}
