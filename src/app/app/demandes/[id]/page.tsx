import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Paperclip } from "lucide-react";
import { getContext } from "@/lib/auth";
import { REQUEST_SELECT } from "@/lib/queries";
import { fmtDateTime, fmtNum, rangeLabel } from "@/lib/format";
import { Avatar, PageHeader, Panel, PanelHeader, StatusBadge, TypeDot } from "@/components/ui/display";
import type { RequestWithRefs } from "@/components/app/request-row";
import type { LeaveType, Member, RequestEvaluation } from "@/lib/types";
import { RequestActions } from "./request-actions";

export const metadata: Metadata = { title: "Demande d'absence" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nouveau?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ctx = await getContext();
  const { data } = await ctx.supabase.from("leave_requests").select(REQUEST_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as unknown as RequestWithRefs;
  const ids = [r.created_by, r.manager_approved_by, r.decided_by, r.cancelled_by].filter(Boolean) as string[];
  const [{ data: people }, { data: type }, insights, { count: otherHr }] = await Promise.all([
    ctx.supabase.from("members").select("id, first_name, last_name, manager_id").in("id", [...ids, r.member_id]),
    ctx.supabase.from("leave_types").select("*").eq("id", r.leave_type_id).maybeSingle(),
    ctx.supabase.rpc("request_insights", { p_request: id }).then((x) => (x.data as RequestEvaluation | null)),
    ctx.supabase.from("members").select("id", { count: "exact", head: true }).eq("org_id", ctx.org.id).in("role", ["hr", "admin"]).eq("status", "active").neq("id", ctx.member.id),
  ]);
  const byId = new Map(((people ?? []) as Pick<Member, "id" | "first_name" | "last_name" | "manager_id">[]).map((m) => [m.id, m]));
  const name = (mid: string | null) => {
    const m = mid ? byId.get(mid) : null;
    return m ? `${m.first_name} ${m.last_name}` : "un utilisateur";
  };
  const lt = type as LeaveType | null;
  const isSelf = r.member_id === ctx.member.id;
  const reason = lt?.reasons?.find((x) => x.code === r.reason_code);

  const soleAdmin = ctx.isAdmin && (otherHr ?? 0) === 0;
  const canDecide =
    r.status === "pending" &&
    (!isSelf || soleAdmin) &&
    (ctx.isHR || (r.step === "manager" && ctx.canApprove));
  const canCancel =
    (r.status === "pending" || r.status === "approved") &&
    (ctx.isHR || !isSelf || r.status === "pending" || r.start_date > ctx.today);

  const timeline = [
    { at: r.created_at, text: `Demande créée par ${r.created_by === r.member_id ? name(r.member_id) : name(r.created_by)}` },
    r.manager_approved_at && r.manager_approved_at !== r.decided_at ? { at: r.manager_approved_at, text: `Validée par le manager (${name(r.manager_approved_by)})` } : null,
    r.decided_at && r.status === "approved" ? { at: r.decided_at, text: r.decided_by ? `Validée par ${name(r.decided_by)}` : "Enregistrée automatiquement (sans validation)" } : null,
    r.decided_at && r.status === "rejected" ? { at: r.decided_at, text: `Refusée par ${name(r.decided_by)}` } : null,
    r.cancelled_at ? { at: r.cancelled_at, text: `Annulée par ${name(r.cancelled_by)}` } : null,
  ].filter(Boolean) as { at: string; text: string }[];

  return (
    <>
      <PageHeader
        back={
          <Link href={isSelf ? "/app/absences" : "/app/validations"} className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> {isSelf ? "Absences" : "Validations"}
          </Link>
        }
        title={r.leave_types?.name ?? "Absence"}
        description={rangeLabel(r.start_date, r.start_half, r.end_date, r.end_half)}
        actions={<StatusBadge status={r.status} step={r.step} />}
      />
      {sp.nouveau && (
        <p className="mb-6 rounded-ctl border border-ok/30 bg-ok-soft px-4 py-3 text-sm text-ok">
          {r.status === "approved" ? "C'est enregistré." : "Demande envoyée. Vous serez prévenu par e-mail de la décision."}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Panel>
            <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              <div>
                <dt className="text-[13px] text-muted">Salarié</dt>
                <dd className="mt-1 flex items-center gap-2 font-semibold">
                  {r.member && <Avatar first={r.member.first_name} last={r.member.last_name} size="sm" />}
                  {r.member ? `${r.member.first_name} ${r.member.last_name}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Durée décomptée</dt>
                <dd className="tabular mt-1 font-semibold">
                  {fmtNum(r.days)} jour{r.days > 1 ? "s" : ""}{" "}
                  <span className="font-normal text-muted">
                    {lt?.counting === "ouvrables" ? "ouvrables" : lt?.counting === "calendaires" ? "calendaires" : "ouvrés"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Type</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <TypeDot color={r.leave_types?.color ?? "#999"} /> {r.leave_types?.name}
                  {reason && <span className="text-muted">({reason.label})</span>}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted">Justificatif</dt>
                <dd className="mt-1">
                  {r.attachment_path ? (
                    <a href={`/api/justificatifs?demande=${r.id}`} target="_blank" className="inline-flex items-center gap-1.5 underline underline-offset-4">
                      <Paperclip className="size-4" /> Ouvrir le document
                    </a>
                  ) : (
                    <span className="text-muted">{lt?.requires_attachment ? "À fournir" : "Aucun"}</span>
                  )}
                </dd>
              </div>
              {r.comment && (
                <div className="sm:col-span-2">
                  <dt className="text-[13px] text-muted">Commentaire du salarié</dt>
                  <dd className="mt-1 rounded-ctl bg-surface px-3 py-2 text-ink-soft">{r.comment}</dd>
                </div>
              )}
              {r.decision_comment && (
                <div className="sm:col-span-2">
                  <dt className="text-[13px] text-muted">{r.status === "rejected" ? "Motif du refus" : r.status === "cancelled" ? "Motif de l'annulation" : "Commentaire du valideur"}</dt>
                  <dd className="mt-1 rounded-ctl bg-surface px-3 py-2 text-ink-soft">{r.decision_comment}</dd>
                </div>
              )}
            </dl>
          </Panel>
          <Panel>
            <PanelHeader title="Historique" />
            <ol className="flex flex-col gap-3 px-5 py-4">
              {timeline.map((t) => (
                <li key={t.at + t.text} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-navy-600" aria-hidden />
                  <span>
                    <span className="block">{t.text}</span>
                    <span className="block text-xs text-muted">{fmtDateTime(t.at)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <RequestActions
            id={r.id}
            orgId={ctx.org.id}
            memberId={r.member_id}
            canDecide={canDecide}
            canCancel={canCancel}
            isSelf={isSelf}
            status={r.status}
            needsAttachment={!r.attachment_path && !!lt && (lt.requires_attachment || lt.category === "sick" || lt.category === "sick_pro")}
            insights={canDecide ? insights : null}
          />
        </aside>
      </div>
    </>
  );
}
