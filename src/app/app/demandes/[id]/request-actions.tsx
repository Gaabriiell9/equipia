"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { Field, Textarea } from "@/components/ui/field";
import { Panel } from "@/components/ui/display";
import { cn, fmtDate, fmtNum } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { cancelRequest, decideRequest, setAttachment } from "@/app/app/actions/leave";
import type { RequestEvaluation } from "@/lib/types";

export function RequestActions(p: {
  id: string;
  orgId: string;
  memberId: string;
  canDecide: boolean;
  canCancel: boolean;
  isSelf: boolean;
  status: string;
  needsAttachment: boolean;
  insights: RequestEvaluation | null;
}) {
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) return toast.error("Fichier trop lourd (10 Mo maximum)");
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${p.orgId}/${p.memberId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("justificatifs").upload(path, file, { contentType: file.type });
    if (error) {
      setUploading(false);
      return toast.error("Le fichier n'a pas pu être envoyé.");
    }
    const r = await setAttachment(p.id, path);
    setUploading(false);
    if (r.ok) toast.success(r.message);
    else toast.error(r.error);
  }

  const ins = p.insights;
  return (
    <>
      {p.canDecide && (
        <Panel className="p-5">
          <p className="font-semibold">Votre décision</p>
          {ins && ins.deducts && ins.available != null && (
            <dl className="mt-3 grid grid-cols-2 gap-y-1.5 rounded-ctl bg-surface px-3.5 py-3 text-sm">
              <dt className="text-muted">Solde disponible</dt>
              <dd className="tabular text-right">{fmtNum((ins.available ?? 0) - (ins.pending ?? 0))} j</dd>
              <dt className="text-muted">Après validation</dt>
              <dd className={cn("tabular text-right font-semibold", (ins.after ?? 0) < 0 && "text-danger")}>{fmtNum(ins.after)} j</dd>
            </dl>
          )}
          {ins?.conflicts?.length ? (
            <div className="mt-3 rounded-ctl bg-wait-soft px-3 py-2.5 text-[13px] text-wait">
              <p className="flex gap-2 font-semibold">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> Effectif minimum « {ins.conflicts[0].team} » non atteint
              </p>
              <ul className="mt-1 ml-5 list-disc">
                {ins.conflicts.slice(0, 6).map((c) => (
                  <li key={c.date}>
                    {fmtDate(c.date, "EEE d MMM")} : {c.present} présent{c.present > 1 ? "s" : ""} sur {c.min} requis
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Field label="Commentaire" htmlFor="decision-comment" className="mt-4" hint="Obligatoire en cas de refus. Transmis au salarié.">
            <Textarea id="decision-comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="ok"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await decideRequest(p.id, true, comment);
                  if (r.ok) toast.success(r.message);
                else toast.error(r.error);
                })
              }
            >
              <Check /> Valider
            </Button>
            <Button
              variant="danger-outline"
              disabled={pending || comment.trim().length < 2}
              onClick={() =>
                start(async () => {
                  const r = await decideRequest(p.id, false, comment);
                  if (r.ok) toast.success(r.message);
                else toast.error(r.error);
                })
              }
            >
              <X /> Refuser
            </Button>
          </div>
        </Panel>
      )}

      {p.needsAttachment && (p.status === "approved" || p.status === "pending") && (
        <Panel className="p-5">
          <p className="font-semibold">Justificatif</p>
          <p className="mt-1 text-sm text-muted">Ajoutez l&apos;arrêt de travail ou le document demandé (PDF ou photo).</p>
          <label className={cn("mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-ctl border border-dashed border-line-strong px-3 py-3 text-sm hover:bg-surface", uploading && "opacity-60")}>
            <Paperclip className="size-4" /> {uploading ? "Envoi..." : "Choisir un fichier"}
            <input type="file" accept="application/pdf,image/*" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        </Panel>
      )}

      {p.canCancel && (
        <Panel className="p-5">
          <p className="font-semibold">{p.status === "pending" ? "Retirer la demande" : "Annuler l'absence"}</p>
          <p className="mt-1 text-sm text-muted">
            {p.status === "approved" ? "Les jours seront recrédités sur le compteur." : "La demande sera retirée du circuit de validation."}
          </p>
          <ConfirmButton
            variant="danger-outline"
            className="mt-3 w-full"
            title={p.status === "pending" ? "Retirer la demande ?" : "Annuler cette absence ?"}
            description={p.isSelf ? "Votre responsable sera prévenu si l'absence était déjà validée." : "Le salarié sera prévenu par e-mail."}
            confirmLabel={p.status === "pending" ? "Retirer la demande" : "Annuler l'absence"}
            tone="danger"
            reason={p.isSelf ? undefined : { label: "Motif (transmis au salarié)", required: true }}
            onConfirm={(reason) => cancelRequest(p.id, reason)}
          >
            {p.status === "pending" ? "Retirer la demande" : "Annuler l'absence"}
          </ConfirmButton>
        </Panel>
      )}
    </>
  );
}
