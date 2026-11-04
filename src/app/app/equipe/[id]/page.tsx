import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Plus } from "lucide-react";
import { requireApprover } from "@/lib/auth";
import { myBalances, REQUEST_SELECT } from "@/lib/queries";
import { contractLabels, fmtDate, fmtDateTime, roleLabels } from "@/lib/format";
import { Avatar, Badge, PageHeader, Panel, PanelHeader } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { BalanceTable } from "@/components/app/balances";
import { LedgerHistory } from "@/components/app/ledger";
import { RequestRow, type RequestWithRefs } from "@/components/app/request-row";
import type { LedgerEntry, LeaveType, Member, MemberContract, Team } from "@/lib/types";
import { MemberAdmin } from "./member-admin";

export const metadata: Metadata = { title: "Fiche salarié" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ctx = await requireApprover();
  const { data: m } = await ctx.supabase.from("members").select("*").eq("id", id).eq("org_id", ctx.org.id).maybeSingle();
  if (!m) notFound();
  const member = m as Member;
  const { data: contract } = await ctx.supabase.from("member_contracts").select("*").eq("member_id", id).maybeSingle();
  const canSeePrivate = !!contract || ctx.isHR || member.id === ctx.member.id;

  const [balances, { data: reqs }, { data: ledger }, { data: teams }, { data: all }, { data: types }] = await Promise.all([
    canSeePrivate ? myBalances(ctx, id) : Promise.resolve([]),
    ctx.supabase.from("leave_requests").select(REQUEST_SELECT).eq("member_id", id).order("start_date", { ascending: false }).limit(50),
    ctx.supabase.from("leave_ledger").select("*, leave_types(name, color)").eq("member_id", id).order("created_at", { ascending: false }).limit(40),
    ctx.supabase.from("teams").select("id, name").eq("org_id", ctx.org.id).order("name"),
    ctx.supabase.from("members").select("id, first_name, last_name, status").eq("org_id", ctx.org.id).neq("status", "disabled").order("last_name"),
    ctx.supabase.from("leave_types").select("id, name, deducts_balance, active").eq("org_id", ctx.org.id).eq("deducts_balance", true).eq("active", true).order("position"),
  ]);
  const c = contract as MemberContract | null;
  const team = (teams ?? []).find((t) => t.id === member.team_id) as Pick<Team, "id" | "name"> | undefined;
  const manager = (all ?? []).find((x) => x.id === member.manager_id);

  return (
    <>
      <PageHeader
        back={
          <Link href="/app/equipe" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Salariés
          </Link>
        }
        title={
          <span className="flex items-center gap-3">
            <Avatar first={member.first_name} last={member.last_name} size="lg" />
            {member.first_name} {member.last_name}
          </span>
        }
        description={[member.job_title, team?.name, roleLabels[member.role]].filter(Boolean).join(", ")}
        actions={
          member.status !== "disabled" && canSeePrivate ? (
            <Button asChild>
              <Link href={`/app/absences/nouvelle?pour=${member.id}`}>
                <Plus /> Poser une absence
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {canSeePrivate && balances.length > 0 && (
            <Panel>
              <PanelHeader title="Compteurs" />
              <BalanceTable balances={balances} />
            </Panel>
          )}
          <Panel>
            <PanelHeader title="Absences" />
            {(reqs ?? []).length ? (
              ((reqs ?? []) as unknown as RequestWithRefs[]).map((r) => <RequestRow key={r.id} r={r} />)
            ) : (
              <p className="px-5 py-6 text-sm text-muted">{canSeePrivate ? "Aucune absence enregistrée." : "Vous n'avez pas accès aux absences de cette personne."}</p>
            )}
          </Panel>
          {canSeePrivate && (
            <Panel>
              <PanelHeader title="Mouvements des compteurs" />
              <LedgerHistory entries={(ledger ?? []) as unknown as (LedgerEntry & { leave_types: { name: string; color: string } | null })[]} />
            </Panel>
          )}
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <Panel className="p-5">
            <dl className="flex flex-col gap-3 text-sm">
              <Row k="E-mail" v={member.email.endsWith(".invalid") ? "Salarié fictif" : member.email} />
              <Row k="Manager" v={manager ? `${manager.first_name} ${manager.last_name}` : "Aucun : validation par les RH"} />
              {c && <Row k="Contrat" v={`${contractLabels[c.contract_type] ?? c.contract_type}${c.weekly_hours ? `, ${c.weekly_hours} h/semaine` : ""}`} />}
              {c?.hire_date && <Row k="Entrée" v={fmtDate(c.hire_date)} />}
              {c?.end_date && <Row k="Fin de contrat" v={fmtDate(c.end_date)} />}
              {c?.employee_number && <Row k="Matricule" v={c.employee_number} />}
              <Row
                k="Compte"
                v={
                  member.status === "active" ? (
                    <Badge tone="ok">Activé{member.joined_at ? ` le ${fmtDate(member.joined_at, "d MMM yyyy")}` : ""}</Badge>
                  ) : member.status === "disabled" ? (
                    <Badge>Désactivé</Badge>
                  ) : member.is_demo ? (
                    <Badge tone="marker">Salarié fictif</Badge>
                  ) : (
                    <Badge tone="wait">{member.invited_at ? `Invité le ${fmtDateTime(member.invited_at)}` : "Pas encore invité"}</Badge>
                  )
                }
              />
            </dl>
          </Panel>
          {ctx.isHR && (
            <MemberAdmin
              member={member}
              contract={c}
              teams={(teams ?? []) as Pick<Team, "id" | "name">[]}
              managers={(all ?? []).map((x) => ({ id: x.id, name: `${x.first_name} ${x.last_name}` }))}
              types={(types ?? []) as Pick<LeaveType, "id" | "name">[]}
              isAdmin={ctx.isAdmin}
              isSelf={member.id === ctx.member.id}
            />
          )}
        </aside>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{k}</dt>
      <dd className="mt-0.5 break-words">{v}</dd>
    </div>
  );
}
