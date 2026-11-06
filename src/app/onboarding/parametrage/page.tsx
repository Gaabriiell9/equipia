import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/auth";
import { isPro } from "@/lib/plan";
import type { Team } from "@/lib/types";
import { SetupWizard, type SetupMember } from "./wizard";

export const metadata: Metadata = { title: "Paramétrer votre entreprise" };

export default async function Page({ searchParams }: { searchParams: Promise<{ etape?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  if (!ctx.isAdmin) redirect("/app");
  const step = Math.min(4, Math.max(1, Number(sp.etape ?? 1) || 1));
  const [{ data: teams }, { data: members }] = await Promise.all([
    ctx.supabase.from("teams").select("*").eq("org_id", ctx.org.id).order("name"),
    ctx.supabase
      .from("members")
      .select("id, first_name, last_name, email, role, team_id, manager_id, status, is_demo")
      .eq("org_id", ctx.org.id)
      .neq("status", "disabled")
      .eq("is_demo", false)
      .order("created_at"),
  ]);
  return (
    <SetupWizard
      step={step}
      org={ctx.org}
      pro={isPro(ctx.org)}
      meId={ctx.member.id}
      teams={(teams ?? []) as Team[]}
      members={(members ?? []) as SetupMember[]}
    />
  );
}
