import { cn, fmtDate, fmtNum } from "@/lib/format";
import type { LedgerEntry } from "@/lib/types";

const kindLabels: Record<string, string> = {
  opening: "Reprise de solde",
  accrual: "Acquisition",
  adjustment: "Ajustement RH",
  request: "Absence",
  request_cancel: "Annulation",
  carryover: "Report",
  expiry: "Jours perdus",
  fractionnement: "Fractionnement",
  holiday_off: "Férié chômé",
};

export function LedgerHistory({ entries }: { entries: (LedgerEntry & { leave_types: { name: string; color: string } | null })[] }) {
  if (!entries.length) return <p className="px-5 py-6 text-sm text-muted">Aucun mouvement pour l&apos;instant.</p>;
  return (
    <ul>
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-3 border-b border-line px-5 py-2.5 text-sm last:border-0">
          <span className="size-2 shrink-0 rounded-[2px]" style={{ background: e.leave_types?.color }} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate">
              <span className="font-medium">{kindLabels[e.kind] ?? e.kind}</span>
              <span className="text-muted"> : {e.leave_types?.name}</span>
            </span>
            {e.note && <span className="block truncate text-xs text-muted">{e.note}</span>}
          </span>
          <span className="hidden text-xs text-muted sm:inline">{fmtDate(e.created_at, "d MMM yyyy")}</span>
          <span className={cn("tabular w-16 text-right font-semibold", Number(e.amount) < 0 ? "text-ink-soft" : "text-ok")}>
            {Number(e.amount) > 0 ? "+" : ""}
            {fmtNum(Number(e.amount))}
          </span>
        </li>
      ))}
    </ul>
  );
}
