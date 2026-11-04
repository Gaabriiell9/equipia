import { ChevronDown } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  return (
    <div className="divide-y divide-line rounded-[18px] border border-line bg-paper">
      {items.map((it) => (
        <details key={it.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold">
            {it.q}
            <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-soft">{it.a}</div>
        </details>
      ))}
    </div>
  );
}
