"use server";

import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/actions";
import { sendNotificationEmails } from "@/lib/email";
import type { NotifyPayload, RequestEvaluation } from "@/lib/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export type RequestInput = {
  leaveTypeId: string;
  start: string;
  end: string;
  startHalf: "full" | "pm";
  endHalf: "full" | "am";
  memberId?: string | null;
  comment?: string;
  reasonCode?: string | null;
  attachmentPath?: string | null;
};

function valid(i: RequestInput) {
  return DATE.test(i.start) && DATE.test(i.end) && ["full", "pm"].includes(i.startHalf) && ["full", "am"].includes(i.endHalf);
}

export async function previewRequest(i: RequestInput): Promise<ActionResult<RequestEvaluation>> {
  if (!valid(i)) return { ok: false, error: "Dates invalides." };
  const ctx = await getContext();
  const { data, error } = await ctx.supabase.rpc("preview_leave_request", {
    p_org: ctx.org.id,
    p_leave_type: i.leaveTypeId,
    p_start: i.start,
    p_end: i.end,
    p_start_half: i.startHalf,
    p_end_half: i.endHalf,
    p_member: i.memberId ?? null,
  });
  if (error) return fail(error);
  return { ok: true, data: data as RequestEvaluation };
}

export async function submitRequest(i: RequestInput): Promise<ActionResult<{ id: string; status: string; warnings: string[] }>> {
  if (!valid(i)) return { ok: false, error: "Dates invalides." };
  const ctx = await getContext();
  const { data, error } = await ctx.supabase.rpc("submit_leave_request", {
    p_org: ctx.org.id,
    p_leave_type: i.leaveTypeId,
    p_start: i.start,
    p_end: i.end,
    p_start_half: i.startHalf,
    p_end_half: i.endHalf,
    p_comment: i.comment?.slice(0, 1000) || null,
    p_member: i.memberId ?? null,
    p_reason_code: i.reasonCode || null,
    p_attachment_path: i.attachmentPath || null,
  });
  if (error) return fail(error);
  const r = data as { id: string; status: string; warnings: string[]; emails: NotifyPayload[] };
  await sendNotificationEmails(r.emails);
  revalidatePath("/app", "layout");
  return { ok: true, data: { id: r.id, status: r.status, warnings: r.warnings ?? [] } };
}

export async function decideRequest(id: string, approve: boolean, comment?: string): Promise<ActionResult> {
  const ctx = await getContext();
  const { data, error } = await ctx.supabase.rpc("decide_leave_request", {
    p_request: id,
    p_approve: approve,
    p_comment: comment?.slice(0, 1000) || null,
  });
  if (error) return fail(error);
  const r = data as { status: string; emails: NotifyPayload[] };
  await sendNotificationEmails(r.emails);
  revalidatePath("/app", "layout");
  return {
    ok: true,
    message: !approve ? "Demande refusée" : r.status === "pending" ? "Validée, transmise aux RH" : "Demande validée",
  };
}

export async function cancelRequest(id: string, reason?: string): Promise<ActionResult> {
  const ctx = await getContext();
  const { data, error } = await ctx.supabase.rpc("cancel_leave_request", { p_request: id, p_reason: reason?.slice(0, 1000) || null });
  if (error) return fail(error);
  await sendNotificationEmails((data as { emails: NotifyPayload[] }).emails);
  revalidatePath("/app", "layout");
  return { ok: true, message: "Absence annulée" };
}

export async function setAttachment(id: string, path: string | null): Promise<ActionResult> {
  const ctx = await getContext();
  const { error } = await ctx.supabase.rpc("set_request_attachment", { p_request: id, p_path: path });
  if (error) return fail(error);
  revalidatePath(`/app/demandes/${id}`);
  return { ok: true, message: path ? "Justificatif ajouté" : "Justificatif retiré" };
}
