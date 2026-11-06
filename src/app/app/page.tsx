import Link from "next/link";
import { isPro } from "@/lib/plan";
import { ProUpsell } from "@/components/ui/pro";
import type { Metadata } from "next";
import { CalendarCheck2, Plus } from "lucide-react";
import { getContext } from "@/lib/auth";
import { addDaysIso, fmtDate, fmtNum } from "@/lib/format";
import {
  calendar,
  myBalances,
  pendingApprovals,
  REQUEST_SELECT,
} from "@/lib/queries";
import { BalanceCards } from "@/components/app/balances";
import { RequestRow, type RequestWithRefs } from "@/components/app/request-row";
import { ApprovalCard } from "@/components/app/approval-card";
import {
  Avatar,
  EmptyState,
  Panel,
  PanelHeader,
  Stat,
} from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import type { Member, RequestEvaluation } from "@/lib/types";

export const metadata: Metadata = { title: "Accueil" };

type HrStats = {
  headcount: number;
  pending: number;
  absent_today: number;
  remote_today: number;
  upcoming_14: number;
  absenteeism_rate: number;
  cp_liability: number;
  invited: number;
  months: { month: string; days: number }[];
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ bienvenue?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getContext();
  const today = ctx.today;
  const weekEnd = addDaysIso(today, 6);

  const [balances, mine, approvals, cal, members, stats] = await Promise.all([
    myBalances(ctx),
    ctx.supabase
      .from("leave_requests")
      .select(REQUEST_SELECT)
      .eq("member_id", ctx.member.id)
      .in("status", ["pending", "approved"])
      .gte("end_date", today)
      .order("start_date")
      .limit(4),
    ctx.canApprove ? pendingApprovals(ctx, 5) : Promise.resolve([]),
    calendar(ctx, today, weekEnd),
    ctx.supabase
      .from("members")
      .select("id, first_name, last_name, team_id")
      .eq("org_id", ctx.org.id)
      .neq("status", "disabled"),
    ctx.isHR
      ? ctx.supabase
          .rpc("hr_dashboard", {
            p_org: ctx.org.id,
            p_from: addDaysIso(today, -29),
            p_to: today,
          })
          .then((r) => r.data as HrStats)
      : Promise.resolve(null),
  ]);

  const insights = await Promise.all(
    approvals.map((r) =>
      ctx.supabase
        .rpc("request_insights", { p_request: r.id })
        .then((x) => x.data as RequestEvaluation | null),
    ),
  );
  const byId = new Map(
    (
      (members.data ?? []) as Pick<
        Member,
        "id" | "first_name" | "last_name" | "team_id"
      >[]
    ).map((m) => [m.id, m]),
  );
  const absentToday = cal.filter(
    (c) =>
      c.status === "approved" && c.start_date <= today && c.end_date >= today,
  );
  const absentWeek = cal.filter(
    (c) =>
      c.status === "approved" &&
      !(c.start_date <= today && c.end_date >= today),
  );
  const mineRows = (mine.data ?? []) as unknown as RequestWithRefs[];
  const pro = isPro(ctx.org);
  const maxMonth = Math.max(
    1,
    ...(stats?.months ?? []).map((m) => Number(m.days)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted first-letter:uppercase">
            {fmtDate(today, "EEEE d MMMM yyyy")}
          </p>
          <h1 className="font-condensed text-[2.2rem] leading-[1.05] font-bold sm:text-[2.6rem]">
            Bonjour {ctx.member.first_name}
          </h1>
        </div>
        <Button asChild size="lg" className="hidden sm:inline-flex">
          <Link href="/app/absences/nouvelle">
            <Plus /> Poser une absence
          </Link>
        </Button>
      </div>

      {sp.bienvenue && ctx.isAdmin && (
        <Panel className="border-marker/60 bg-marker-soft/40">
          <PanelHeader
            title="Votre espace est prêt"
            description="Quatre étapes pour être opérationnel avec votre équipe."
          />
          <ol className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: "/app/parametres",
                t: "Vérifier vos règles",
                d: "Décompte ouvrables ou ouvrés, fériés, validation RH.",
              },
              {
                href: "/app/parametres/equipes",
                t: "Créer vos équipes",
                d: "Et l'effectif minimum à garder présent.",
              },
              {
                href: "/app/equipe",
                t: "Ajouter vos salariés",
                d: "Un par un ou par import d'un fichier CSV.",
              },
              {
                href: "/app/absences/nouvelle",
                t: "Tester une demande",
                d: "Pour voir ce que recevront vos managers.",
              },
            ].map((s, i) => (
              <li key={s.href} className="bg-paper">
                <Link
                  href={s.href}
                  className="flex h-full gap-3 p-4 hover:bg-surface"
                >
                  <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold">{s.t}</span>
                    <span className="block text-[13px] text-muted">{s.d}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {stats && (
        <Panel>
          <div
            className={
              pro
                ? "grid grid-cols-2 gap-x-6 gap-y-5 p-5 md:grid-cols-5"
                : "grid grid-cols-2 gap-x-6 gap-y-5 p-5 md:grid-cols-3"
            }
          >
            <Stat
              label="Effectif"
              value={stats.headcount}
              hint={
                stats.invited ? `dont ${stats.invited} sans compte` : undefined
              }
            />
            <Stat
              label="Absents aujourd'hui"
              value={stats.absent_today}
              hint={
                stats.remote_today
                  ? `+ ${stats.remote_today} en télétravail`
                  : undefined
              }
            />
            <Stat
              label="Demandes à traiter"
              value={stats.pending}
              tone={stats.pending > 0 ? "warn" : undefined}
            />
            {pro && (
              <>
                <Stat
                  label="Absentéisme maladie"
                  value={`${fmtNum(stats.absenteeism_rate, 1)} %`}
                  hint="30 derniers jours"
                />
                <Stat
                  label="CP restant à prendre"
                  value={fmtNum(stats.cp_liability, 0)}
                  hint="jours, tous salariés"
                />
              </>
            )}
          </div>
          {pro ? (
            <div className="border-t border-line px-5 py-4">
              <p className="mb-3 text-[13px] text-muted">
                Jours d&apos;absence par mois
              </p>
              <div
                className="flex h-24 items-end gap-2"
                role="img"
                aria-label="Jours d'absence par mois"
              >
                {stats.months.map((m) => (
                  <div
                    key={m.month}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <span className="tabular text-[11px] text-muted">
                      {fmtNum(m.days, 0)}
                    </span>
                    <div
                      className={
                        m.month.slice(0, 7) === today.slice(0, 7)
                          ? "w-full rounded-t-[4px] bg-marker"
                          : "w-full rounded-t-[4px] bg-navy-600/80"
                      }
                      style={{
                        height: `${Math.max(3, (Number(m.days) / maxMonth) * 64)}px`,
                      }}
                    />
                    <span className="text-[11px] text-muted">
                      {fmtDate(m.month, "MMM")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-line p-4">
              <ProUpsell
                title="Tableau de bord RH"
                description="Taux d'absentéisme, jours de congés à provisionner et évolution des absences mois par mois."
                className="border-0"
              />
            </div>
          )}
        </Panel>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1.25fr_1fr]">
        <section
          aria-labelledby="soldes"
          className="lg:col-start-2 lg:row-start-1"
        >
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="soldes" className="text-[15px] font-bold">
              Mes soldes
            </h2>
            <Link
              href="/app/absences"
              className="text-sm text-ink-soft underline underline-offset-4"
            >
              Détail par période
            </Link>
          </div>
          {balances.length ? (
            <BalanceCards balances={balances} compact />
          ) : (
            <Panel>
              <EmptyState
                title="Aucun compteur"
                description="Votre entreprise n'a pas encore de compteur de congés actif."
              />
            </Panel>
          )}
        </section>
        <div className="flex flex-col gap-6 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          {ctx.canApprove && (
            <Panel>
              <PanelHeader
                title="À valider"
                description={
                  approvals.length ? undefined : "Aucune demande en attente."
                }
                action={
                  approvals.length ? (
                    <Link
                      href="/app/validations"
                      className="text-sm text-ink-soft underline underline-offset-4"
                    >
                      Tout voir
                    </Link>
                  ) : undefined
                }
              />
              {approvals.map((r, i) => (
                <ApprovalCard key={r.id} r={r} insights={insights[i]} />
              ))}
            </Panel>
          )}
          <Panel>
            <PanelHeader
              title="Mes prochaines absences"
              action={
                <Link
                  href="/app/absences"
                  className="text-sm text-ink-soft underline underline-offset-4"
                >
                  Historique
                </Link>
              }
            />
            {mineRows.length ? (
              mineRows.map((r) => <RequestRow key={r.id} r={r} />)
            ) : (
              <EmptyState
                icon={<CalendarCheck2 />}
                title="Rien de prévu pour l'instant"
                description="Posez vos prochains congés en quelques secondes."
                action={
                  <Button asChild variant="dark" size="sm">
                    <Link href="/app/absences/nouvelle">Poser une absence</Link>
                  </Button>
                }
              />
            )}
          </Panel>
        </div>

        <Panel className="lg:col-start-2 lg:row-start-2">
          <PanelHeader
            title="Absents"
            action={
              <Link
                href="/app/calendrier"
                className="text-sm text-ink-soft underline underline-offset-4"
              >
                Planning
              </Link>
            }
          />
          <div className="px-5 py-4">
            <p className="mb-2 text-[13px] font-semibold text-muted">
              Aujourd&apos;hui
            </p>
            {absentToday.length ? (
              <ul className="flex flex-col gap-2.5">
                {absentToday.map((c) => {
                  const m = byId.get(c.member_id);
                  return m ? (
                    <li key={c.request_id} className="flex items-center gap-3">
                      <Avatar
                        first={m.first_name}
                        last={m.last_name}
                        size="sm"
                      />
                      <span className="flex-1 text-sm font-medium">
                        {m.first_name} {m.last_name}
                      </span>
                      <span className="flex items-center gap-1.5 text-[13px] text-muted">
                        <span
                          className="size-2 rounded-[2px]"
                          style={{ background: c.color }}
                        />
                        {c.label}
                      </span>
                    </li>
                  ) : null;
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Toute l&apos;équipe est là.</p>
            )}
            <p className="mt-5 mb-2 text-[13px] font-semibold text-muted">
              Dans les 7 prochains jours
            </p>
            {absentWeek.length ? (
              <ul className="flex flex-col gap-2.5">
                {absentWeek.slice(0, 8).map((c) => {
                  const m = byId.get(c.member_id);
                  return m ? (
                    <li key={c.request_id} className="flex items-center gap-3">
                      <Avatar
                        first={m.first_name}
                        last={m.last_name}
                        size="sm"
                      />
                      <span className="flex-1 text-sm font-medium">
                        {m.first_name} {m.last_name}
                      </span>
                      <span className="text-[13px] text-muted">
                        dès le {fmtDate(c.start_date, "EEE d")}
                      </span>
                    </li>
                  ) : null;
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Aucune absence prévue.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
