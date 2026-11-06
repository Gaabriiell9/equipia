import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/format";

export function ProBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-chip bg-marker-soft px-1.5 py-0.5 text-[11px] font-bold text-wait", className)}>
      <Sparkles className="size-3" /> Pro
    </span>
  );
}

// Encadré affiché à la place d'une fonctionnalité réservée à l'offre Pro
export function ProUpsell({ title, description, className }: { title: string; description: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-panel border border-marker/50 bg-marker-soft/40 p-5 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <p className="flex items-center gap-2 font-semibold">
          {title} <ProBadge />
        </p>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">{description}</p>
      </div>
      <Link href="/tarifs" className="shrink-0 text-sm font-semibold text-ink underline underline-offset-4">
        Voir l&apos;offre Pro
      </Link>
    </div>
  );
}
