import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import type { LeaveType } from "@/lib/types";
import { LeaveTypesManager } from "./manager";

export const metadata: Metadata = { title: "Types d'absence" };

export default async function Page() {
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("leave_types").select("*").eq("org_id", ctx.org.id).order("position");
  return <LeaveTypesManager types={(data ?? []) as LeaveType[]} hcr={ctx.org.sector === "hcr"} />;
}
