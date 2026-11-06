import Link from "next/link";
import { ChevronRight, Paperclip } from "lucide-react";
import { StatusBadge, TypeDot } from "@/components/ui/display";
import { fmtNum, rangeLabel } from "@/lib/format";
import type { LeaveRequest } from "@/lib/types";

export type RequestWithRefs = LeaveRequest & {
  leave_types: { name: string; color: string; code: string; requires_attachment?: boolean; reasons?: { code: string; label: string }[] } | null;
  member?: { first_name: string; last_name: string } | null;
};

export function RequestRow({ r, showMember }: { r: RequestWithRefs; showMember?: boolean }) {
  return (
    <Link
      href={`/app/demandes/${r.id}`}
      className="flex items-center gap-3 border-b border-line px-5 py-3.5 transition-colors last:border-0 hover:bg-surface/60"
    >
      <TypeDot color={r.leave_types?.color ?? "#94a3b8"} className="size-3" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink">
          {showMember && r.member ? `${r.member.first_name} ${r.member.last_name} : ` : ""}
          {r.leave_types?.name}
        </p>
        <p className="truncate text-[13px] text-muted">
          {rangeLabel(r.start_date, r.start_half, r.end_date, r.end_half)}
        </p>
      </div>
      {r.attachment_path && <Paperclip className="size-4 text-faint" aria-label="Justificatif joint" />}
      <span className="tabular hidden text-sm text-ink-soft sm:inline">{fmtNum(r.days)} j</span>
      <StatusBadge status={r.status} step={r.step} />
      <ChevronRight className="size-4 text-faint" />
    </Link>
  );
}
