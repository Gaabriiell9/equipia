"use server";

import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/actions";

export async function updateProfile(firstName: string, lastName: string, notifyEmail: boolean): Promise<ActionResult> {
  const ctx = await getContext();
  const { error } = await ctx.supabase.rpc("update_my_profile", {
    p_org: ctx.org.id,
    p_first_name: firstName,
    p_last_name: lastName,
    p_notify_email: notifyEmail,
  });
  if (error) return fail(error);
  revalidatePath("/app", "layout");
  return { ok: true, message: "Profil enregistré" };
}

export async function markNotificationsRead(ids?: string[]): Promise<ActionResult> {
  const ctx = await getContext();
  const { error } = await ctx.supabase.rpc("mark_notifications_read", { p_org: ctx.org.id, p_ids: ids ?? null });
  if (error) return fail(error);
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function rotateCalendarToken(): Promise<ActionResult<string>> {
  const ctx = await getContext();
  const { data, error } = await ctx.supabase.rpc("my_calendar_token", { p_org: ctx.org.id, p_rotate: true });
  if (error) return fail(error);
  revalidatePath("/app/profil");
  return { ok: true, data: data as string, message: "Nouveau lien d'agenda créé, l'ancien ne fonctionne plus" };
}
