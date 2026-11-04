import type { Metadata } from "next";
import { BookOpenCheck } from "lucide-react";
import { requireApprover } from "@/lib/auth";
import { pendingApprovals, REQUEST_SELECT } from "@/lib/queries";
import { ApprovalCard } from "@/components/app/approval-card";
import { RequestRow, type RequestWithRefs } from "@/components/app/request-row";
import { EmptyState, PageHeader, Panel, PanelHeader } from "@/components/ui/display";
import type { RequestEvaluation } from "@/lib/types";

export const metadata: Metadata = { title: "Validations" };

export default async function Page() {
  const ctx = await requireApprover();
  const [pending, { data: recent }] = await Promise.all([
    pendingApprovals(ctx),
    ctx.supabase
      .from("leave_requests")
      .select(REQUEST_SELECT)
      .eq("org_id", ctx.org.id)
      .or(`decided_by.eq.${ctx.member.id},manager_approved_by.eq.${ctx.member.id}`)
      .neq("member_id", ctx.member.id)
      .order("updated_at", { ascending: false })
      .limit(15),
  ]);
  const insights = await Promise.all(
    pending.map((r) => ctx.supabase.rpc("request_insights", { p_request: r.id }).then((x) => x.data as RequestEvaluation | null)),
  );
  return (
    <>
      <PageHeader
        title="Validations"
        description={
          ctx.org.hr_approval_required
            ? "Double validation active : les demandes validées par un manager passent ensuite aux RH."
            : "Validez ou refusez les demandes de votre équipe. Le salarié est prévenu par e-mail."
        }
      />
      <div className="flex flex-col gap-6">
        <Panel>
          <PanelHeader title={`En attente (${pending.length})`} />
          {pending.length ? (
            pending.map((r, i) => <ApprovalCard key={r.id} r={r} insights={insights[i]} />)
          ) : (
            <EmptyState icon={<BookOpenCheck />} title="Tout est à jour" description="Aucune demande n'attend votre validation." />
          )}
        </Panel>
        {(recent ?? []).length > 0 && (
          <Panel>
            <PanelHeader title="Récemment traitées par vous" />
            {((recent ?? []) as unknown as RequestWithRefs[]).map((r) => (
              <RequestRow key={r.id} r={r} showMember />
            ))}
          </Panel>
        )}
      </div>
    </>
  );
}
