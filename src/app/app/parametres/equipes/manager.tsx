"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { EmptyState, Panel } from "@/components/ui/display";
import { Field, Input } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import type { Team } from "@/lib/types";
import { deleteTeam, upsertTeam } from "@/app/app/actions/admin";

const palette = ["#2563eb", "#ea580c", "#7c3aed", "#059669", "#db2777", "#0891b2", "#a16207", "#475569"];

export function TeamsManager({ teams, counts, pro }: { teams: Team[]; counts: Record<string, number>; pro: boolean }) {
  const [editing, setEditing] = useState<Team | "new" | null>(null);
  const [pending, start] = useTransition();
  const current = editing && editing !== "new" ? editing : null;
  const [color, setColor] = useState(palette[0]);

  function open(t: Team | "new") {
    setColor(t === "new" ? palette[teams.length % palette.length] : t.color);
    setEditing(t);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="max-w-2xl text-sm text-muted">
          L&apos;effectif minimum est le nombre de personnes qui doivent rester présentes. Une alerte prévient le salarié et le valideur si une demande passe en dessous.
        </p>
        <Button variant="dark" onClick={() => open("new")}>
          <Plus /> Nouvelle équipe
        </Button>
      </div>
      <Panel>
        {teams.length === 0 ? (
          <EmptyState title="Aucune équipe" description="Créez vos services (Cuisine, Salle, Atelier...) pour organiser le planning." />
        ) : (
          teams.map((t) => (
            <div key={t.id} className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-0">
              <span className="size-3 rounded-full" style={{ background: t.color }} />
              <span className="flex-1">
                <span className="block font-semibold">{t.name}</span>
                <span className="block text-[13px] text-muted">
                  {counts[t.id] ?? 0} personne{(counts[t.id] ?? 0) > 1 ? "s" : ""}
                  {t.min_present > 0 ? `, ${t.min_present} présente${t.min_present > 1 ? "s" : ""} au minimum` : ", pas d'effectif minimum"}
                </span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => open(t)}>
                Modifier
              </Button>
              <ConfirmButton
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-soft hover:text-danger"
                title={`Supprimer l'équipe « ${t.name} » ?`}
                description="Les salariés de l'équipe restent dans l'entreprise, sans équipe."
                confirmLabel="Supprimer"
                tone="danger"
                onConfirm={() => deleteTeam(t.id)}
              >
                Supprimer
              </ConfirmButton>
            </div>
          ))
        )}
      </Panel>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent title={current ? `Équipe ${current.name}` : "Nouvelle équipe"}>
            <form
              className="flex flex-col gap-4"
              action={(fd) =>
                start(async () => {
                  const r = await upsertTeam(current?.id ?? null, String(fd.get("name") ?? ""), color, Number(fd.get("min") ?? 0));
                  if (r.ok) {
                    toast.success(r.message);
                    setEditing(null);
                  } else toast.error(r.error);
                })
              }
            >
              <Field label="Nom" htmlFor="team-name">
                <Input id="team-name" name="name" defaultValue={current?.name} required maxLength={80} placeholder="Ex. : Commercial, Atelier, Accueil" />
              </Field>
              <Field
                label={pro ? "Effectif minimum présent" : "Effectif minimum présent (offre Pro)"}
                htmlFor="team-min"
                hint={pro ? "0 pour ne pas surveiller l'effectif." : "Avec l'offre Pro, une alerte prévient le manager avant qu'il valide une absence qui ferait passer l'équipe sous ce seuil."}
              >
                <Input id="team-min" name="min" type="number" min={0} max={500} defaultValue={current?.min_present ?? 0} disabled={!pro} className="w-28" />
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-semibold">Couleur</p>
                <div className="flex gap-2">
                  {palette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      aria-label={`Couleur ${c}`}
                      aria-pressed={color === c}
                      className="size-8 rounded-full ring-offset-2 aria-pressed:ring-2 aria-pressed:ring-ink"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="dark" disabled={pending}>
                  {pending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
