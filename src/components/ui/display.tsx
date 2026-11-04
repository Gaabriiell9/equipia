import * as React from "react";
import { cn, initials, statusLabels } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-panel border border-line bg-paper", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back}
        <h1 className="font-condensed text-[2rem] leading-[1.05] font-bold tracking-[-0.01em] text-ink sm:text-[2.4rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 text-faint [&_svg]:size-8">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const statusStyle: Record<RequestStatus, string> = {
  pending: "bg-wait-soft text-wait",
  approved: "bg-ok-soft text-ok",
  rejected: "bg-danger-soft text-danger",
  cancelled: "bg-surface text-muted",
};

export function StatusBadge({ status, step }: { status: RequestStatus; step?: string | null }) {
  const label = status === "pending" && step === "hr" ? "En attente RH" : statusLabels[status];
  return (
    <span className={cn("inline-flex h-6 items-center rounded-chip px-2 text-xs font-semibold whitespace-nowrap", statusStyle[status])}>
      {label}
    </span>
  );
}

export function Badge({ className, tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "marker" | "ok" | "danger" | "wait" | "dark" }) {
  const tones = {
    neutral: "bg-surface text-ink-soft",
    marker: "bg-marker-soft text-ink",
    ok: "bg-ok-soft text-ok",
    danger: "bg-danger-soft text-danger",
    wait: "bg-wait-soft text-wait",
    dark: "bg-ink text-white",
  };
  return (
    <span
      className={cn("inline-flex h-6 items-center gap-1 rounded-chip px-2 text-xs font-semibold whitespace-nowrap", tones[tone], className)}
      {...props}
    />
  );
}

export function TypeDot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-[3px]", className)} style={{ background: color }} aria-hidden />;
}

export function Avatar({ first, last, size = "md", className }: { first: string; last: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "size-7 text-[11px]", md: "size-9 text-[13px]", lg: "size-14 text-lg" };
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-navy-700 font-semibold text-white", sizes[size], className)}
      aria-hidden
    >
      {initials(first, last)}
    </span>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "warn" }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={cn("tabular text-[1.75rem] leading-none font-bold text-ink", tone === "warn" && "text-wait")}>{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
