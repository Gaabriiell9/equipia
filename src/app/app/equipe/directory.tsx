"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileUp, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, Panel } from "@/components/ui/display";
import { Input, Select } from "@/components/ui/field";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { MemberForm } from "@/components/app/member-form";
import { contractLabels, fmtDate, roleLabels } from "@/lib/format";
import type { Member, MemberContract, Team } from "@/lib/types";

export function TeamDirectory({
  members,
  teams,
  contracts,
  isHR,
  isAdmin,
  meId,
}: {
  members: Member[];
  teams: Pick<Team, "id" | "name" | "color">[];
  contracts: Pick<MemberContract, "member_id" | "contract_type" | "end_date">[];
  isHR: boolean;
  isAdmin: boolean;
  meId: string;
}) {
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");
  const [status, setStatus] = useState("current");
  const [open, setOpen] = useState(false);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const byId = new Map(members.map((m) => [m.id, m]));
  const contractBy = new Map(contracts.map((c) => [c.member_id, c]));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return members.filter((m) => {
      if (status === "current" && m.status === "disabled") return false;
      if (status !== "current" && status !== "all" && m.status !== status) return false;
      if (team && m.team_id !== team) return false;
      if (s && !`${m.first_name} ${m.last_name} ${m.email} ${m.job_title ?? ""}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [members, q, team, status]);

  const managers = members.filter((m) => m.status !== "disabled").map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` }));
  const invited = members.filter((m) => m.status === "invited" && !m.is_demo).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom, un poste..." className="pl-9" aria-label="Rechercher" />
        </div>
        {teams.length > 0 && (
          <div className="w-44">
            <Select value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Équipe">
              <option value="">Toutes les équipes</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="w-44">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Statut">
            <option value="current">Actifs et invités</option>
            <option value="active">Compte activé</option>
            <option value="invited">Sans compte</option>
            <option value="disabled">Désactivés</option>
            <option value="all">Tous</option>
          </Select>
        </div>
        {isHR && (
          <>
            <Button asChild variant="outline">
              <Link href="/app/equipe/import">
                <FileUp /> Importer
              </Link>
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="dark">
                  <UserPlus /> Ajouter un salarié
                </Button>
              </DialogTrigger>
              <DialogContent title="Ajouter un salarié" className="sm:max-w-2xl">
                <MemberForm teams={teams} managers={managers} isAdmin={isAdmin} onDone={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      {isHR && invited > 0 && (
        <p className="text-[13px] text-muted">
          {invited} salarié{invited > 1 ? "s n'ont" : " n'a"} pas encore activé son compte. Ouvrez leur fiche pour envoyer ou relancer l&apos;invitation.
        </p>
      )}
      <Panel className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title="Aucun salarié ne correspond" description="Modifiez la recherche ou les filtres." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[13px] text-muted">
                  <th className="px-5 py-2.5 font-medium">Salarié</th>
                  <th className="px-3 py-2.5 font-medium">Équipe</th>
                  <th className="px-3 py-2.5 font-medium">Poste</th>
                  <th className="px-3 py-2.5 font-medium">Manager</th>
                  <th className="px-3 py-2.5 font-medium">Rôle</th>
                  <th className="px-5 py-2.5 font-medium">Compte</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const t = m.team_id ? teamById.get(m.team_id) : null;
                  const mgr = m.manager_id ? byId.get(m.manager_id) : null;
                  const c = contractBy.get(m.id);
                  return (
                    <tr key={m.id} className="border-b border-line last:border-0 hover:bg-surface/60">
                      <td className="px-5 py-2.5">
                        <Link href={`/app/equipe/${m.id}`} className="flex items-center gap-3">
                          <Avatar first={m.first_name} last={m.last_name} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {m.first_name} {m.last_name}
                              {m.id === meId && <span className="ml-1.5 font-normal text-muted">(vous)</span>}
                            </span>
                            <span className="block truncate text-xs text-muted">{m.email.endsWith(".invalid") ? "Salarié fictif" : m.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        {t ? (
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ background: t.color }} />
                            {t.name}
                          </span>
                        ) : (
                          <span className="text-faint">Aucune</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">
                        {m.job_title}
                        {c && c.contract_type !== "cdi" && <span className="ml-1.5 text-xs text-muted">({contractLabels[c.contract_type]}{c.end_date ? ` jusqu'au ${fmtDate(c.end_date, "d MMM")}` : ""})</span>}
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">{mgr ? `${mgr.first_name} ${mgr.last_name}` : ""}</td>
                      <td className="px-3 py-2.5">{roleLabels[m.role]}</td>
                      <td className="px-5 py-2.5">
                        {m.status === "active" ? (
                          <Badge tone="ok">Activé</Badge>
                        ) : m.status === "disabled" ? (
                          <Badge>Désactivé</Badge>
                        ) : m.is_demo ? (
                          <Badge tone="marker">Exemple</Badge>
                        ) : (
                          <Badge tone="wait">{m.invited_at ? "Invité" : "Sans compte"}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
