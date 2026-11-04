"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Panel } from "@/components/ui/display";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { categoryLabels, fmtNum } from "@/lib/format";
import type { Category, LeaveType } from "@/lib/types";
import { upsertLeaveType } from "@/app/app/actions/admin";

const countingLabels = { ouvrables: "Jours ouvrables", ouvres: "Jours ouvrés", calendaires: "Jours calendaires" };

function summary(t: LeaveType) {
  const parts: string[] = [countingLabels[t.counting]];
  if (t.deducts_balance) {
    if (t.accrual_mode === "monthly" && t.accrual_amount > 0) parts.push(`+${fmtNum(t.accrual_amount, 3)} j par mois`);
    else if (t.accrual_mode === "annual" && t.accrual_amount > 0) parts.push(`${fmtNum(t.accrual_amount)} j par an`);
    else parts.push("compteur alimenté par les RH");
  }
  parts.push(t.requires_approval ? "avec validation" : "sans validation");
  if (!t.visible_to_colleagues) parts.push("motif masqué aux collègues");
  return parts.join(", ");
}

export function LeaveTypesManager({ types, hcr }: { types: LeaveType[]; hcr: boolean }) {
  const [editing, setEditing] = useState<LeaveType | "new" | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="dark" onClick={() => setEditing("new")}>
          <Plus /> Nouveau type
        </Button>
      </div>
      <Panel>
        {types.map((t) => (
          <button key={t.id} onClick={() => setEditing(t)} className="flex w-full items-center gap-4 border-b border-line px-5 py-3.5 text-left last:border-0 hover:bg-surface/60">
            <span className="size-3.5 shrink-0 rounded-[4px]" style={{ background: t.color }} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="font-semibold">{t.name}</span>
                <span className="text-xs text-muted">{t.code}</span>
                {!t.active && <Badge>Inactif</Badge>}
                {t.code === "FG" && hcr && <Badge tone="marker">HCR</Badge>}
              </span>
              <span className="block truncate text-[13px] text-muted">{summary(t)}</span>
            </span>
            <span className="text-sm text-ink-soft underline underline-offset-4">Modifier</span>
          </button>
        ))}
      </Panel>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent title={editing === "new" ? "Nouveau type d'absence" : editing.name} className="sm:max-w-2xl">
            <TypeForm type={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function TypeForm({ type, onDone }: { type: LeaveType | null; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [deducts, setDeducts] = useState(type?.deducts_balance ?? false);
  const [accrual, setAccrual] = useState(type?.accrual_mode ?? "none");
  const locked = type?.category === "paid_leave";

  function submit(fd: FormData) {
    const b = (k: string) => fd.get(k) === "on";
    const n = (k: string) => {
      const s = String(fd.get(k) ?? "").replace(",", ".").trim();
      return s === "" ? null : Number(s);
    };
    const data: Record<string, unknown> = {
      name: String(fd.get("name") ?? "").trim(),
      color: String(fd.get("color") ?? "#2563eb"),
      counting: String(fd.get("counting")),
      allow_half_days: b("allow_half_days"),
      requires_approval: b("requires_approval"),
      requires_attachment: b("requires_attachment"),
      counts_as_absence: b("counts_as_absence"),
      visible_to_colleagues: b("visible_to_colleagues"),
      deducts_balance: deducts,
      accrual_mode: deducts ? accrual : "none",
      accrual_amount: deducts && accrual !== "none" ? n("accrual_amount") ?? 0 : 0,
      period_kind: locked ? type?.period_kind : String(fd.get("period_kind") ?? "civil"),
      min_seniority_months: n("min_seniority_months") ?? 0,
      carryover_max: deducts ? n("carryover_max") : null,
      description: String(fd.get("description") ?? "").trim() || null,
      active: b("active"),
    };
    if (!type) {
      data.code = String(fd.get("code") ?? "").toUpperCase().trim();
      data.category = String(fd.get("category"));
    }
    start(async () => {
      const r = await upsertLeaveType(type?.id ?? null, data);
      if (r.ok) {
        toast.success(r.message);
        onDone();
      } else toast.error(r.error);
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px_80px]">
        <Field label="Nom" htmlFor="t-name">
          <Input id="t-name" name="name" defaultValue={type?.name} required maxLength={80} />
        </Field>
        <Field label="Code" htmlFor="t-code" hint={type ? undefined : "Majuscules, pour l'export paie."}>
          <Input id="t-code" name="code" defaultValue={type?.code} disabled={!!type} required pattern="[A-Za-z0-9_]{1,12}" maxLength={12} />
        </Field>
        <Field label="Couleur" htmlFor="t-color">
          <Input id="t-color" name="color" type="color" defaultValue={type?.color ?? "#2563eb"} className="p-1" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Catégorie" htmlFor="t-cat" hint="Détermine les règles légales appliquées (acquisition, confidentialité).">
          <Select id="t-cat" name="category" defaultValue={type?.category ?? "other"} disabled={!!type}>
            {(Object.keys(categoryLabels) as Category[]).map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Décompte" htmlFor="t-counting">
          <Select id="t-counting" name="counting" defaultValue={type?.counting ?? "ouvres"} disabled={locked}>
            {Object.entries(countingLabels).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
          {locked && <input type="hidden" name="counting" value={type?.counting} />}
        </Field>
      </div>
      <div className="grid gap-3 rounded-ctl border border-line p-4 sm:grid-cols-2">
        <Checkbox name="requires_approval" defaultChecked={type?.requires_approval ?? true} label="Soumis à validation" />
        <Checkbox name="allow_half_days" defaultChecked={type?.allow_half_days ?? true} label="Demi-journées autorisées" />
        <Checkbox name="requires_attachment" defaultChecked={type?.requires_attachment ?? false} label="Justificatif demandé" />
        <Checkbox name="counts_as_absence" defaultChecked={type?.counts_as_absence ?? true} label="Compte comme absent" description="Décochez pour le télétravail." />
        <Checkbox name="visible_to_colleagues" defaultChecked={type?.visible_to_colleagues ?? true} label="Motif visible des collègues" description="Sinon ils voient « Absent »." />
        <Checkbox name="active" defaultChecked={type?.active ?? true} label="Actif" />
      </div>
      <div className="rounded-ctl border border-line p-4">
        <Checkbox checked={deducts} onChange={(e) => setDeducts(e.target.checked)} label="Utilise un compteur de jours" description="Les jours pris sont déduits d'un solde." disabled={locked} />
        {deducts && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Acquisition" htmlFor="t-acc">
              <Select id="t-acc" value={accrual} onChange={(e) => setAccrual(e.target.value as LeaveType["accrual_mode"])}>
                <option value="none">Manuelle (par les RH)</option>
                <option value="monthly">Chaque mois</option>
                <option value="annual">En début de période</option>
              </Select>
            </Field>
            {accrual !== "none" && (
              <Field label={accrual === "monthly" ? "Jours par mois" : "Jours par période"} htmlFor="t-amount">
                <Input id="t-amount" name="accrual_amount" inputMode="decimal" defaultValue={type?.accrual_amount ? String(type.accrual_amount).replace(".", ",") : ""} />
              </Field>
            )}
            {!locked && (
              <Field label="Période" htmlFor="t-period">
                <Select id="t-period" name="period_kind" defaultValue={type?.period_kind ?? "civil"}>
                  <option value="civil">Année civile</option>
                  <option value="cp">Période des congés payés</option>
                </Select>
              </Field>
            )}
            <Field label="Report maximum à la clôture" htmlFor="t-carry" hint="Vide : tout est reporté. 0 : rien n'est reporté.">
              <Input id="t-carry" name="carryover_max" inputMode="decimal" defaultValue={type?.carryover_max ?? ""} />
            </Field>
            <Field label="Ancienneté requise (mois)" htmlFor="t-senior">
              <Input id="t-senior" name="min_seniority_months" type="number" min={0} max={120} defaultValue={type?.min_seniority_months ?? 0} />
            </Field>
          </div>
        )}
      </div>
      <Field label="Description pour les salariés" htmlFor="t-desc">
        <Textarea id="t-desc" name="description" defaultValue={type?.description ?? ""} maxLength={500} />
      </Field>
      {type && type.reasons.length > 0 && (
        <div className="rounded-ctl bg-surface p-4 text-sm">
          <p className="font-semibold">Motifs proposés</p>
          <ul className="mt-2 flex flex-col gap-1 text-ink-soft">
            {type.reasons.map((r) => (
              <li key={r.code}>
                {r.label} : {r.days} j minimum
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-end">
        <Button type="submit" variant="dark" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
