import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand, plans, setupOffer, trialDays } from "@/lib/config";
import { cn } from "@/lib/format";

export function PricingCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr_0.9fr]">
      {plans.map((p) => {
        const hl = "highlighted" in p && p.highlighted;
        return (
          <div key={p.id} className={cn("flex flex-col rounded-[18px] border p-6", hl ? "border-ink bg-ink text-white" : "border-line bg-paper")}>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{p.name}</h3>
              {hl && <span className="rounded-chip bg-marker px-2 py-0.5 text-xs font-bold text-ink">Le plus choisi</span>}
            </div>
            <p className={cn("mt-1 text-sm", hl ? "text-white/70" : "text-muted")}>{p.pitch}</p>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="tabular font-condensed text-[3.2rem] leading-none font-bold">{p.price} €</span>
              <span className={cn("text-sm", hl ? "text-white/70" : "text-muted")}>HT / salarié / mois</span>
            </p>
            <p className={cn("mt-1 text-xs", hl ? "text-white/60" : "text-muted")}>{p.minimum}, sans engagement</p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-[15px]">
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
        <h3 className="text-xl font-bold">Plus de 150 salariés</h3>
        <p className="mt-1 text-sm text-muted">Plusieurs établissements, connecteur paie, accompagnement dédié.</p>
        <p className="font-condensed mt-5 text-[2.2rem] leading-none font-bold">Sur devis</p>
        <div className="mt-6 flex-1 rounded-ctl border border-line bg-paper p-4">
          <p className="text-sm font-semibold">{setupOffer.name}</p>
          <p className="tabular mt-0.5 text-lg font-bold">{setupOffer.price}</p>
          <p className="mt-1 text-[13px] text-muted">{setupOffer.description}</p>
          <p className="mt-2 text-xs text-muted">Optionnelle, quelle que soit l&apos;offre.</p>
        </div>
        <Button asChild size="lg" variant="outline" className="mt-7">
          <a href={`mailto:${brand.contactEmail}?subject=Devis%20${encodeURIComponent(brand.name)}`}>Demander un devis</a>
        </Button>
      </div>
    </div>
  );
}
