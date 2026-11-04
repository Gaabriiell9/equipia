"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getContext, ORG_COOKIE } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/actions";
import { confirmUrl, generateLink } from "@/lib/admin-auth";
import { inviteEmail, sendEmail } from "@/lib/email";

// Les droits sont vérifiés par chaque fonction de la base (RPC) : ici on récupère seulement la session.
async function hr() {
  return getContext();
}

function done(message?: string): ActionResult {
  revalidatePath("/app", "layout");
  return { ok: true, message };
}

// ------------------------------------------------------------------ démo
export async function removeDemoData(orgId: string): Promise<ActionResult> {
  const ctx = await getContext();
  const { error } = await ctx.supabase.rpc("remove_demo_data", { p_org: orgId });
  return error ? fail(error) : done("Données d'exemple supprimées");
}

export async function addDemoData(): Promise<ActionResult> {
  const ctx = await getContext();
  const { error } = await ctx.supabase.rpc("add_demo_data", { p_org: ctx.org.id });
  return error ? fail(error) : done("Équipe d'exemple ajoutée");
}

// ------------------------------------------------------------------ salariés
export type MemberInput = {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  team_id: string | null;
  manager_id: string | null;
  job_title: string | null;
  contract_type: string;
  hire_date: string | null;
  end_date: string | null;
  employee_number: string | null;
};

export async function sendInvitation(memberId: string): Promise<ActionResult> {
  const ctx = await hr();
  const { data, error } = await ctx.supabase.rpc("prepare_invitation", { p_member: memberId });
  if (error) return fail(error);
  const inv = data as { email: string; first_name: string; org_name: string; inviter: string; existing_user: boolean };
  const link = await generateLink({ type: inv.existing_user ? "magiclink" : "invite", email: inv.email });
  if (!link.ok) {
    console.error("[invitation]", link);
    return { ok: false, error: "L'invitation n'a pas pu être générée. Réessayez dans un instant." };
  }
  try {
    await sendEmail({
      to: inv.email,
      ...inviteEmail({
        link: confirmUrl(link.hashedToken, inv.existing_user ? "magiclink" : "invite", inv.existing_user ? "/app" : "/bienvenue"),
        firstName: inv.first_name,
        orgName: inv.org_name,
        inviter: inv.inviter,
      }),
    });
  } catch (e) {
    console.error("[invitation] e-mail", e);
    return { ok: false, error: "L'e-mail d'invitation n'a pas pu être envoyé." };
  }
  return done(`Invitation envoyée à ${inv.email}`);
}

export async function inviteMember(input: MemberInput, sendNow: boolean): Promise<ActionResult<{ id: string }>> {
  const ctx = await hr();
  const { data, error } = await ctx.supabase.rpc("invite_member", {
    p_org: ctx.org.id,
    p_email: input.email,
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_role: input.role,
    p_team: input.team_id || null,
    p_manager: input.manager_id || null,
    p_job_title: input.job_title || null,
    p_contract_type: input.contract_type || "cdi",
    p_hire_date: input.hire_date || null,
    p_end_date: input.end_date || null,
    p_employee_number: input.employee_number || null,
  });
  if (error) return fail(error);
  const id = (data as { member_id: string }).member_id;
  if (sendNow) {
    const r = await sendInvitation(id);
    if (!r.ok) return { ok: true, data: { id }, message: `Salarié ajouté, mais ${r.error.toLowerCase()}` };
    return { ok: true, data: { id }, message: "Salarié ajouté et invitation envoyée" };
  }
  revalidatePath("/app", "layout");
  return { ok: true, data: { id }, message: "Salarié ajouté" };
}

export async function updateMember(memberId: string, patch: Record<string, unknown>): Promise<ActionResult> {
  const ctx = await hr();
  const { error } = await ctx.supabase.rpc("update_member", { p_member: memberId, p_data: patch });
  return error ? fail(error) : done("Modifications enregistrées");
}

export async function setMemberActive(memberId: string, active: boolean): Promise<ActionResult> {
  const ctx = await hr();
  const { error } = await ctx.supabase.rpc("set_member_status", { p_member: memberId, p_active: active });
  return error ? fail(error) : done(active ? "Salarié réactivé" : "Salarié désactivé");
}

export async function anonymizeMember(memberId: string): Promise<ActionResult> {
  const ctx = await hr();
  const { error } = await ctx.supabase.rpc("anonymize_member", { p_member: memberId });
  return error ? fail(error) : done("Données personnelles anonymisées");
}

