import "server-only";
import type { AppContext } from "./auth";
import type { Balance, CalendarRow } from "./types";
import type { RequestWithRefs } from "@/components/app/request-row";

export const REQUEST_SELECT =
  "*, leave_types(name, color, code, requires_attachment, reasons), member:members!leave_requests_member_id_fkey(first_name, last_name)";

export async function myBalances(ctx: AppContext, memberId?: string) {
  const { data } = await ctx.supabase.rpc("member_balances", { p_org: ctx.org.id, p_member: memberId ?? null });
  return (data ?? []) as Balance[];
}

export async function pendingApprovals(ctx: AppContext, limit = 50) {
  let q = ctx.supabase
    .from("leave_requests")
    .select(REQUEST_SELECT)
    .eq("org_id", ctx.org.id)
    .eq("status", "pending")
    .neq("member_id", ctx.member.id)
    .order("start_date")
    .limit(limit);
  if (!ctx.isHR) q = q.eq("step", "manager");
  const { data } = await q;
  return (data ?? []) as unknown as RequestWithRefs[];
}

export async function calendar(ctx: AppContext, from: string, to: string) {
  const { data } = await ctx.supabase.rpc("team_calendar", { p_org: ctx.org.id, p_from: from, p_to: to });
  return (data ?? []) as CalendarRow[];
}
