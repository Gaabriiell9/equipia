"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, Check, ChevronRight, ExternalLink, FileText, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, TypeDot } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Dialog, DrawerContent } from "@/components/ui/overlays";
import { fmtDate, fmtDateTime, fmtNum, rangeLabel } from "@/lib/format";
import { decideRequest } from "@/app/app/actions/leave";
import type { RequestEvaluation } from "@/lib/types";
import type { RequestWithRefs } from "./request-row";

const isImage = (path: string) => /\.(png|jpe?g|webp|gif)$/i.test(path);

// Ligne d'une demande à traiter : un clic ouvre le détail complet, la décision se prend dans le détail.
export function ApprovalCard({ r, insights }: { r: RequestWithRefs; insights?: RequestEvaluation | null }) {
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone) return null;

  const conflicts = insights?.conflicts ?? [];
  const name = r.member ? `${r.member.first_name} ${r.member.last_name}` : "Demande";
  const missingDoc = !r.attachment_path && !!r.leave_types?.requires_attachment;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-start gap-3 border-b border-line px-5 py-4 text-left transition-colors last:border-0 hover:bg-surface/60 focus-visible:bg-surface/60"
      >
        {r.member && <Avatar first={r.member.first_name} last={r.member.last_name} />}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">{name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
            <TypeDot color={r.leave_types?.color ?? "#94a3b8"} />
            {r.leave_types?.name}, {fmtNum(r.days)} j
          </span>
          <span className="block text-sm text-muted">{rangeLabel(r.start_date, r.start_half, r.end_date, r.end_half)}</span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            {r.attachment_path && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-surface px-2 py-0.5 text-xs font-semibold text-ink-soft">
                <Paperclip className="size-3" /> Justificatif joint
              </span>
            )}
            {missingDoc && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-wait-soft px-2 py-0.5 text-xs font-semibold text-wait">
                <Paperclip className="size-3" /> Justificatif manquant
              </span>
            )}
            {conflicts.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-wait-soft px-2 py-0.5 text-xs font-semibold text-wait">
                <AlertTriangle className="size-3" /> Effectif minimum
              </span>
            )}
            {r.comment && <span className="inline-flex items-center rounded-chip bg-surface px-2 py-0.5 text-xs text-ink-soft">Commentaire</span>}
          </span>
        </span>
        <span className="mt-1 hidden items-center gap-1 text-sm font-semibold text-ink-soft sm:flex">
          Examiner <ChevronRight className="size-4" />
        </span>
        <ChevronRight className="mt-1 size-5 text-faint sm:hidden" />
      </button>
      {open && <RequestReview r={r} insights={insights} onDone={() => setGone(true)} />}
    </Dialog>
  );
}

