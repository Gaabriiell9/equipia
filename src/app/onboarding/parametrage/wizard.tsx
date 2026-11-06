"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, ViewTransition } from "react";
import { toast } from "sonner";
import { Check, FileSpreadsheet, Plus, Trash2, UserPlus } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Avatar, Badge } from "@/components/ui/display";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { ProBadge } from "@/components/ui/pro";
import { cn, regionLabels, roleLabels, weekDays } from "@/lib/format";
import type { Organization, Role, Team } from "@/lib/types";
import { deleteTeam, inviteMember, sendInvitation, updateOrgSettings, upsertTeam } from "@/app/app/actions/admin";

export type SetupMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  team_id: string | null;
  manager_id: string | null;
  status: "invited" | "active" | "disabled";
};

const steps = [
  { n: 1, t: "Votre entreprise", d: "Jours travaillés et règles de congés" },
  { n: 2, t: "Vos équipes", d: "Services, ateliers, magasins..." },
  { n: 3, t: "Les personnes et leurs rôles", d: "Salariés, managers, RH" },
  { n: 4, t: "C'est prêt", d: "Invitations et premiers pas" },
];

const roleHelp: { role: Role; text: string }[] = [
  { role: "employee", text: "Pose ses absences, voit ses soldes et le planning de l'équipe." },
  { role: "manager", text: "Valide les demandes de son équipe et voit leurs soldes." },
  { role: "hr", text: "Gère tous les salariés, les compteurs, les exports et les paramètres." },
  { role: "admin", text: "Comme les RH, et gère en plus les rôles RH, la sécurité et l'abonnement." },
];

const teamColors = ["#2563eb", "#7c3aed", "#059669", "#ea580c", "#0891b2", "#db2777", "#a16207", "#64748b"];
const suggestions: Record<Organization["sector"], string[]> = {
  general: ["Direction", "Commercial", "Administration", "Production", "Support client", "Logistique"],
  hcr: ["Cuisine", "Salle", "Réception", "Étages", "Bar"],
};

