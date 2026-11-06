"use client";

import { useState, useTransition } from "react";
import { Mail, Pencil, Scale } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm";
import { Panel } from "@/components/ui/display";
import { Field, Input, Select } from "@/components/ui/field";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { MemberForm } from "@/components/app/member-form";
import type { LeaveType, Member, MemberContract, Role, Team } from "@/lib/types";
import { adjustBalance, anonymizeMember, sendInvitation, setMemberActive } from "@/app/app/actions/admin";

export function MemberAdmin({
  member,
  contract,
  teams,
  managers,
  types,
  isAdmin,
  isSelf,
}: {
  member: Member;
  contract: MemberContract | null;
  teams: Pick<Team, "id" | "name">[];
  managers: { id: string; name: string; role: Role }[];
  types: Pick<LeaveType, "id" | "name">[];
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [pending, start] = useTransition();
  const [sign, setSign] = useState<"+" | "-">("+");

  return (
    <Panel className="flex flex-col gap-2 p-5">
      <p className="mb-1 font-semibold">Gestion RH</p>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="justify-start">
            <Pencil /> Modifier la fiche
          </Button>
        </DialogTrigger>
        <DialogContent title={`Fiche de ${member.first_name} ${member.last_name}`} className="sm:max-w-2xl">
          <MemberForm member={member} contract={contract} teams={teams} managers={managers} isAdmin={isAdmin} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {types.length > 0 && (
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="justify-start">
              <Scale /> Ajuster un compteur
            </Button>
          </DialogTrigger>
          <DialogContent title="Ajuster un compteur" description="Reprise de solde, correction, heures supplémentaires à récupérer... Le mouvement est tracé dans l'historique.">
            <form
              className="flex flex-col gap-4"
              action={(fd) =>
                start(async () => {
                  const amount = Number(String(fd.get("amount")).replace(",", "."));
                  if (!amount || Number.isNaN(amount)) return void toast.error("Indiquez un nombre de jours.");
                  const r = await adjustBalance(
                    member.id,
                    String(fd.get("type")),
                    sign === "-" ? -Math.abs(amount) : Math.abs(amount),
                    fd.get("period") === "previous" ? "previous" : "current",
                    String(fd.get("note") ?? ""),
                  );
                  if (r.ok) {
                    toast.success(r.message);
                    setAdjustOpen(false);
                  } else toast.error(r.error);
                })
              }
            >
              <Field label="Compteur" htmlFor="adj-type">
                <Select id="adj-type" name="type">
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <Field label="Sens">
                  <div className="grid h-10 grid-cols-2 gap-1 rounded-ctl bg-surface p-1">
                    {(["+", "-"] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setSign(s)} className={sign === s ? "rounded-[6px] bg-paper px-3 font-bold shadow-sm" : "px-3 text-muted"}>
                        {s === "+" ? "Ajouter" : "Retirer"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Nombre de jours" htmlFor="adj-amount">
                  <Input id="adj-amount" name="amount" inputMode="decimal" placeholder="Ex. : 2,5" required />
                </Field>
              </div>
              <Field label="Période" htmlFor="adj-period" hint="Pour les congés payés : N-1 = jours acquis sur la période précédente, à prendre maintenant.">
                <Select id="adj-period" name="period" defaultValue="current">
                  <option value="current">Période en cours (N)</option>
                  <option value="previous">Période précédente (N-1)</option>
                </Select>
              </Field>
              <Field label="Motif" htmlFor="adj-note">
                <Input id="adj-note" name="note" required minLength={3} placeholder="Ex. : reprise du solde au 1er novembre" />
              </Field>
              <Button type="submit" variant="dark" disabled={pending}>
                {pending ? "Enregistrement..." : "Enregistrer l'ajustement"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {member.status === "invited" && !member.is_demo && (
        <Button
          variant="outline"
          className="justify-start"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await sendInvitation(member.id);
              if (r.ok) toast.success(r.message);
                else toast.error(r.error);
            })
          }
        >
          <Mail /> {member.invited_at ? "Relancer l'invitation" : "Envoyer l'invitation"}
        </Button>
      )}

      {!isSelf && member.status !== "disabled" && (
        <ConfirmButton
          variant="ghost"
          className="justify-start text-danger hover:bg-danger-soft hover:text-danger"
          title={`Désactiver ${member.first_name} ${member.last_name} ?`}
          description="La personne ne pourra plus se connecter et disparaît du planning. Son historique est conservé (obligations légales) et vous pourrez la réactiver."
          confirmLabel="Désactiver"
          tone="danger"
          onConfirm={() => setMemberActive(member.id, false)}
        >
          Désactiver (départ de l&apos;entreprise)
        </ConfirmButton>
      )}
      {member.status === "disabled" && (
        <>
          <Button
            variant="outline"
            className="justify-start"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await setMemberActive(member.id, true);
                if (r.ok) toast.success(r.message);
                else toast.error(r.error);
              })
            }
          >
            Réactiver
          </Button>
          {isAdmin && (
            <ConfirmButton
              variant="ghost"
              className="justify-start text-danger hover:bg-danger-soft hover:text-danger"
              title="Anonymiser ce salarié ?"
              description="Nom, e-mail, notes et justificatifs sont effacés définitivement (droit à l'effacement RGPD). Les absences restent comptabilisées de façon anonyme. Action irréversible."
              confirmLabel="Anonymiser définitivement"
              tone="danger"
              typeToConfirm="ANONYMISER"
              onConfirm={() => anonymizeMember(member.id)}
            >
              Anonymiser (RGPD)
            </ConfirmButton>
          )}
        </>
      )}
    </Panel>
  );
}
