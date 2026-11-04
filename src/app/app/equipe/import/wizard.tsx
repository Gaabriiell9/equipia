"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { Panel, PanelHeader } from "@/components/ui/display";
import { importMembers, type ImportReport } from "@/app/app/actions/admin";

// Colonnes reconnues (en-têtes français ou anglais, insensibles à la casse et aux accents)
const COLUMNS: Record<string, string[]> = {
  email: ["email", "e-mail", "mail", "courriel"],
  first_name: ["prenom", "first_name", "firstname"],
  last_name: ["nom", "last_name", "lastname", "nom de famille"],
  role: ["role"],
  team: ["equipe", "service", "team"],
  manager_email: ["manager_email", "email manager", "manager", "responsable"],
  job_title: ["poste", "fonction", "job_title", "emploi"],
  contract_type: ["contrat", "type de contrat", "contract_type"],
  hire_date: ["date_entree", "date d'entree", "entree", "hire_date", "date d'embauche"],
  end_date: ["date_fin", "fin de contrat", "end_date", "date de fin"],
  employee_number: ["matricule", "employee_number", "numero"],
  cp_previous: ["cp_n1", "cp n-1", "cp_previous", "solde cp n-1"],
  cp_current: ["cp_n", "cp n", "cp_current", "solde cp n"],
  rtt: ["rtt", "solde rtt"],
  rec: ["recup", "recuperation", "rec"],
  fg: ["feries_garantis", "feries garantis", "fg"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const ROLE_MAP: Record<string, string> = { salarie: "employee", employe: "employee", employee: "employee", manager: "manager", responsable: "manager", rh: "hr", hr: "hr", admin: "admin", administrateur: "admin" };

function toIsoDate(v: string) {
  const s = v.trim();
  if (!s) return "";
  const fr = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  return s;
}

function mapRows(data: Record<string, string>[]) {
  if (!data.length) return { rows: [], unknown: [] as string[] };
  const headers = Object.keys(data[0]);
  const mapping: Record<string, string> = {};
  const unknown: string[] = [];
  for (const h of headers) {
    const key = Object.entries(COLUMNS).find(([, aliases]) => aliases.includes(norm(h)))?.[0];
    if (key) mapping[h] = key;
    else if (h.trim()) unknown.push(h);
  }
  const rows = data
    .map((raw) => {
      const out: Record<string, string> = {};
      for (const [h, key] of Object.entries(mapping)) {
        let v = String(raw[h] ?? "").trim();
        if (key === "hire_date" || key === "end_date") v = toIsoDate(v);
        if (["cp_previous", "cp_current", "rtt", "rec", "fg"].includes(key)) v = v.replace(",", ".").replace(/\s/g, "");
        if (key === "role") v = ROLE_MAP[norm(v)] ?? v;
        if (key === "contract_type") v = norm(v);
        out[key] = v;
      }
      return out;
    })
    .filter((r) => Object.values(r).some(Boolean));
  return { rows, unknown };
}

export function ImportWizard({ hcr }: { hcr: boolean }) {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [done, setDone] = useState<ImportReport | null>(null);
  const [invite, setInvite] = useState(true);
  const [pending, start] = useTransition();

  function onFile(file: File) {
    setReport(null);
    setDone(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const m = mapRows(res.data);
        setRows(m.rows);
        setUnknown(m.unknown);
        if (!m.rows.length) toast.error("Aucune ligne exploitable dans ce fichier.");
        else
          start(async () => {
            const r = await importMembers(m.rows, true, false);
            if (r.ok) setReport(r.data!);
            else toast.error(r.error);
          });
      },
      error: () => toast.error("Fichier illisible. Enregistrez-le au format CSV (UTF-8)."),
    });
  }

  const template = [
    "email;prenom;nom;equipe;poste;role;manager_email;contrat;date_entree;date_fin;matricule;cp_n1;cp_n;rtt;recup" + (hcr ? ";feries_garantis" : ""),
    "lea.martin@exemple.fr;Léa;Martin;Salle;Serveuse;salarie;sophie.laurent@exemple.fr;cdi;01/09/2022;;0012;12,5;10;;" + (hcr ? ";6" : ""),
    "sophie.laurent@exemple.fr;Sophie;Laurent;Salle;Maîtresse d'hôtel;manager;;cdi;15/03/2018;;0004;20;10;;2" + (hcr ? ";6" : ""),
  ].join("\n");
  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + template)}`;

  if (done) {
    return (
      <Panel className="p-6">
        <CheckCircle2 className="size-8 text-ok" />
        <p className="mt-3 text-lg font-bold">Import terminé</p>
        <p className="mt-1 text-ink-soft">
          {done.created} salarié(s) créé(s), {done.updated} mis à jour.{invite && done.created ? " Les invitations sont parties." : ""}
        </p>
        {done.errors.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-wait">
            {done.errors.map((e, i) => (
              <li key={i}>
                {e.email} : {e.message}
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-5" variant="dark" onClick={() => router.push("/app/equipe")}>
          Voir les salariés
        </Button>
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <Panel>
          <PanelHeader title="Fichier CSV" description="Séparateur point-virgule ou virgule. Les dates au format JJ/MM/AAAA sont acceptées." />
          <div className="p-5">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-panel border-2 border-dashed border-line-strong px-4 py-10 text-center hover:bg-surface">
              <FileSpreadsheet className="size-8 text-muted" />
              <span className="font-semibold">{fileName || "Choisir un fichier"}</span>
              <span className="text-sm text-muted">{rows.length ? `${rows.length} ligne(s) détectée(s)` : "ou glissez-le ici"}</span>
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
            {unknown.length > 0 && <p className="mt-3 text-[13px] text-muted">Colonnes ignorées : {unknown.join(", ")}</p>}
          </div>
        </Panel>

        {rows.length > 0 && (
          <Panel>
            <PanelHeader title="Aperçu" description={rows.length > 8 ? `8 premières lignes sur ${rows.length}` : undefined} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[13px] text-muted">
                    {["E-mail", "Prénom", "Nom", "Équipe", "Poste", "Entrée", "CP N-1", "CP N"].map((h) => (
                      <th key={h} className="px-4 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-b border-line last:border-0">
                      {[r.email, r.first_name, r.last_name, r.team, r.job_title, r.hire_date, r.cp_previous, r.cp_current].map((v, j) => (
                        <td key={j} className="px-4 py-2 whitespace-nowrap">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <Panel className="p-5">
          <p className="font-semibold">Modèle</p>
          <p className="mt-1 text-sm text-muted">Colonnes obligatoires : email, prenom, nom. Les autres sont facultatives.</p>
          <Button asChild variant="outline" className="mt-3 w-full">
            <a href={templateHref} download="modele-import-equipia.csv">
              <Download /> Télécharger le modèle
            </a>
          </Button>
        </Panel>
        {report && (
          <Panel className="p-5">
            <p className="font-semibold">Vérification</p>
            {report.errors.length ? (
              <>
                <p className="mt-1 text-sm text-danger">{report.errors.length} ligne(s) à corriger avant l&apos;import :</p>
                <ul className="mt-2 max-h-56 overflow-y-auto text-sm">
                  {report.errors.map((e, i) => (
                    <li key={i} className="border-b border-line py-1.5 last:border-0">
                      Ligne {e.line} ({e.email || "sans e-mail"}) : {e.message}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-ink-soft">
                  Tout est correct : {report.new} nouveau(x) salarié(s), {(report.rows ?? 0) - (report.new ?? 0)} mis à jour.
                </p>
                <Checkbox className="mt-4" checked={invite} onChange={(e) => setInvite(e.target.checked)} label="Envoyer les invitations aux nouveaux salariés" />
                <Button
                  className="mt-4 w-full"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await importMembers(rows, false, invite);
                      if (r.ok) setDone(r.data!);
                      else toast.error(r.error);
                    })
                  }
                >
                  {pending ? "Import en cours..." : `Importer ${rows.length} salarié(s)`}
                </Button>
              </>
            )}
          </Panel>
        )}
      </aside>
    </div>
  );
}
