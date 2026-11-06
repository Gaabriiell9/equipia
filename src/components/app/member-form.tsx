"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/field";
import { contractLabels, roleLabels, weekDays, cn } from "@/lib/format";
import type { Member, MemberContract, Role, Team } from "@/lib/types";
import { inviteMember, updateMember } from "@/app/app/actions/admin";

type Opt = { id: string; name: string };
type ManagerOpt = Opt & { role: Role };

export function MemberForm({
  member,
  contract,
  teams,
  managers,
  isAdmin,
  onDone,
}: {
  member?: Member;
  contract?: MemberContract | null;
  teams: Pick<Team, "id" | "name">[];
  managers: ManagerOpt[];
  isAdmin: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [workDays, setWorkDays] = useState<number[]>(member?.work_days ?? []);
  const editing = !!member;
  const roles: Role[] = isAdmin ? ["employee", "manager", "hr", "admin"] : ["employee", "manager"];

  function submit(fd: FormData) {
    setError(null);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    start(async () => {
      if (editing) {
        const patch: Record<string, unknown> = {
          first_name: v("first_name"),
          last_name: v("last_name"),
          job_title: v("job_title"),
          team_id: v("team_id"),
          manager_id: v("manager_id"),
          contract_type: v("contract_type"),
          hire_date: v("hire_date"),
          end_date: v("end_date"),
          employee_number: v("employee_number"),
          weekly_hours: v("weekly_hours"),
          hr_notes: v("hr_notes"),
          work_days: workDays,
        };
        if (!member.user_id) patch.email = v("email").toLowerCase();
        if (v("role") && v("role") !== member.role) patch.role = v("role");
        const r = await updateMember(member.id, patch);
        if (!r.ok) return setError(r.error);
        toast.success(r.message);
        onDone?.();
        router.refresh();
      } else {
        const r = await inviteMember(
          {
            email: v("email"),
            first_name: v("first_name"),
            last_name: v("last_name"),
            role: v("role") || "employee",
            team_id: v("team_id") || null,
            manager_id: v("manager_id") || null,
            job_title: v("job_title") || null,
            contract_type: v("contract_type") || "cdi",
            hire_date: v("hire_date") || null,
            end_date: v("end_date") || null,
            employee_number: v("employee_number") || null,
          },
          fd.get("send") === "on",
        );
        if (!r.ok) return setError(r.error);
        toast.success(r.message);
        onDone?.();
        router.push(`/app/equipe/${r.data!.id}`);
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <FormError message={error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="m-first">
          <Input id="m-first" name="first_name" defaultValue={member?.first_name} required />
        </Field>
        <Field label="Nom" htmlFor="m-last">
          <Input id="m-last" name="last_name" defaultValue={member?.last_name} required />
        </Field>
      </div>
      <Field label="E-mail" htmlFor="m-email" hint={member?.user_id ? "Le compte est activé : l'e-mail ne peut plus être modifié ici." : undefined}>
        <Input id="m-email" name="email" type="email" defaultValue={member?.email} required disabled={!!member?.user_id} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Poste" htmlFor="m-job">
          <Input id="m-job" name="job_title" defaultValue={member?.job_title ?? ""} placeholder="Ex. : Commis de cuisine" />
        </Field>
        <Field label="Rôle dans Équipia" htmlFor="m-role">
          <Select id="m-role" name="role" defaultValue={member?.role ?? "employee"} disabled={!!member && member.role === "admin" && !isAdmin}>
            {(member && !roles.includes(member.role) ? [...roles, member.role] : roles).map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Équipe" htmlFor="m-team">
          <Select id="m-team" name="team_id" defaultValue={member?.team_id ?? ""}>
            <option value="">Aucune</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Manager (valide ses absences)" htmlFor="m-manager">
          <Select id="m-manager" name="manager_id" defaultValue={member?.manager_id ?? ""}>
            <option value="">Aucun (validation par les RH)</option>
            {managers
              // Seuls les comptes au rôle Manager peuvent valider (le manager actuel reste affiché)
              .filter((m) => m.id !== member?.id && (m.role === "manager" || m.id === member?.manager_id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Contrat" htmlFor="m-contract">
          <Select id="m-contract" name="contract_type" defaultValue={contract?.contract_type ?? "cdi"}>
            {Object.entries(contractLabels).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date d'entrée" htmlFor="m-hire" hint="Pour l'ancienneté et le prorata.">
          <Input id="m-hire" name="hire_date" type="date" defaultValue={contract?.hire_date ?? ""} />
        </Field>
        <Field label="Fin de contrat" htmlFor="m-end">
          <Input id="m-end" name="end_date" type="date" defaultValue={contract?.end_date ?? ""} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Matricule paie" htmlFor="m-number">
          <Input id="m-number" name="employee_number" defaultValue={contract?.employee_number ?? ""} />
        </Field>
        {editing && (
          <Field label="Heures par semaine" htmlFor="m-hours">
            <Input id="m-hours" name="weekly_hours" type="number" step="0.5" min="0" max="60" defaultValue={contract?.weekly_hours ?? ""} />
          </Field>
        )}
      </div>
      {editing && (
        <>
          <div>
            <p className="mb-1.5 text-sm font-semibold">Jours habituellement travaillés</p>
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map((w) => {
                const on = workDays.includes(w.n);
                return (
                  <button
                    key={w.n}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setWorkDays(on ? workDays.filter((x) => x !== w.n) : [...workDays, w.n].sort())}
                    className={cn("h-9 w-12 rounded-ctl border text-sm", on ? "border-ink bg-ink font-semibold text-white" : "border-line-strong text-ink-soft")}
                  >
                    {w.short}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[13px] text-muted">
              {workDays.length ? "Sert au calcul de l'effectif présent." : "Vide : les jours d'ouverture de l'entreprise sont utilisés."}
            </p>
          </div>
          <Field label="Notes RH (confidentielles)" htmlFor="m-notes" hint="Visibles uniquement par les RH et la ligne managériale.">
            <Textarea id="m-notes" name="hr_notes" defaultValue={contract?.hr_notes ?? ""} maxLength={2000} />
          </Field>
        </>
      )}
      {!editing && (
        <Checkbox name="send" defaultChecked label="Envoyer l'invitation par e-mail maintenant" description="Le salarié choisira son mot de passe. Vous pouvez aussi l'inviter plus tard." />
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending} variant="dark">
          {pending ? "Enregistrement..." : editing ? "Enregistrer" : "Ajouter le salarié"}
        </Button>
      </div>
    </form>
  );
}
