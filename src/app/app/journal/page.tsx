import Link from "next/link";
import type { Metadata } from "next";
import { requireHR } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { EmptyState, PageHeader, Panel } from "@/components/ui/display";

export const metadata: Metadata = { title: "Journal d'audit" };

const actionLabels: Record<string, string> = {
  "organization.created": "a créé l'espace",
  "organization.settings_updated": "a modifié les paramètres",
  "leave_request.created": "a créé une absence",
  "leave_request.approved": "a validé une demande",
  "leave_request.rejected": "a refusé une demande",
  "leave_request.cancelled": "a annulé une absence",
  "leave_request.attachment_set": "a modifié un justificatif",
  "member.invited": "a ajouté un salarié",
  "member.invitation_sent": "a envoyé une invitation",
  "member.joined": "a rejoint l'espace",
  "member.updated": "a modifié une fiche salarié",
  "member.disabled": "a désactivé un salarié",
  "member.reactivated": "a réactivé un salarié",
  "member.anonymized": "a anonymisé un salarié",
  "members.imported": "a importé des salariés",
  "balance.adjusted": "a ajusté un compteur",
  "accruals.computed": "a recalculé les acquisitions",
  "period.closed": "a clôturé une période",
  "fractionnement.applied": "a attribué les jours de fractionnement",
  "holiday.status_set": "a renseigné un jour férié",
  "team.saved": "a enregistré une équipe",
  "team.deleted": "a supprimé une équipe",
  "leave_type.saved": "a modifié un type d'absence",
  "demo.seeded": "a ajouté l'équipe d'exemple",
  "demo.removed": "a supprimé l'équipe d'exemple",
};

const PAGE = 50;

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);
  const ctx = await requireHR();
  const [{ data: logs }, { data: members }] = await Promise.all([
    ctx.supabase.from("audit_log").select("*").eq("org_id", ctx.org.id).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE),
    ctx.supabase.from("members").select("id, first_name, last_name").eq("org_id", ctx.org.id),
  ]);
  const names = new Map((members ?? []).map((m) => [m.id, `${m.first_name} ${m.last_name}`]));
  const rows = (logs ?? []).slice(0, PAGE);
  const hasMore = (logs ?? []).length > PAGE;
  return (
    <>
      <PageHeader title="Journal d'audit" description="Toutes les actions sensibles sont enregistrées : qui, quoi, quand. Le journal ne peut pas être modifié." />
      <Panel>
        {rows.length === 0 ? (
          <EmptyState title="Aucune action enregistrée" />
        ) : (
          <ul>
            {rows.map((l) => {
              const target = (l.details as Record<string, string>)?.member_id ?? (l.entity === "member" ? l.entity_id : null);
              return (
                <li key={l.id} className="flex flex-col gap-0.5 border-b border-line px-5 py-3 text-sm last:border-0 sm:flex-row sm:items-center sm:gap-4">
                  <span className="w-40 shrink-0 text-[13px] text-muted">{fmtDateTime(l.created_at)}</span>
                  <span className="flex-1">
                    <strong className="font-semibold">{l.actor_member_id ? names.get(l.actor_member_id) ?? "Utilisateur supprimé" : "Système"}</strong>{" "}
                    {actionLabels[l.action] ?? l.action}
                    {target && names.get(target) && target !== l.actor_member_id ? (
                      <>
                        {" "}
                        pour <span className="font-medium">{names.get(target)}</span>
                      </>
                    ) : null}
                  </span>
                  {l.entity === "leave_request" && l.entity_id && (
                    <Link href={`/app/demandes/${l.entity_id}`} className="text-[13px] text-ink-soft underline underline-offset-4">
                      Voir
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <div className="mt-4 flex justify-between text-sm">
        {page > 0 ? <Link href={`/app/journal?page=${page - 1}`} className="underline underline-offset-4">Plus récents</Link> : <span />}
        {hasMore && <Link href={`/app/journal?page=${page + 1}`} className="underline underline-offset-4">Plus anciens</Link>}
      </div>
    </>
  );
}
