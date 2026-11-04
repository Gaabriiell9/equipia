import { cn, fmtNum, periodLabel } from "@/lib/format";
import type { Balance } from "@/lib/types";

export function BalanceCards({ balances: all, compact }: { balances: Balance[]; compact?: boolean }) {
  // Les compteurs vides et inutilisés (hors congés payés) sont masqués pour alléger l'écran
  const balances = all.filter((b) => b.category === "paid_leave" || b.available !== 0 || b.pending !== 0 || b.periods.some((p) => p.acquired !== 0 || p.taken !== 0));
  if (!balances.length) return null;
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4")}>
      {balances.map((b) => (
        <div key={b.leave_type_id} className="rounded-panel border border-line bg-paper p-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px]" style={{ background: b.color }} aria-hidden />
            <span className="truncate text-sm font-semibold text-ink-soft">{b.name}</span>
          </div>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className={cn("tabular text-[2.1rem] leading-none font-bold", b.projected < 0 ? "text-danger" : "text-ink")}>
              {fmtNum(b.projected)}
            </span>
            <span className="text-sm text-muted">{Math.abs(b.projected) <= 1 ? "jour" : "jours"}</span>
          </p>
          <p className="mt-1.5 text-xs text-muted">
            {b.pending > 0 ? `disponibles après ${fmtNum(b.pending)} j en attente` : "disponibles"}
            {b.counting === "ouvrables" ? ", en jours ouvrables" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Détail des compteurs par période (N-1, N) */
export function BalanceTable({ balances }: { balances: Balance[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[13px] text-muted">
            <th className="px-5 py-2.5 font-medium">Compteur</th>
            <th className="px-3 py-2.5 font-medium">Période</th>
            <th className="px-3 py-2.5 text-right font-medium">Acquis</th>
            <th className="px-3 py-2.5 text-right font-medium">Pris</th>
            <th className="px-3 py-2.5 text-right font-medium">Autres</th>
            <th className="px-5 py-2.5 text-right font-medium">Solde</th>
          </tr>
        </thead>
        <tbody>
          {balances.flatMap((b) =>
            b.periods.map((p, i) => (
              <tr key={`${b.leave_type_id}-${p.period_start}`} className="border-b border-line last:border-0">
                <td className="px-5 py-2.5">
                  {i === 0 && (
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="size-2.5 rounded-[3px]" style={{ background: b.color }} aria-hidden />
                      {b.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-ink-soft">
                  {periodLabel(p.period_start, b.period_kind)}
                  {p.is_current && <span className="ml-1.5 text-xs text-muted">(en cours)</span>}
                </td>
                <td className="tabular px-3 py-2.5 text-right">{fmtNum(p.acquired)}</td>
                <td className="tabular px-3 py-2.5 text-right">{fmtNum(p.taken)}</td>
                <td className="tabular px-3 py-2.5 text-right text-muted">{p.other ? fmtNum(p.other) : ""}</td>
                <td className={cn("tabular px-5 py-2.5 text-right font-semibold", p.balance < 0 && "text-danger")}>{fmtNum(p.balance)}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
