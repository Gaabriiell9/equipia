"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { fmtNum, periodLabel } from "@/lib/format";
import { ProUpsell } from "@/components/ui/pro";
import { closePeriod, computeFractionnement, runAccruals } from "@/app/app/actions/admin";

type FracRow = { member_id: string; name: string; acquired: number; taken_in_window: number; principal_outside: number; days: number; reason: string | null; already_applied: boolean };
type CloseRow = { member_id: string; name: string; balance: number; carry: number; expire: number };

export function CounterTools({
  lastMonth,
  periods,
  cpPeriods,
  fractionnementEnabled,
  cpCounting,
  pro,
}: {
  lastMonth: string;
  periods: { typeId: string; name: string; kind: "cp" | "civil"; options: string[] }[];
  cpPeriods: string[];
  fractionnementEnabled: boolean;
  cpCounting: string;
  pro: boolean;
}) {
  const [pending, start] = useTransition();
  const [month, setMonth] = useState(lastMonth);
  const [fracPeriod, setFracPeriod] = useState(cpPeriods[0] ?? "");
  const [frac, setFrac] = useState<{ rows: FracRow[]; window_end: string } | null>(null);
  const [closeType, setCloseType] = useState(periods[0]?.typeId ?? "");
  const closeOptions = periods.find((p) => p.typeId === closeType);
  const [closeStart, setCloseStart] = useState(periods[0]?.options[0] ?? "");
  const [close, setClose] = useState<CloseRow[] | null>(null);

  return (
    <div className="divide-y divide-line">
      <section className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h3 className="font-semibold">Acquisition des droits</h3>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Recalcule un mois terminé (par exemple après la saisie tardive d&apos;un arrêt maladie, qui réduit l&apos;acquisition à 2 jours ouvrables par mois). Le recalcul remplace le calcul précédent, sans doublon.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Field label="Mois" htmlFor="acc-month">
            <Input id="acc-month" type="month" value={month} max={lastMonth.slice(0, 4) + "-12"} onChange={(e) => setMonth(e.target.value)} className="w-44" />
          </Field>
          <Button
            variant="dark"
            disabled={pending || !month}
            onClick={() =>
              start(async () => {
                const r = await runAccruals(`${month}-01`);
                if (r.ok) toast.success(r.message);
                else toast.error(r.error);
              })
            }
          >
            Recalculer
          </Button>
        </div>
      </section>

      {pro && cpPeriods.length > 0 && (
        <section className="p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h3 className="font-semibold">Jours de fractionnement</h3>
              <p className="mt-1 max-w-xl text-sm text-muted">
                Après le 31 octobre : 1 jour supplémentaire s&apos;il reste {cpCounting === "ouvres" ? "3 ou 4" : "3 à 5"} jours du congé principal, 2 jours à partir de {cpCounting === "ouvres" ? "5" : "6"} (5e semaine exclue).
                {!fractionnementEnabled && " Désactivé dans les paramètres."}
              </p>
            </div>
            <div className="flex items-end gap-2">
              <Field label="Période d'acquisition" htmlFor="frac-period">
                <Select id="frac-period" value={fracPeriod} onChange={(e) => { setFracPeriod(e.target.value); setFrac(null); }} className="w-56">
                  {cpPeriods.map((p) => (
                    <option key={p} value={p}>
                      {periodLabel(p, "cp")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button
                variant="outline"
                disabled={pending || !fractionnementEnabled}
                onClick={() =>
                  start(async () => {
                    const r = await computeFractionnement(fracPeriod, false);
                    if (r.ok) setFrac(r.data as { rows: FracRow[]; window_end: string });
                    else toast.error(r.error);
                  })
                }
              >
                Calculer
              </Button>
            </div>
          </div>
          {frac && (
            <div className="mt-4">
              <ResultTable
                head={["Salarié", "Acquis", "Pris mai-oct.", "Reste du principal", "Jours", ""]}
                rows={frac.rows.map((r) => [
                  r.name,
                  fmtNum(r.acquired),
                  fmtNum(r.taken_in_window),
                  fmtNum(r.principal_outside),
                  <strong key="d">{r.days}</strong>,
                  <span key="r" className="text-xs text-muted">{r.already_applied ? "Déjà attribué" : r.reason}</span>,
                ])}
              />
              <div className="mt-3 flex justify-end">
                <Button
                  disabled={pending || !frac.rows.some((r) => r.days > 0 && !r.already_applied)}
                  onClick={() =>
                    start(async () => {
                      const r = await computeFractionnement(fracPeriod, true);
                      if (r.ok) {
                        toast.success(r.message);
                        setFrac(r.data as { rows: FracRow[]; window_end: string });
                      } else toast.error(r.error);
                    })
                  }
                >
                  Attribuer les jours
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {!pro ? (
        <section className="p-5">
          <ProUpsell title="Fractionnement et clôture des périodes" description="Calcul des jours de fractionnement après le 31 octobre et clôture de période avec aperçu du report et des jours perdus." />
        </section>
      ) : (
      <section className="p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <h3 className="font-semibold">Clôture d&apos;une période</h3>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Les jours restants sont reportés sur la période suivante dans la limite fixée par le type d&apos;absence, le reste est perdu. À faire en fin de période de prise.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Compteur" htmlFor="close-type">
              <Select
                id="close-type"
                value={closeType}
                onChange={(e) => {
                  setCloseType(e.target.value);
                  setCloseStart(periods.find((p) => p.typeId === e.target.value)?.options[0] ?? "");
                  setClose(null);
                }}
                className="w-44"
              >
                {periods.map((p) => (
                  <option key={p.typeId} value={p.typeId}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Période" htmlFor="close-period">
              <Select id="close-period" value={closeStart} onChange={(e) => { setCloseStart(e.target.value); setClose(null); }} className="w-56">
                {closeOptions?.options.map((o) => (
                  <option key={o} value={o}>
                    {periodLabel(o, closeOptions.kind)}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              variant="outline"
              disabled={pending || !closeType}
              onClick={() =>
                start(async () => {
                  const r = await closePeriod(closeType, closeStart, false);
                  if (r.ok) setClose((r.data as { rows: CloseRow[] }).rows);
                  else toast.error(r.error);
                })
              }
            >
              Aperçu
            </Button>
          </div>
        </div>
        {close && (
          <div className="mt-4">
            {close.length === 0 ? (
              <p className="text-sm text-muted">Aucun solde à clôturer sur cette période.</p>
            ) : (
              <>
                <ResultTable
                  head={["Salarié", "Solde", "Reporté", "Perdu"]}
                  rows={close.map((r) => [r.name, fmtNum(r.balance), fmtNum(r.carry), <span key="e" className={r.expire > 0 ? "font-semibold text-danger" : ""}>{fmtNum(r.expire)}</span>])}
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="danger"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await closePeriod(closeType, closeStart, true);
                        if (r.ok) {
                          toast.success(r.message);
                          setClose(null);
                        } else toast.error(r.error);
                      })
                    }
                  >
                    Clôturer la période
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </section>
      )}
    </div>
  );
}

function ResultTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-ctl border border-line">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface">
          <tr className="text-left text-[13px] text-muted">
            {head.map((h, i) => (
              <th key={i} className={i === 0 ? "px-3 py-2 font-medium" : "px-3 py-2 text-right font-medium"}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? "px-3 py-2" : "tabular px-3 py-2 text-right"}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
