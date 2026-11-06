"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, Check, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, TypeDot } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { fmtDate, fmtNum, rangeLabel } from "@/lib/format";
import { decideRequest } from "@/app/app/actions/leave";
import type { RequestEvaluation } from "@/lib/types";
import type { RequestWithRefs } from "./request-row";

export function ApprovalCard({ r, insights }: { r: RequestWithRefs; insights?: RequestEvaluation | null }) {
  const [pending, start] = useTransition();
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [gone, setGone] = useState(false);
  if (gone) return null;

  const decide = (approve: boolean, c?: string) =>
    start(async () => {
      const res = await decideRequest(r.id, approve, c);
      if (res.ok) {
        toast.success(res.message);
        setGone(true);
        setRefuseOpen(false);
      } else toast.error(res.error);
    });

  const conflicts = insights?.conflicts ?? [];
  return (
    <div className="border-b border-line px-5 py-4 last:border-0">
      <div className="flex items-start gap-3">
        {r.member && <Avatar first={r.member.first_name} last={r.member.last_name} />}
        <div className="min-w-0 flex-1">
          <Link href={`/app/demandes/${r.id}`} className="font-semibold text-ink hover:underline">
            {r.member ? `${r.member.first_name} ${r.member.last_name}` : "Demande"}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-soft">
            <TypeDot color={r.leave_types?.color ?? "#94a3b8"} />
            {r.leave_types?.name}, {fmtNum(r.days)} j
          </p>
          <p className="text-sm text-muted">{rangeLabel(r.start_date, r.start_half, r.end_date, r.end_half)}</p>
          {r.comment && <p className="mt-1.5 rounded-ctl bg-surface px-3 py-2 text-sm text-ink-soft">« {r.comment} »</p>}
          {r.attachment_path ? (
            <a
              href={`/api/justificatifs?demande=${r.id}`}
              target="_blank"
              rel="noopener"
              className="mt-2 inline-flex items-center gap-1.5 rounded-ctl border border-line-strong bg-paper px-2.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface"
            >
              <Paperclip className="size-3.5" /> Voir le justificatif
            </a>
          ) : (
            r.leave_types?.requires_attachment && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
                <Paperclip className="size-3.5" /> Justificatif demandé, pas encore fourni
              </p>
            )
          )}
          {insights && insights.deducts && insights.available != null && (
            <p className="mt-1.5 text-[13px] text-muted">
              Solde après validation :{" "}
              <span className={(insights.after ?? 0) < 0 ? "font-semibold text-danger" : "font-semibold text-ink"}>
                {fmtNum(insights.after)} j
              </span>
            </p>
          )}
          {conflicts.length > 0 && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-wait">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Effectif minimum « {conflicts[0].team} » non atteint le {conflicts.slice(0, 3).map((c) => fmtDate(c.date, "d MMM")).join(", ")}
              {conflicts.length > 3 ? ` et ${conflicts.length - 3} autre(s) jour(s)` : ""} ({conflicts[0].present}/{conflicts[0].min} présents).
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2 sm:ml-12">
        <Button size="sm" variant="ok" disabled={pending} onClick={() => decide(true)}>
          <Check /> Valider
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRefuseOpen(true)}>
          <X /> Refuser
        </Button>
      </div>
      <Dialog open={refuseOpen} onOpenChange={setRefuseOpen}>
        <DialogContent title="Refuser la demande" description="Le motif est envoyé au salarié avec la notification.">
          <div className="flex flex-col gap-4">
            <Field label="Motif du refus" htmlFor={`refuse-${r.id}`}>
              <Textarea
                id={`refuse-${r.id}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex. : deux personnes de l'équipe sont déjà absentes cette semaine."
                autoFocus
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefuseOpen(false)}>
                Annuler
              </Button>
              <Button variant="danger" disabled={pending || comment.trim().length < 2} onClick={() => decide(false, comment)}>
                Refuser la demande
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
