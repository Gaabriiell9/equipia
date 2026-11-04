import type { Metadata } from "next";
import { requireApprover } from "@/lib/auth";
import { PageHeader } from "@/components/ui/display";
import type { Member, MemberContract, Team } from "@/lib/types";
import { TeamDirectory } from "./directory";

export const metadata: Metadata = { title: "Salariés" };

export default async function Page() {
  const ctx = await requireApprover();
  const [{ data: members }, { data: teams }, { data: contracts }] = await Promise.all([
    ctx.supabase.from("members").select("*").eq("org_id", ctx.org.id).order("last_name"),
    ctx.supabase.from("teams").select("id, name, color").eq("org_id", ctx.org.id).order("name"),
    ctx.supabase.from("member_contracts").select("member_id, contract_type, end_date").eq("org_id", ctx.org.id),
  ]);
  return (
    <>
      <PageHeader
        title={ctx.isHR ? "Salariés" : "Mon équipe"}
        description={ctx.isHR ? "Ajoutez vos salariés, organisez les équipes et la validation des absences." : "Les personnes de l'entreprise et leur équipe."}
      />
      <TeamDirectory
        members={(members ?? []) as Member[]}
        teams={(teams ?? []) as Pick<Team, "id" | "name" | "color">[]}
        contracts={(contracts ?? []) as Pick<MemberContract, "member_id" | "contract_type" | "end_date">[]}
        isHR={ctx.isHR}
        isAdmin={ctx.isAdmin}
        meId={ctx.member.id}
      />
    </>
  );
}
