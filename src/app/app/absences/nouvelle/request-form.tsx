"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarCheck, Info, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { cn, fmtDate, fmtNum } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Balance, LeaveType, RequestEvaluation } from "@/lib/types";
import { previewRequest, submitRequest } from "@/app/app/actions/leave";

type Person = { id: string; name: string };

export function RequestForm({
  orgId,
  me,
  people,
  initialMember,
  types,
  balances,
  canActForOthers,
  initialStart,
}: {
  orgId: string;
  me: string;
  people: Person[];
  initialMember: string;
  types: LeaveType[];
  balances: Balance[];
  today: string;
  canActForOthers: boolean;
  initialStart?: string;
}) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(initialMember);
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [start, setStart] = useState(initialStart ?? "");
  const [end, setEnd] = useState(initialStart ?? "");
  const [startHalf, setStartHalf] = useState<"full" | "pm">("full");
  const [endHalf, setEndHalf] = useState<"full" | "am">("full");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{ key: string; data: RequestEvaluation | null; error: string | null } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, start_] = useTransition();

  const type = types.find((t) => t.id === typeId);
  const forOther = memberId !== me;
  const balance = balances.find((b) => b.leave_type_id === typeId);
  const sameDay = start && end && start === end;

  // Aperçu en direct (décompte, solde, conflits) : recalculé à chaque changement, avec un léger délai
  const ready = !!(typeId && start && end);
  const requestKey = JSON.stringify([typeId, start, end, startHalf, endHalf, memberId]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await previewRequest({ leaveTypeId: typeId, start, end, startHalf, endHalf, memberId: forOther ? memberId : null });
      if (cancelled) return;
      setResult({ key: requestKey, data: r.ok ? r.data ?? null : null, error: r.ok ? null : r.error });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [ready, requestKey, typeId, start, end, startHalf, endHalf, memberId, forOther]);
  const preview = ready ? result?.data ?? null : null;
  const previewError = ready ? result?.error ?? null : null;
  const loadingPreview = ready && result?.key !== requestKey;

  const reasons = type?.reasons ?? [];
  const reasonInfo = reasons.find((r) => r.code === reason);
  const blockingError = preview?.errors?.[0] ?? previewError;
  const canSubmit = !!type && !!start && !!end && !!preview && !blockingError && !pending && !(reasons.length > 0 && !reason);

  const submitLabel = !type ? "Envoyer" : forOther ? "Enregistrer l'absence" : type.requires_approval ? "Envoyer la demande" : "Déclarer l'absence";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !type) return;
    setSubmitError(null);
    start_(async () => {
      let attachmentPath: string | null = null;
      if (file) {
        const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${orgId}/${memberId}/${crypto.randomUUID()}.${ext}`;
        const supabase = createClient();
        const { error } = await supabase.storage.from("justificatifs").upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          setSubmitError("Le justificatif n'a pas pu être envoyé (PDF ou image de 10 Mo maximum).");
          return;
        }
        attachmentPath = path;
      }
      const r = await submitRequest({
        leaveTypeId: type.id,
        start,
        end,
        startHalf,
        endHalf,
        memberId: forOther ? memberId : null,
        comment,
        reasonCode: reason || null,
        attachmentPath,
      });
      if (!r.ok) {
        setSubmitError(r.error);
        return;
      }
      toast.success(r.data?.status === "approved" ? "Absence enregistrée" : "Demande envoyée");
      router.push(`/app/demandes/${r.data!.id}?nouveau=1`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        {canActForOthers && people.length > 1 && (
          <section className="rounded-panel border border-line bg-paper p-5">
            <Field label="Pour qui ?" htmlFor="member" hint={forOther ? "L'absence sera enregistrée directement, le salarié est prévenu." : undefined}>
              <Select id="member" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id === me ? `Moi (${p.name})` : p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </section>
        )}

        <fieldset className="rounded-panel border border-line bg-paper p-5">
          <legend className="sr-only">Type d&apos;absence</legend>
          <p className="mb-3 text-sm font-semibold">Type d&apos;absence</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {types.map((t) => {
              const b = balances.find((x) => x.leave_type_id === t.id);
              const selected = t.id === typeId;
              return (
                <label
                  key={t.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-ctl border px-3.5 py-3 transition-colors",
                    selected ? "border-ink bg-surface ring-1 ring-ink" : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.id}
                    checked={selected}
                    onChange={() => {
                      setTypeId(t.id);
                      setReason("");
                      if (!t.allow_half_days) {
                        setStartHalf("full");
                        setEndHalf("full");
                      }
                    }}
                    className="sr-only"
                  />
                  <span className="size-3 shrink-0 rounded-[3px]" style={{ background: t.color }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{t.name}</span>
                    <span className="block text-xs text-muted">
                      {b && !forOther ? `${fmtNum(b.projected)} j disponibles` : t.requires_approval ? "Soumis à validation" : "Sans validation"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {type?.description && (
            <p className="mt-3 flex gap-2 text-[13px] text-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" /> {type.description}
            </p>
          )}
        </fieldset>

        <fieldset className="rounded-panel border border-line bg-paper p-5">
          <legend className="sr-only">Dates</legend>
          <p className="mb-3 text-sm font-semibold">Dates</p>
          {reasons.length > 0 && (
            <Field label="Motif" htmlFor="reason" className="mb-4" hint={reasonInfo ? `Durée minimale prévue par la loi : ${reasonInfo.days} jour(s).` : undefined}>
              <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} required>
                <option value="">Choisissez le motif</option>
                {reasons.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Field label="Du" htmlFor="start">
                <Input
                  id="start"
                  type="date"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    if (!end || end < e.target.value) setEnd(e.target.value);
                  }}
                  required
                />
              </Field>
              {type?.allow_half_days && (
                <HalfToggle
                  value={startHalf}
                  onChange={(v) => setStartHalf(v as "full" | "pm")}
                  options={[
                    { v: "full", l: "Matin" },
                    { v: "pm", l: "Après-midi" },
                  ]}
                  label="Début"
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Field label="Au" htmlFor="end">
                <Input id="end" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} required />
              </Field>
              {type?.allow_half_days && (
                <HalfToggle
                  value={endHalf}
                  onChange={(v) => setEndHalf(v as "full" | "am")}
                  options={[
                    { v: "am", l: "Midi" },
                    { v: "full", l: "Soir" },
                  ]}
                  label="Fin"
                  disabledValue={sameDay && startHalf === "pm" ? "am" : undefined}
                />
              )}
            </div>
          </div>
          <Field label="Commentaire (facultatif)" htmlFor="comment" className="mt-4">
            <Textarea
              id="comment"
              value={comment}
              maxLength={1000}
              onChange={(e) => setComment(e.target.value)}
              placeholder={type?.category === "paid_leave" ? "Ex. : vacances en famille" : undefined}
            />
          </Field>
          {(type?.requires_attachment || type?.category === "sick" || type?.category === "sick_pro") && (
            <div className="mt-4">
              <p className="mb-1.5 text-sm font-semibold">Justificatif{type?.requires_attachment ? "" : " (facultatif)"}</p>
              {file ? (
                <div className="flex items-center gap-2 rounded-ctl border border-line px-3 py-2 text-sm">
                  <Paperclip className="size-4 text-muted" />
                  <span className="flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} aria-label="Retirer le fichier" className="rounded p-1 hover:bg-surface">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-ctl border border-dashed border-line-strong px-3 py-4 text-sm text-ink-soft hover:bg-surface">
                  <Paperclip className="size-4" /> Joindre un PDF ou une photo
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > 10 * 1024 * 1024) {
                        toast.error("Fichier trop lourd (10 Mo maximum)");
                        return;
                      }
                      setFile(f);
                    }}
                  />
                </label>
              )}
              <p className="mt-1.5 text-xs text-muted">Visible uniquement par vous, votre manager et les RH. Vous pourrez aussi l&apos;ajouter plus tard.</p>
            </div>
          )}
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-panel border border-line bg-paper">
          <div className="border-b border-line px-5 py-4">
            <p className="text-sm font-semibold">Récapitulatif</p>
          </div>
          <div className="px-5 py-5" aria-live="polite">
            {!start || !end ? (
              <p className="text-sm text-muted">Choisissez vos dates pour voir le nombre de jours décomptés{balance ? " et votre solde" : ""}.</p>
            ) : loadingPreview && !preview ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="size-4 animate-spin" /> Calcul...
              </p>
            ) : preview ? (
              <div className={cn("flex flex-col gap-4 transition-opacity", loadingPreview && "opacity-60")}>
                <div>
                  <p className="flex items-baseline gap-2">
                    <span className="tabular text-[2.6rem] leading-none font-bold">{fmtNum(preview.days)}</span>
                    <span className="text-muted">
                      {preview.days <= 1 ? "jour" : "jours"} {type?.counting === "ouvrables" ? "ouvrables" : type?.counting === "calendaires" ? "calendaires" : "ouvrés"}
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    {fmtDate(start, "EEE d MMM")}
                    {start !== end ? ` au ${fmtDate(end, "EEE d MMM yyyy")}` : ""}
                  </p>
                </div>
                {preview.deducts && preview.available != null && (
                  <dl className="grid grid-cols-2 gap-y-1.5 rounded-ctl bg-surface px-3.5 py-3 text-sm">
                    <dt className="text-muted">Disponible</dt>
                    <dd className="tabular text-right">{fmtNum((preview.available ?? 0) - (preview.pending ?? 0))} j</dd>
                    <dt className="text-muted">Restant ensuite</dt>
                    <dd className={cn("tabular text-right font-semibold", (preview.after ?? 0) < 0 && "text-danger")}>{fmtNum(preview.after)} j</dd>
                  </dl>
                )}
                {preview.holidays.length > 0 && (
                  <p className="flex gap-2 text-[13px] text-ink-soft">
                    <CalendarCheck className="mt-0.5 size-3.5 shrink-0" />
                    Jour{preview.holidays.length > 1 ? "s" : ""} férié{preview.holidays.length > 1 ? "s" : ""} inclus :{" "}
                    {preview.holidays.map((h) => `${h.name} (${fmtDate(h.date, "d MMM")})`).join(", ")}
                  </p>
                )}
                {preview.warnings.map((w) => (
                  <p key={w} className="flex gap-2 rounded-ctl bg-wait-soft px-3 py-2 text-[13px] text-wait">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {w}
                  </p>
                ))}
              </div>
            ) : null}
            {blockingError && (
              <p className="mt-3 flex gap-2 rounded-ctl bg-danger-soft px-3 py-2 text-[13px] text-danger" role="alert">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {blockingError}
              </p>
            )}
          </div>
          <div className="border-t border-line px-5 py-4">
            <FormError message={submitError} />
            <Button type="submit" size="lg" className="mt-0 w-full" disabled={!canSubmit}>
              {pending ? "Envoi..." : submitLabel}
            </Button>
            {type && !forOther && type.requires_approval && (
              <p className="mt-2 text-center text-xs text-muted">Votre responsable est prévenu immédiatement.</p>
            )}
          </div>
        </div>
      </aside>
    </form>
  );
}

function HalfToggle({
  value,
  onChange,
  options,
  label,
  disabledValue,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  label: string;
  disabledValue?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-ctl bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          disabled={disabledValue === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "h-8 rounded-[6px] text-[13px] font-medium text-ink-soft transition-colors disabled:opacity-40",
            value === o.v && "bg-paper font-semibold text-ink shadow-[0_1px_2px_rgba(13,23,48,0.12)]",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
