"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ORG_COOKIE } from "@/lib/auth";
import { fail, type ActionResult } from "@/lib/actions";
import { activityIds } from "@/lib/activities";

export async function createOrganization(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const raw = String(formData.get("activity") ?? "");
  const activity = (activityIds as readonly string[]).includes(raw) ? raw : "autre";
  const { data, error } = await supabase.rpc("create_organization", {
    p_name: String(formData.get("company") ?? ""),
    p_sector: activity === "hcr" ? "hcr" : "general",
    p_first_name: String(formData.get("first_name") ?? "").trim() || "Administrateur",
    p_last_name: String(formData.get("last_name") ?? "").trim() || "Principal",
    p_size: String(formData.get("size") ?? "") || null,
    p_region: String(formData.get("region") ?? "metropole"),
    p_with_demo: formData.get("demo") === "on",
  });
  if (error) return fail(error);
  await supabase.rpc("set_org_activity", { p_org: data as string, p_activity: activity });
  (await cookies()).set(ORG_COOKIE, data as string, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  redirect("/onboarding/parametrage");
}