export function SetupWizard({ step, org, pro, meId, teams, members }: { step: number; org: Organization; pro: boolean; meId: string; teams: Team[]; members: SetupMember[] }) {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <Link href="/app" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
          Terminer plus tard
        </Link>
      </header>
      <div className="mx-auto grid max-w-[1040px] gap-8 px-4 pb-20 lg:grid-cols-[240px_1fr]">
        <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1" aria-label="Étapes du paramétrage">
          {steps.map((s) => {
            const done = s.n < step;
            const current = s.n === step;
            return (
              <li key={s.n} className="shrink-0">
                <Link
                  href={`?etape=${s.n}`}
                  aria-current={current ? "step" : undefined}
                  className={cn("relative flex items-center gap-3 rounded-ctl px-3 py-2.5 transition-colors", current ? "bg-paper shadow-[0_1px_2px_rgba(13,23,48,0.08)]" : "hover:bg-paper/70")}
                >
                  {current && (
                    <ViewTransition name="setup-step" share="indicator">
                      <span className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-full bg-marker-strong" aria-hidden />
                    </ViewTransition>
                  )}
                  <span
                    className={cn(
                      "relative flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                      done ? "bg-ok text-white" : current ? "bg-ink text-white" : "bg-line text-ink-soft",
                    )}
                  >
                    {done ? <Check className="size-4" /> : s.n}
                  </span>
                  <span className="relative hidden flex-col sm:flex">
                    <span className={cn("text-sm", current ? "font-semibold" : "text-ink-soft")}>{s.t}</span>
                    <span className="hidden text-xs text-muted lg:block">{s.d}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <ViewTransition key={step} enter="page" exit="page" default="none">
          <div className="rounded-panel border border-line bg-paper p-5 sm:p-8">
            {step === 1 && <CompanyStep org={org} pro={pro} />}
            {step === 2 && <TeamsStep org={org} teams={teams} />}
            {step === 3 && <PeopleStep teams={teams} members={members} meId={meId} />}
            {step === 4 && <DoneStep members={members} teams={teams} />}
          </div>
        </ViewTransition>
      </div>
    </div>
  );
}

function StepHeader({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-condensed text-[2rem] leading-[1.05] font-bold">{title}</h1>
      <p className="mt-2 max-w-2xl text-[15px] text-ink-soft">{children}</p>
    </div>
  );
}

function StepFooter({ back, next, nextLabel = "Continuer", onNext, pending }: { back?: number; next: number | "app"; nextLabel?: string; onNext?: () => void; pending?: boolean }) {
  const href = next === "app" ? "/app" : `?etape=${next}`;
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
      {back ? (
        <Button asChild variant="ghost">
          <Link href={`?etape=${back}`}>Retour</Link>
        </Button>
      ) : (
        <span />
      )}
      {onNext ? (
        <Button size="lg" onClick={onNext} disabled={pending}>
          {pending ? "Enregistrement..." : nextLabel}
        </Button>
      ) : (
        <Button asChild size="lg">
          <Link href={href}>{nextLabel}</Link>
        </Button>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- étape 1
function CompanyStep({ org, pro }: { org: Organization; pro: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [workDays, setWorkDays] = useState<number[]>(org.work_days);
  const [counting, setCounting] = useState(org.cp_counting);
  const [region, setRegion] = useState(org.holiday_region);
  const [hrApproval, setHrApproval] = useState(org.hr_approval_required);

  function save() {
    if (workDays.length === 0) {
      toast.error("Choisissez au moins un jour travaillé.");
      return;
    }
    const patch: Record<string, unknown> = {};
    if (JSON.stringify(workDays) !== JSON.stringify(org.work_days)) patch.work_days = workDays;
    if (counting !== org.cp_counting) patch.cp_counting = counting;
    if (region !== org.holiday_region) patch.holiday_region = region;
    if (hrApproval !== org.hr_approval_required) patch.hr_approval_required = hrApproval;
    start(async () => {
      if (Object.keys(patch).length) {
        const r = await updateOrgSettings(patch);
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
      }
      router.push("?etape=2");
      router.refresh();
    });
  }

  return (
    <>
      <StepHeader title={`Paramétrons ${org.name}`}>
        Ces réglages servent à décompter les congés correctement. Les valeurs proposées suivent le Code du travail : vous pourrez tout ajuster plus tard dans les paramètres.
      </StepHeader>
      <div className="flex flex-col gap-7">
        <div>
          <p className="text-sm font-semibold">Jours travaillés dans l&apos;entreprise</p>
          <p className="mt-0.5 text-[13px] text-muted">Utilisés pour le planning et le décompte en jours ouvrés.</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {weekDays.map((w) => {
              const on = workDays.includes(w.n);
              return (
                <button
                  key={w.n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setWorkDays(on ? workDays.filter((x) => x !== w.n) : [...workDays, w.n].sort())}
                  className={cn("h-10 w-14 rounded-ctl border text-sm transition-colors active:scale-[0.97]", on ? "border-ink bg-ink font-semibold text-white" : "border-line-strong text-ink-soft hover:bg-surface")}
                >
                  {w.short}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Décompte des congés payés</p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {[
              { v: "ouvrables" as const, t: "Jours ouvrables", d: "Du lundi au samedi, 30 jours par an. C'est la règle légale par défaut." },
              { v: "ouvres" as const, t: "Jours ouvrés", d: "Vos jours travaillés, 25 jours par an. Courant dans les bureaux." },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setCounting(o.v)}
                aria-pressed={counting === o.v}
                className={cn("rounded-ctl border p-4 text-left transition-colors", counting === o.v ? "border-ink ring-1 ring-ink" : "border-line-strong hover:bg-surface")}
              >
                <span className="flex items-center justify-between font-semibold">
                  {o.t}
                  {counting === o.v && <Check className="size-4" />}
                </span>
                <span className="mt-1 block text-[13px] text-muted">{o.d}</span>
              </button>
            ))}
          </div>
        </div>

        <Field label="Calendrier des jours fériés" htmlFor="region" className="max-w-sm">
          <Select id="region" value={region} onChange={(e) => setRegion(e.target.value)}>
            {Object.entries(regionLabels).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="text-sm font-semibold">Qui valide les demandes ?</p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setHrApproval(false)}
              aria-pressed={!hrApproval}
              className={cn("rounded-ctl border p-4 text-left transition-colors", !hrApproval ? "border-ink ring-1 ring-ink" : "border-line-strong hover:bg-surface")}
            >
              <span className="font-semibold">Le manager</span>
              <span className="mt-1 block text-[13px] text-muted">Sa décision est définitive. Sans manager, les RH valident.</span>
            </button>
            <button
              type="button"
              onClick={() => pro && setHrApproval(true)}
              aria-pressed={hrApproval}
              disabled={!pro}
              className={cn("rounded-ctl border p-4 text-left transition-colors disabled:opacity-60", hrApproval ? "border-ink ring-1 ring-ink" : "border-line-strong hover:bg-surface")}
            >
              <span className="flex items-center gap-2 font-semibold">
                Le manager, puis les RH <ProBadge />
              </span>
              <span className="mt-1 block text-[13px] text-muted">Les RH confirment après l&apos;accord du manager.</span>
            </button>
          </div>
        </div>
      </div>
      <StepFooter next={2} onNext={save} pending={pending} />
    </>
  );
}

// ----------------------------------------------------------------- étape 2
function TeamsStep({ org, teams }: { org: Organization; teams: Team[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const existing = new Set(teams.map((t) => t.name.toLowerCase()));

  function add(n: string) {
    const v = n.trim();
    if (!v) return;
    start(async () => {
      const r = await upsertTeam(null, v, teamColors[teams.length % teamColors.length], 0);
      if (r.ok) {
        setName("");
        router.refresh();
      } else toast.error(r.error);
    });
  }
  function remove(id: string) {
    start(async () => {
      const r = await deleteTeam(id);
      if (r.ok) router.refresh();
      else toast.error(r.error);
    });
  }

  return (
    <>
      <StepHeader title="Vos équipes">
        Une équipe regroupe les personnes qui se remplacent : un service, un atelier, un magasin. Elle sert au planning et, avec l&apos;offre Pro, à l&apos;effectif minimum. Cette étape est facultative.
      </StepHeader>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(name);
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'équipe" maxLength={80} aria-label="Nom de l'équipe" />
        <Button type="submit" variant="dark" disabled={pending || !name.trim()}>
          <Plus /> Ajouter
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {suggestions[org.sector]
          .filter((s) => !existing.has(s.toLowerCase()))
          .map((s) => (
            <button key={s} type="button" disabled={pending} onClick={() => add(s)} className="rounded-full border border-dashed border-line-strong px-3 py-1 text-[13px] text-ink-soft transition-colors hover:border-ink hover:text-ink">
              + {s}
            </button>
          ))}
      </div>
      <ul className="mt-6 flex flex-col divide-y divide-line rounded-ctl border border-line">
        {teams.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted">Aucune équipe pour l&apos;instant.</li>
        ) : (
          teams.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="size-3 rounded-[4px]" style={{ background: t.color }} />
              <span className="flex-1 font-medium">{t.name}</span>
              <button type="button" onClick={() => remove(t.id)} disabled={pending} className="rounded-ctl p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger" aria-label={`Supprimer ${t.name}`}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))
        )}
      </ul>
      <StepFooter back={1} next={3} />
    </>
  );
}

// ----------------------------------------------------------------- étape 3
function PeopleStep({ teams, members, meId }: { teams: Team[]; members: SetupMember[]; meId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [role, setRole] = useState<Role>("employee");
  const [formKey, setFormKey] = useState(0);
  const managers = members.filter((m) => m.role !== "employee" || m.id === meId);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const memberName = new Map(members.map((m) => [m.id, `${m.first_name} ${m.last_name}`]));

  function submit(fd: FormData) {
    start(async () => {
      const r = await inviteMember(
        {
          email: String(fd.get("email") ?? ""),
          first_name: String(fd.get("first_name") ?? ""),
          last_name: String(fd.get("last_name") ?? ""),
          role,
          team_id: String(fd.get("team_id") ?? "") || null,
          manager_id: String(fd.get("manager_id") ?? "") || null,
          job_title: String(fd.get("job_title") ?? "") || null,
          contract_type: "cdi",
          hire_date: null,
          end_date: null,
          employee_number: null,
        },
        false,
      );
      if (r.ok) {
        toast.success(`${fd.get("first_name")} a été ajouté(e)`);
        setFormKey((k) => k + 1);
        setRole("employee");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <StepHeader title="Les personnes et leurs rôles">
        Ajoutez au moins les managers et les RH : ce sont eux qui valideront les demandes. Les invitations partiront à l&apos;étape suivante, quand vous le déciderez.
      </StepHeader>

      <div className="grid gap-2 sm:grid-cols-2">
        {roleHelp.map((r) => (
          <button
            key={r.role}
            type="button"
            onClick={() => setRole(r.role)}
            aria-pressed={role === r.role}
            className={cn("rounded-ctl border p-3.5 text-left transition-colors", role === r.role ? "border-ink bg-surface ring-1 ring-ink" : "border-line hover:bg-surface")}
          >
            <span className="flex items-center justify-between text-sm font-semibold">
              {roleLabels[r.role]}
              {role === r.role && <Check className="size-4" />}
            </span>
            <span className="mt-0.5 block text-[13px] text-muted">{r.text}</span>
          </button>
        ))}
      </div>

      <form key={formKey} action={submit} className="mt-5 grid gap-3 rounded-ctl border border-line bg-surface/60 p-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="p-first">
          <Input id="p-first" name="first_name" required maxLength={80} />
        </Field>
        <Field label="Nom" htmlFor="p-last">
          <Input id="p-last" name="last_name" required maxLength={80} />
        </Field>
        <Field label="E-mail professionnel" htmlFor="p-email" className="sm:col-span-2">
          <Input id="p-email" name="email" type="email" required autoComplete="off" />
        </Field>
        <Field label="Équipe" htmlFor="p-team">
          <Select id="p-team" name="team_id" defaultValue="">
            <option value="">Aucune</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Manager (valide ses demandes)" htmlFor="p-manager">
          <Select id="p-manager" name="manager_id" defaultValue="">
            <option value="">Aucun : les RH valident</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.first_name} {m.last_name}
                {m.id === meId ? " (vous)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Poste (facultatif)" htmlFor="p-job" className="sm:col-span-2">
          <Input id="p-job" name="job_title" maxLength={120} />
        </Field>
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <p className="text-[13px] text-muted">
            Rôle : <strong className="text-ink">{roleLabels[role]}</strong>
          </p>
          <Button type="submit" variant="dark" disabled={pending}>
            <UserPlus /> {pending ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </form>

      <ul className="mt-5 flex flex-col divide-y divide-line rounded-ctl border border-line">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar first={m.first_name} last={m.last_name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {m.first_name} {m.last_name}
                {m.id === meId && <span className="font-normal text-muted"> (vous)</span>}
              </span>
              <span className="block truncate text-xs text-muted">
                {[m.team_id && teamName.get(m.team_id), m.manager_id && `manager : ${memberName.get(m.manager_id) ?? ""}`].filter(Boolean).join(", ") || m.email}
              </span>
            </span>
            <Badge tone={m.role === "admin" || m.role === "hr" ? "dark" : m.role === "manager" ? "marker" : "neutral"}>{roleLabels[m.role]}</Badge>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
        <FileSpreadsheet className="size-4 text-muted" />
        Beaucoup de salariés ?
        <Link href="/app/equipe/import" className="font-semibold text-ink underline underline-offset-4">
          Importez un fichier CSV
        </Link>
        avec leurs soldes.
      </p>
      <StepFooter back={2} next={4} />
    </>
  );
}

// ----------------------------------------------------------------- étape 4
function DoneStep({ members, teams }: { members: SetupMember[]; teams: Team[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const invited = members.filter((m) => m.status === "invited");
  const [selected, setSelected] = useState<Set<string>>(new Set(invited.map((m) => m.id)));

  function sendAll() {
    start(async () => {
      let ok = 0;
      for (const id of selected) {
        const r = await sendInvitation(id);
        if (r.ok) ok++;
        else toast.error(r.error);
      }
      if (ok) toast.success(`${ok} invitation${ok > 1 ? "s" : ""} envoyée${ok > 1 ? "s" : ""}`);
      router.push("/app");
    });
  }

  return (
    <>
      <StepHeader title="Votre espace est prêt">
        {teams.length} équipe{teams.length > 1 ? "s" : ""}, {members.length} personne{members.length > 1 ? "s" : ""}. Les types d&apos;absence courants sont déjà créés selon le droit français.
      </StepHeader>
      {invited.length > 0 ? (
        <div className="rounded-ctl border border-line p-4">
          <p className="text-sm font-semibold">Envoyer les invitations</p>
          <p className="mt-0.5 text-[13px] text-muted">Chaque personne reçoit un e-mail, choisit son mot de passe et accède à son espace.</p>
          <div className="mt-3 flex flex-col gap-2">
            {invited.map((m) => (
              <Checkbox
                key={m.id}
                checked={selected.has(m.id)}
                onChange={(e) => {
                  const s = new Set(selected);
                  if (e.target.checked) s.add(m.id);
                  else s.delete(m.id);
                  setSelected(s);
                }}
                label={`${m.first_name} ${m.last_name} (${roleLabels[m.role]})`}
                description={m.email}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-ctl bg-surface p-4 text-sm text-ink-soft">Vous pourrez ajouter et inviter vos salariés à tout moment depuis la page Salariés.</p>
      )}
      <ul className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/app/absences/nouvelle", t: "Poser une absence", d: "Pour voir ce que vivront vos salariés." },
          { href: "/app/parametres/types", t: "Revoir les types d'absence", d: "RTT, récupération, événements familiaux..." },
          { href: "/app/calendrier", t: "Ouvrir le planning", d: "Qui est là, qui est absent." },
        ].map((x) => (
          <li key={x.href}>
            <Link href={x.href} className="block h-full rounded-ctl border border-line p-4 transition-colors hover:border-ink">
              <span className="font-semibold">{x.t}</span>
              <span className="mt-1 block text-[13px] text-muted">{x.d}</span>
            </Link>
          </li>
        ))}
      </ul>
      {invited.length > 0 ? (
        <StepFooter back={3} next="app" nextLabel={selected.size ? `Envoyer ${selected.size} invitation${selected.size > 1 ? "s" : ""} et commencer` : "Commencer sans inviter"} onNext={selected.size ? sendAll : () => router.push("/app")} pending={pending} />
      ) : (
        <StepFooter back={3} next="app" nextLabel="Accéder à mon espace" />
      )}
    </>
  );
}
