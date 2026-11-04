import { brand } from "@/lib/config";
import { cn } from "@/lib/format";

/** Marque : une grille de planning 3 x 2 dont une case est surlignée */
export function LogoMark({ className, invert }: { className?: string; invert?: boolean }) {
  const cell = invert ? "#ffffff" : "#14213d";
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect x="1" y="4" width="6" height="7" rx="1.5" fill={cell} opacity="0.9" />
      <rect x="9" y="4" width="6" height="7" rx="1.5" fill="#f2c230" />
      <rect x="17" y="4" width="6" height="7" rx="1.5" fill={cell} opacity="0.9" />
      <rect x="1" y="13" width="6" height="7" rx="1.5" fill={cell} opacity="0.9" />
      <rect x="9" y="13" width="6" height="7" rx="1.5" fill={cell} opacity="0.9" />
      <rect x="17" y="13" width="6" height="7" rx="1.5" fill={cell} opacity="0.35" />
    </svg>
  );
}

export function Logo({ className, invert }: { className?: string; invert?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark invert={invert} />
      <span className={cn("text-[1.2rem] font-bold tracking-[-0.01em]", invert ? "text-white" : "text-ink")}>{brand.name}</span>
    </span>
  );
}
