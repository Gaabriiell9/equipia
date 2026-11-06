import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getContext } from "@/lib/auth";
import { myBalances } from "@/lib/queries";
import { PageHeader } from "@/components/ui/display";
import type { LeaveType, Member } from "@/lib/types";
import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "Poser une absence" };

export default async function Page({ searchParams }: { searchParams: Promise<{ pour?: string; du?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const [{ data: types }, balances, { data: members }] = await Promise.all([
    ctx.supabase.from("leave_types").select("*").eq("org_id", ctx.org.id).eq("active", true).order("position"),
    myBalances(ctx),
    ctx.canApprove
      ? ctx.supabase.from("members").select("id, first_name, last_name, manager_id, status").eq("org_id", ctx.org.id).neq("status", "disabled").order("last_name")
      : Promise.resolve({ data: [] }),
  ]);

  // Personnes pour lesquelles l'utilisateur peut poser une absence : lui-même, ses équipes (ou tout le monde pour les RH)
  const all = (members ?? []) as Pick<Member, "id" | "first_name" | "last_name" | "manager_id">[];
  let allowed = all;
  if (!ctx.isHR) {
    const ids = new Set<string>([ctx.member.id]);
    let added = true;
    while (added) {
      added = false;
      for (const m of all) if (m.manager_id && ids.has(m.manager_id) && !ids.has(m.id)) { ids.add(m.id); added = true; }
    }
    allowed = all.filter((m) => ids.has(m.id));
  }
  const people = [
    { id: ctx.member.id, name: `${ctx.member.first_name} ${ctx.member.last_name}` },
    ...allowed.filter((m) => m.id !== ctx.member.id).map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` })),
  ];
  const initial = people.some((p) => p.id === sp.pour) ? sp.pour! : ctx.member.id;

  return (
    <>
      <PageHeader
        back={
          <Link href="/app/absences" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Absences
          </Link>
        }
        title="Poser une absence"
        description="Le nombre de jours et votre solde sont calculés automatiquement, jours fériés compris."
      />
      <RequestForm
        orgId={ctx.org.id}
        me={ctx.member.id}
        people={people}
        initialMember={initial}
        types={(types ?? []) as LeaveType[]}
        balances={balances}
        today={ctx.today}
        initialStart={/^\d{4}-\d{2}-\d{2}$/.test(sp.du ?? "") ? sp.du : undefined}
        canActForOthers={ctx.canApprove}
      />
    </>
  );
}
