import { Check } from "lucide-react";
import { cn } from "@/lib/format";

// Planning de démonstration (données fictives) animé en CSS, sans JavaScript.
const days = [
  { d: 9, w: "L" }, { d: 10, w: "M" }, { d: 11, w: "M", holiday: true }, { d: 12, w: "J" }, { d: 13, w: "V" },
  { d: 14, w: "S" }, { d: 15, w: "D", off: true }, { d: 16, w: "L" }, { d: 17, w: "M" }, { d: 18, w: "M" },
];

type Block = { from: number; to: number; color: string; label?: string; muted?: boolean };
const teams: { name: string; min: number; color: string; people: { name: string; blocks: Block[]; julie?: boolean }[] }[] = [
  {
    name: "Commercial",
    min: 2,
    color: "#7c3aed",
    people: [
      { name: "Karim", blocks: [] },
      { name: "Julie", blocks: [], julie: true },
      { name: "Thomas", blocks: [{ from: 0, to: 1, color: "#94a3b8", label: "Absent", muted: true }] },
    ],
  },
  {
    name: "Support client",
    min: 2,
    color: "#0891b2",
    people: [
      { name: "Sophie", blocks: [] },
      { name: "Lucas", blocks: [{ from: 7, to: 9, color: "#2563eb" }] },
      { name: "Emma", blocks: [{ from: 3, to: 3, color: "#059669" }] },
    ],
  },
];

const COL = "grid-cols-[72px_repeat(10,minmax(0,1fr))] sm:grid-cols-[96px_repeat(10,minmax(0,1fr))]";

function Bar({ b, className }: { b: Block; className?: string }) {
  return (
    <div
      className={cn("absolute inset-y-[7px] rounded-[5px]", className)}
      style={{
        left: `calc(${(b.from / 10) * 100}% + 2px)`,
        width: `calc(${((b.to - b.from + 1) / 10) * 100}% - 4px)`,
        background: b.color,
        opacity: b.muted ? 0.55 : 0.92,
      }}
    />
  );
}

export function HeroPlanning() {
  return (
    <div className="relative" aria-label="Exemple de planning d'équipe : la demande de congés de Julie est validée par Karim" role="img">
      <div className="rounded-[18px] border border-line bg-paper p-3 shadow-[0_24px_60px_-20px_rgba(13,23,48,0.28)] sm:p-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-sm font-bold">Planning, 9 au 18 novembre</span>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="size-1.5 rounded-full bg-marker-strong" /> 11 nov. férié
          </span>
        </div>
        <div className={cn("grid border-b border-line pb-1.5 text-center", COL)}>
          <span />
          {days.map((x) => (
            <span key={x.d} className={cn("text-[11px] leading-tight", x.off ? "text-faint" : "text-muted")}>
              {x.w}
              <span className={cn("tabular block text-[13px] font-semibold", x.holiday ? "text-marker-strong" : "text-ink-soft")}>{x.d}</span>
            </span>
          ))}
        </div>
        {teams.map((t) => (
          <div key={t.name}>
            <div className="bg-surface py-1">
              <span className="flex items-center gap-1.5 pl-1 text-xs font-semibold whitespace-nowrap">
                <span className="size-1.5 rounded-full" style={{ background: t.color }} />
                {t.name}
                <span className="font-normal text-muted">min. {t.min}</span>
              </span>
            </div>
            {t.people.map((p) => (
              <div key={p.name} className={cn("grid h-10 items-center border-b border-line last:border-0", COL)}>
                <span className="truncate pl-1 text-[13px] font-medium">{p.name}</span>
                <div className="relative col-span-10 h-full">
                  <div className="absolute inset-0 grid grid-cols-10">
                    {days.map((x) => (
                      <span key={x.d} className={cn("border-l border-line", (x.off || x.holiday) && "bg-surface")} />
                    ))}
                  </div>
                  {p.blocks.map((b, i) => (
                    <Bar key={i} b={b} />
                  ))}
                  {p.julie && (
                    <>
                      <div
                        className="hero-pending pending-stripes absolute inset-y-[7px] rounded-[5px] border-2"
                        style={{ left: "calc(30% + 2px)", width: "calc(30% - 4px)", color: "#2563eb", borderColor: "#2563eb", background: "#2563eb1f" }}
                      />
                      <Bar b={{ from: 3, to: 5, color: "#2563eb" }} className="hero-approved" />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2 w-3.5 rounded-[2px] bg-[#2563eb]" />Congés payés</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-3.5 rounded-[2px] bg-[#059669]" />Télétravail</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-3.5 rounded-[2px] bg-[#94a3b8]" />Absent (motif confidentiel)</span>
        </div>
      </div>

      {/* Bulle de demande puis validation */}
      <div className="hero-callout relative mx-auto mt-3 w-full max-w-[300px] rounded-panel border border-line bg-paper p-3.5 shadow-[0_16px_40px_-12px_rgba(13,23,48,0.3)] xl:absolute xl:top-[19%] xl:-right-16 xl:mt-0 xl:w-[220px]">
        <p className="text-[13px] font-semibold">Julie demande 3 jours</p>
        <p className="text-xs text-muted">Congés payés, du jeu. 12 au sam. 14</p>
        <div className="mt-2.5 flex items-center justify-between rounded-ctl bg-surface px-2.5 py-1.5 text-xs">
          <span className="text-muted">Solde ensuite</span>
          <span className="relative font-bold tabular">
            <span className="hero-balance-old">18 j</span>
            <span className="hero-balance-new absolute inset-0 text-right">15 j</span>
          </span>
        </div>
        <div className="hero-stamp mt-2.5 flex items-center gap-1.5 rounded-ctl bg-ok-soft px-2.5 py-1.5 text-xs font-semibold text-ok">
          <Check className="size-3.5" /> Validé par Karim, effectif commercial respecté
        </div>
      </div>
    </div>
  );
}