function RequestReview({ r, insights, onDone }: { r: RequestWithRefs; insights?: RequestEvaluation | null; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [refusing, setRefusing] = useState(false);
  const [comment, setComment] = useState("");
  const [imgFailed, setImgFailed] = useState(false);
  const conflicts = insights?.conflicts ?? [];
  const reason = r.reason_code ? r.leave_types?.reasons?.find((x) => x.code === r.reason_code)?.label : null;
  const docUrl = `/api/justificatifs?demande=${r.id}`;

  const decide = (approve: boolean, c?: string) =>
    start(async () => {
      const res = await decideRequest(r.id, approve, c);
      if (res.ok) {
        toast.success(res.message);
        onDone();
      } else toast.error(res.error);
    });

  const footer = refusing ? (
    <div className="flex flex-col gap-3">
      <Field label="Motif du refus (envoyé au salarié)" htmlFor={`refuse-${r.id}`}>
        <Textarea
          id={`refuse-${r.id}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ex. : deux personnes de l'équipe sont déjà absentes cette semaine."
          autoFocus
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setRefusing(false)}>
          Retour
        </Button>
        <Button variant="danger" disabled={pending || comment.trim().length < 2} onClick={() => decide(false, comment)}>
          Refuser la demande
        </Button>
      </div>
    </div>
  ) : (
    <div className="grid grid-cols-2 gap-2">
      <Button size="lg" variant="outline" disabled={pending} onClick={() => setRefusing(true)}>
        <X /> Refuser
      </Button>
      <Button size="lg" variant="ok" disabled={pending} onClick={() => decide(true)}>
        <Check /> {pending ? "Validation..." : "Valider"}
      </Button>
    </div>
  );

  return (
    <DrawerContent title="Examiner la demande" footer={footer}>
      <div className="flex items-center gap-3">
        {r.member && <Avatar first={r.member.first_name} last={r.member.last_name} size="lg" />}
        <div>
          <p className="text-lg font-bold">{r.member ? `${r.member.first_name} ${r.member.last_name}` : "Demande"}</p>
          <p className="text-sm text-muted">Envoyée le {fmtDateTime(r.created_at)}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 rounded-ctl border border-line p-4">
        <div className="col-span-2">
          <dt className="text-[13px] text-muted">Type d&apos;absence</dt>
          <dd className="mt-0.5 flex items-center gap-2 font-semibold">
            <TypeDot color={r.leave_types?.color ?? "#94a3b8"} /> {r.leave_types?.name}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[13px] text-muted">Dates</dt>
          <dd className="mt-0.5 font-semibold">{rangeLabel(r.start_date, r.start_half, r.end_date, r.end_half)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Jours décomptés</dt>
          <dd className="tabular mt-0.5 text-xl font-bold">{fmtNum(r.days)} j</dd>
        </div>
        {insights?.deducts && insights.available != null && (
          <div>
            <dt className="text-[13px] text-muted">Solde après validation</dt>
            <dd className={(insights.after ?? 0) < 0 ? "tabular mt-0.5 text-xl font-bold text-danger" : "tabular mt-0.5 text-xl font-bold"}>
              {fmtNum(insights.after)} j
            </dd>
          </div>
        )}
        {reason && (
          <div className="col-span-2">
            <dt className="text-[13px] text-muted">Motif</dt>
            <dd className="mt-0.5">{reason}</dd>
          </div>
        )}
      </dl>

      {r.comment && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold">Commentaire du salarié</h3>
          <p className="mt-1.5 rounded-ctl bg-surface px-3 py-2.5 text-[15px] text-ink-soft">« {r.comment} »</p>
        </section>
      )}

      <section className="mt-5">
        <h3 className="text-sm font-semibold">Justificatif</h3>
        {r.attachment_path ? (
          isImage(r.attachment_path) && !imgFailed ? (
            <a href={docUrl} target="_blank" rel="noopener" className="group mt-1.5 block overflow-hidden rounded-ctl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={docUrl} alt="Justificatif joint à la demande" onError={() => setImgFailed(true)} className="max-h-80 w-full bg-surface object-contain" />
              <span className="flex items-center gap-1.5 border-t border-line px-3 py-2 text-[13px] font-semibold text-ink-soft group-hover:text-ink">
                <ExternalLink className="size-3.5" /> Ouvrir en grand
              </span>
            </a>
          ) : (
            <a href={docUrl} target="_blank" rel="noopener" className="mt-1.5 flex items-center gap-3 rounded-ctl border border-line px-3 py-3 transition-colors hover:bg-surface">
              <FileText className="size-6 text-muted" />
              <span className="flex-1 text-sm font-semibold">Ouvrir le document</span>
              <ExternalLink className="size-4 text-muted" />
            </a>
          )
        ) : (
          <p className={r.leave_types?.requires_attachment ? "mt-1.5 rounded-ctl bg-wait-soft px-3 py-2.5 text-sm text-wait" : "mt-1.5 text-sm text-muted"}>
            {r.leave_types?.requires_attachment ? "Un justificatif est demandé pour ce type d'absence et n'a pas encore été fourni." : "Aucun justificatif."}
          </p>
        )}
      </section>

      {conflicts.length > 0 && (
        <section className="mt-5 rounded-ctl bg-wait-soft px-3 py-2.5 text-sm text-wait">
          <p className="flex items-start gap-1.5 font-semibold">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Effectif minimum « {conflicts[0].team} » non atteint
          </p>
          <p className="mt-1 pl-5.5">
            {conflicts.slice(0, 5).map((c) => `${fmtDate(c.date, "EEE d MMM")} (${c.present}/${c.min})`).join(", ")}
            {conflicts.length > 5 ? ` et ${conflicts.length - 5} autre(s) jour(s)` : ""}
          </p>
        </section>
      )}

      <Link href={`/app/demandes/${r.id}`} className="mt-6 inline-block text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
        Voir l&apos;historique de la demande
      </Link>
    </DrawerContent>
  );
}