export async function adjustBalance(memberId: string, leaveTypeId: string, amount: number, period: "current" | "previous", note: string): Promise<ActionResult> {
  const ctx = await hr();
  const { error } = await ctx.supabase.rpc("adjust_balance", {
    p_org: ctx.org.id,
    p_member: memberId,
    p_leave_type: leaveTypeId,
    p_amount: amount,
    p_period: period,
    p_note: note,
  });
  return error ? fail(error) : done("Compteur ajusté");
}

export type ImportReport = { dry_run: boolean; rows?: number; new?: number; created?: number; updated?: number; errors: { line?: number; email?: string; message: string }[]; new_member_ids?: string[] };

export async function importMembers(rows: Record<string, string>[], dryRun: boolean, invite: boolean): Promise<ActionResult<ImportReport>> {
  const ctx = await hr();
  const { data, error } = await ctx.supabase.rpc("import_members", { p_org: ctx.org.id, p_rows: rows, p_dry_run: dryRun });
  if (error) return fail(error);
  const report = data as ImportReport;
  if (!dryRun && invite && report.new_member_ids?.length) {
    for (const id of report.new_member_ids) await sendInvitation(id);
  }
  revalidatePath("/app", "layout");
  return { ok: true, data: report };
}

// ------------------------------------------------------------------ paramétrage
export async function upsertTeam(id: string | null, name: string, color: string, minPresent: number): Promise<ActionResult> {
  const ctx = await hr();
  const { error } = await ctx.supabase.rpc("upsert_team", { p_org: ctx.org.id, p_id: id, p_name: name, p_color: color, p_min_present: minPresent });
  return error ? fail(error) : done(id ? "Équipe modifiée" : "Équipe créée");
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  const ctx = await hr();
  const { error } = await ctx.supabase.rpc("delete_team", { p_team: id });
  return error ? fail(error) : done("Équipe supprimée");
}

export async function upsertLeaveType(id: string | null, data: Record<string, unknown>): Promise<ActionResult> {
  const ctx = await hr();
  const { error } = await ctx.supabase.rpc("upsert_leave_type", { p_org: ctx.org.id, p_id: id, p_data: data });
  return error ? fail(error) : done(id ? "Type d'absence enregistré" : "Type d'absence créé");
}

export async function updateOrgSettings(data: Record<string, unknown>): Promise<ActionResult> {
  const ctx = await hr();
  const { error } = await ctx.supabase.rpc("update_org_settings", { p_org: ctx.org.id, p_data: data });
  return error ? fail(error) : done("Paramètres enregistrés");
}

export async function deleteOrganization(confirmName: string): Promise<ActionResult> {
  const ctx = await getContext();
  const { error } = await ctx.supabase.rpc("delete_organization", { p_org: ctx.org.id, p_confirm_name: confirmName });
  if (error) return fail(error);
  (await cookies()).delete(ORG_COOKIE);
  redirect("/app");
}

// ------------------------------------------------------------------ compteurs
export async function runAccruals(month: string): Promise<ActionResult> {
  const ctx = await hr();
  const { data, error } = await ctx.supabase.rpc("run_accruals", { p_org: ctx.org.id, p_month: month });
  return error ? fail(error) : done(`${data} acquisition(s) calculée(s)`);
}

export async function computeFractionnement(periodStart: string, apply: boolean): Promise<ActionResult<unknown>> {
  const ctx = await hr();
  const { data, error } = await ctx.supabase.rpc("compute_fractionnement", { p_org: ctx.org.id, p_period_start: periodStart, p_apply: apply });
  if (error) return fail(error);
  if (apply) revalidatePath("/app", "layout");
  return { ok: true, data, message: apply ? "Jours de fractionnement attribués" : undefined };
}

export async function closePeriod(leaveTypeId: string, periodStart: string, apply: boolean): Promise<ActionResult<unknown>> {
  const ctx = await hr();
  const { data, error } = await ctx.supabase.rpc("close_leave_period", { p_org: ctx.org.id, p_leave_type: leaveTypeId, p_period_start: periodStart, p_apply: apply });
  if (error) return fail(error);
  if (apply) revalidatePath("/app", "layout");
  return { ok: true, data, message: apply ? "Période clôturée" : undefined };
}

export async function setHolidayStatus(memberId: string, day: string, status: "off" | "worked" | null): Promise<ActionResult<{ debited: boolean }>> {
  const ctx = await getContext();
  const { data, error } = await ctx.supabase.rpc("set_holiday_status", { p_org: ctx.org.id, p_member: memberId, p_day: day, p_status: status });
  if (error) return fail(error);
  return { ok: true, data: data as { debited: boolean } };
}
