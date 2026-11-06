import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import type { Team } from "@/lib/types";
import { TeamsManager } from "./manager";
import { isPro } from "@/lib/plan";

export const metadata: Metadata = { title: "Équipes" };

export default async function Page() {
  const ctx = await getContext();
  const [{ data: teams }, { data: members }] = await Promise.all([
    ctx.supabase.from("teams").select("*").eq("org_id", ctx.org.id).order("name"),
    ctx.supabase.from("members").select("team_id").eq("org_id", ctx.org.id).neq("status", "disabled"),
  ]);
  const counts = (members ?? []).reduce<Record<string, number>>((a, m) => {
    if (m.team_id) a[m.team_id] = (a[m.team_id] ?? 0) + 1;
    return a;
  }, {});
  return <TeamsManager teams={(teams ?? []) as Team[]} counts={counts} pro={isPro(ctx.org)} />;
}
