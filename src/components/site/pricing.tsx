import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand, customPlan, featureMatrix, plans, setupOffer, trialDays } from "@/lib/config";
import { cn } from "@/lib/format";

export function PricingCards() {
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((p) => {
          const hl = "highlighted" in p && p.highlighted;
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col rounded-[18px] border p-6 transition-transform duration-200 hover:-translate-y-0.5",
                hl ? "border-ink bg-ink text-white shadow-[0_24px_50px_-24px_rgba(13,23,48,0.55)]" : "border-line bg-paper",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{p.name}</h3>
                {hl && <span className="rounded-chip bg-marker px-2 py-0.5 text-xs font-bold text-ink">Recommandé</span>}
              </div>
              <p className={cn("mt-1.5 min-h-[2.75rem] text-[15px] leading-snug", hl ? "text-white/75" : "text-ink-soft")}>{p.pitch}</p>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="tabular font-condensed text-[3.2rem] leading-none font-bold">{p.price} €</span>
                <span className={cn("text-sm", hl ? "text-white/70" : "text-muted")}>HT / salarié / mois</span>
              </p>
              <p className={cn("mt-1 text-xs", hl ? "text-white/60" : "text-muted")}>{p.minimum}, sans engagement</p>
              <p className={cn("mt-6 text-sm font-semibold", hl ? "text-marker" : "text-ink")}>{p.lead}</p>
              <ul className="mt-3 flex flex-1 flex-col gap-2.5 text-[15px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className={cn("mt-0.5 size-4 shrink-0", hl ? "text-marker" : "text-ok")} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" variant={hl ? "primary" : "dark"} className="mt-7">
                <Link href="/inscription">Essayer {trialDays} jours gratuitement</Link>
              </Button>
            </div>
          );
        })}
        <div className="flex flex-col rounded-[18px] border border-line bg-surface p-6">
          <h3 className="text-xl font-bold">{customPlan.name}</h3>
          <p className="mt-1.5 min-h-[2.75rem] text-[15px] leading-snug text-ink-soft">{customPlan.pitch}</p>
          <p className="font-condensed mt-5 text-[3.2rem] leading-none font-bold">Sur devis</p>
          <p className="mt-1 text-xs text-muted">{customPlan.audience}</p>
          <p className="mt-6 text-sm font-semibold">Pour aller plus loin</p>
          <ul className="mt-3 flex flex-1 flex-col gap-2.5 text-[15px]">
            {customPlan.features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-ok" />
                {f}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" variant="outline" className="mt-7">
            <a href={`mailto:${brand.contactEmail}?subject=Devis%20${encodeURIComponent(brand.name)}`}>Demander un devis</a>
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-[18px] border border-dashed border-line-strong px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">
            {setupOffer.name}, <span className="tabular">{setupOffer.price}</span> une seule fois
          </p>
          <p className="mt-0.5 text-sm text-muted">{setupOffer.description} Optionnelle, avec n&apos;importe quelle offre.</p>
        </div>
        <Button asChild variant="outline">
          <a href={`mailto:${brand.contactEmail}?subject=Mise%20en%20route%20${encodeURIComponent(brand.name)}`}>Être accompagné</a>
        </Button>
      </div>
    </div>
  );
}

function Cell({ v, pro }: { v: boolean | string; pro?: boolean }) {
  if (typeof v === "string") return <span className={cn("text-sm", pro && "font-semibold")}>{v}</span>;
  return v ? (
    <Check className={cn("mx-auto size-5", pro ? "text-ink" : "text-ok")} aria-label="Inclus" />
  ) : (
    <Minus className="mx-auto size-4 text-faint" aria-label="Non inclus" />
  );
}

export function FeatureComparison() {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-line bg-paper">
      <table className="w-full min-w-[560px] text-left text-[15px]">
        <thead>
          <tr className="border-b border-line">
            <th className="px-5 py-4 font-medium text-muted">Fonctionnalité</th>
            <th className="w-36 px-3 py-4 text-center font-bold">Essentiel</th>
            <th className="w-36 bg-marker-soft px-3 py-4 text-center font-bold">Pro</th>
          </tr>
        </thead>
        {featureMatrix.map((g) => (
          <tbody key={g.group}>
            <tr>
              <th colSpan={3} className="bg-surface px-5 py-2.5 text-sm font-semibold">
                {g.group}
              </th>
            </tr>
            {g.rows.map(([label, ess, pro]) => (
              <tr key={label} className="border-t border-line">
                <td className="px-5 py-3 text-ink-soft">{label}</td>
                <td className="px-3 py-3 text-center">
                  <Cell v={ess} />
                </td>
                <td className="bg-marker-soft/50 px-3 py-3 text-center">
                  <Cell v={pro} pro />
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
