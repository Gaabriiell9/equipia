"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { Panel, PanelHeader } from "@/components/ui/display";
import { Input, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/overlays";
import { cn, regionLabels, weekDays } from "@/lib/format";
import type { Organization } from "@/lib/types";
import { addDemoData, deleteOrganization, updateOrgSettings } from "@/app/app/actions/admin";

const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const timezones: [string, string][] = [
  ["Europe/Paris", "Paris (métropole)"],
  ["America/Cayenne", "Cayenne (Guyane)"],
  ["America/Guadeloupe", "Guadeloupe"],
  ["America/Martinique", "Martinique"],
  ["Indian/Reunion", "La Réunion"],
  ["Indian/Mayotte", "Mayotte"],
];

function Row({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xl">
        <p className="text-[15px] font-semibold">{title}</p>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsForm({ org, isAdmin }: { org: Organization; isAdmin: boolean }) {
  const [v, setV] = useState({ ...org });
  const [pending, start] = useTransition();
  const set = <K extends keyof Organization>(k: K, val: Organization[K]) => setV((x) => ({ ...x, [k]: val }));
  const dirty = JSON.stringify(v) !== JSON.stringify(org);

  function save() {
    const changed: Record<string, unknown> = {};
    for (const k of Object.keys(v) as (keyof Organization)[]) {
      if (JSON.stringify(v[k]) !== JSON.stringify(org[k])) changed[k] = v[k];
    }
    start(async () => {
      const r = await updateOrgSettings(changed);
      if (r.ok) toast.success(r.message);
                else toast.error(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Panel>
        <PanelHeader title="Entreprise" />
        <Row title="Nom" description={isAdmin ? undefined : "Modifiable par un administrateur."}>
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} disabled={!isAdmin} className="w-72" />
        </Row>
        <Row title="Secteur" description="Le pack hôtellerie-restauration active le suivi des 6 fériés garantis (convention HCR, IDCC 1979).">
          <Select value={v.sector} onChange={(e) => set("sector", e.target.value as Organization["sector"])} disabled={!isAdmin} className="w-72">
            <option value="general">Autre secteur</option>
            <option value="hcr">Hôtellerie, cafés, restaurants (HCR)</option>
          </Select>
        </Row>
        <Row title="Fuseau horaire">
          <Select value={v.timezone} onChange={(e) => set("timezone", e.target.value)} className="w-72">
            {timezones.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Row>
        <Row title="Calendrier des jours fériés" description="Alsace-Moselle : Vendredi saint et 26 décembre. Outre-mer : jour de l'abolition de l'esclavage.">
          <Select value={v.holiday_region} onChange={(e) => set("holiday_region", e.target.value)} className="w-72">
            {Object.entries(regionLabels).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Row>
        <Row title="Jours d'ouverture" description="Utilisés pour le décompte en jours ouvrés et le calcul de l'effectif présent.">
          <div className="flex flex-wrap gap-1">
            {weekDays.map((w) => {
              const on = v.work_days.includes(w.n);
              return (
                <button
                  key={w.n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("work_days", on ? v.work_days.filter((x) => x !== w.n) : [...v.work_days, w.n].sort())}
                  className={cn("h-9 w-11 rounded-ctl border text-sm", on ? "border-ink bg-ink font-semibold text-white" : "border-line-strong text-ink-soft")}
                >
                  {w.short}
                </button>
              );
            })}
          </div>
        </Row>
        <Row title="Jours fériés chômés" description="Désactivez si l'établissement reste ouvert les jours fériés : ils sont alors décomptés comme des jours normaux pendant les congés.">
          <Switch checked={v.holidays_off} onCheckedChange={(c) => set("holidays_off", c)} aria-label="Jours fériés chômés" />
        </Row>
      </Panel>

      <Panel>
        <PanelHeader title="Congés payés" />
        <Row title="Décompte" description="Jours ouvrables : du lundi au samedi, 30 jours par an (règle légale). Jours ouvrés : jours d'ouverture, 25 jours par an.">
          <Select value={v.cp_counting} onChange={(e) => set("cp_counting", e.target.value as Organization["cp_counting"])} className="w-72">
            <option value="ouvrables">Jours ouvrables (2,5 j par mois)</option>
            <option value="ouvres">Jours ouvrés (2,08 j par mois)</option>
          </Select>
        </Row>
        <Row title="Début de la période d'acquisition" description="Par défaut le 1er juin (période légale du 1er juin au 31 mai).">
          <Select value={v.cp_period_start_month} onChange={(e) => set("cp_period_start_month", Number(e.target.value))} className="w-72">
            {months.map((m, i) => (
              <option key={m} value={i + 1}>
                1er {m}
              </option>
            ))}
          </Select>
        </Row>
        <Row title="Congés par anticipation" description="Autorise à poser des jours en cours d'acquisition (période N), et pas seulement ceux de la période précédente.">
          <Switch checked={v.allow_anticipation} onCheckedChange={(c) => set("allow_anticipation", c)} aria-label="Congés par anticipation" />
        </Row>
        <Row title="Solde négatif" description="Autorise les salariés à descendre sous zéro, dans la limite indiquée.">
          <div className="flex items-center gap-3">
            {v.allow_negative_balance && (
              <span className="flex items-center gap-1.5 text-sm">
                jusqu&apos;à
                <Input type="number" min={0} max={30} step={0.5} value={v.negative_balance_limit} onChange={(e) => set("negative_balance_limit", Number(e.target.value))} className="w-20" />
                j
              </span>
            )}
            <Switch checked={v.allow_negative_balance} onCheckedChange={(c) => set("allow_negative_balance", c)} aria-label="Solde négatif autorisé" />
          </div>
        </Row>
        <Row title="Délai de prévenance" description="Nombre de jours minimum entre la demande et le début des congés (0 = aucun).">
          <span className="flex items-center gap-1.5 text-sm">
            <Input type="number" min={0} max={365} value={v.min_notice_days} onChange={(e) => set("min_notice_days", Number(e.target.value))} className="w-20" /> jours
          </span>
        </Row>
        <Row title="Jours de fractionnement" description="Calcul assisté après le 31 octobre. Désactivez si vos salariés y renoncent par accord.">
          <Switch checked={v.fractionnement_enabled} onCheckedChange={(c) => set("fractionnement_enabled", c)} aria-label="Fractionnement" />
        </Row>
      </Panel>

      <Panel>
        <PanelHeader title="Validation et sécurité" />
        <Row title="Double validation" description="Après l'accord du manager, la demande doit aussi être validée par les RH.">
          <Switch checked={v.hr_approval_required} onCheckedChange={(c) => set("hr_approval_required", c)} aria-label="Double validation" />
        </Row>
        <Row title="Double authentification obligatoire" description="Les RH et administrateurs devront configurer une application d'authentification (Google Authenticator, Microsoft Authenticator...).">
          <Switch checked={v.mfa_required} onCheckedChange={(c) => set("mfa_required", c)} disabled={!isAdmin} aria-label="Double authentification obligatoire" />
        </Row>
      </Panel>

      {!org.has_demo_data && (
        <Panel>
          <Row title="Équipe d'exemple" description="Ajoute 9 salariés fictifs avec des absences pour faire une démonstration. Supprimables en un clic.">
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await addDemoData();
                  if (r.ok) toast.success(r.message);
                else toast.error(r.error);
                })
              }
            >
              Ajouter l&apos;équipe d&apos;exemple
            </Button>
          </Row>
        </Panel>
      )}

      {isAdmin && (
        <Panel className="border-danger/30">
          <Row title="Supprimer l'espace" description="Supprime définitivement l'entreprise, ses salariés, leurs absences et l'historique. Pensez à exporter vos données avant.">
            <ConfirmButton
              variant="danger-outline"
              title="Supprimer définitivement l'espace ?"
              description="Toutes les données seront effacées sans possibilité de retour."
              confirmLabel="Supprimer l'espace"
              tone="danger"
              typeToConfirm={org.name}
              onConfirm={() => deleteOrganization(org.name)}
            >
              Supprimer l&apos;espace
            </ConfirmButton>
          </Row>
        </Panel>
      )}

      <div
        className={cn(
          "fixed inset-x-0 bottom-16 z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur transition-transform lg:bottom-0 lg:left-[264px]",
          dirty ? "visible translate-y-0" : "invisible translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-end gap-3 px-0 lg:px-4">
          <span className="text-sm text-muted">Modifications non enregistrées</span>
          <Button variant="outline" onClick={() => setV({ ...org })} disabled={pending}>
            Annuler
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
