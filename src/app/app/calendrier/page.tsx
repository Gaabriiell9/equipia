import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getContext } from "@/lib/auth";
import { calendar } from "@/lib/queries";
import { addDaysIso, cn, d, fmtDate, isoDow } from "@/lib/format";
import { PageHeader } from "@/components/ui/display";
import type { Member, Team } from "@/lib/types";
import { PlanningGrid } from "./planning-grid";
import { TeamFilter } from "./team-filter";

export const metadata: Metadata = { title: "Planning d'équipe" };

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { first, last };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ mois?: string; vue?: string; equipe?: string; debut?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const view = sp.vue === "semaines" ? "semaines" : "mois";
  let from: string, to: string, prevHref: string, nextHref: string, title: string;
  const q = (extra: Record<string, string>) => {
    const u = new URLSearchParams({ vue: view, ...(sp.equipe ? { equipe: sp.equipe } : {}), ...extra });
    return `/app/calendrier?${u}`;
  };
  if (view === "mois") {
    const ym = /^\d{4}-\d{2}$/.test(sp.mois ?? "") ? sp.mois! : ctx.today.slice(0, 7);
    ({ first: from, last: to } = monthBounds(ym));
    const prev = addDaysIso(from, -1).slice(0, 7);
    const next = addDaysIso(to, 1).slice(0, 7);
    prevHref = q({ mois: prev });
    nextHref = q({ mois: next });
    title = fmtDate(from, "MMMM yyyy");
  } else {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(sp.debut ?? "") ? sp.debut! : ctx.today;
    from = addDaysIso(base, 1 - isoDow(base));
    to = addDaysIso(from, 13);
    prevHref = q({ debut: addDaysIso(from, -14) });
    nextHref = q({ debut: addDaysIso(from, 14) });
    title = `${fmtDate(from, "d MMM")} au ${fmtDate(to, "d MMM yyyy")}`;
  }

  const [{ data: members }, { data: teams }, rows, { data: holidays }] = await Promise.all([
    ctx.supabase.from("members").select("id, first_name, last_name, team_id, work_days, role").eq("org_id", ctx.org.id).neq("status", "disabled").order("last_name"),
    ctx.supabase.from("teams").select("*").eq("org_id", ctx.org.id).order("name"),
    calendar(ctx, from, to),
    ctx.supabase.from("public_holidays").select("day, name").eq("region", ctx.org.holiday_region).gte("day", from).lte("day", to),
  ]);

  const days: string[] = [];
  for (let x = from; x <= to; x = addDaysIso(x, 1)) days.push(x);
  const teamList = (teams ?? []) as Team[];
  const memberList = ((members ?? []) as Pick<Member, "id" | "first_name" | "last_name" | "team_id" | "work_days" | "role">[]).filter(
    (m) => !sp.equipe || m.team_id === sp.equipe,
  );

  return (
    <>
      <PageHeader
        title="Planning d'équipe"
        description={ctx.canApprove ? "Les demandes en attente apparaissent hachurées." : "Les motifs d'absence sensibles sont masqués."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-ctl border border-line bg-paper p-0.5 text-sm">
              <Link href={`/app/calendrier?vue=semaines${sp.equipe ? `&equipe=${sp.equipe}` : ""}`} className={cn("rounded-[6px] px-3 py-1.5", view === "semaines" ? "bg-ink font-semibold text-white" : "text-ink-soft")}>
                2 semaines
              </Link>
              <Link href={`/app/calendrier?vue=mois${sp.equipe ? `&equipe=${sp.equipe}` : ""}`} className={cn("rounded-[6px] px-3 py-1.5", view === "mois" ? "bg-ink font-semibold text-white" : "text-ink-soft")}>
                Mois
              </Link>
            </div>
            {teamList.length > 0 && <TeamFilter teams={teamList.map((t) => ({ id: t.id, name: t.name }))} value={sp.equipe ?? ""} view={view} />}
          </div>
        }
      />
      <div className="mb-3 flex items-center gap-2">
        <Link href={prevHref} className="rounded-ctl border border-line bg-paper p-2 hover:bg-surface" aria-label="Période précédente">
          <ChevronLeft className="size-4" />
        </Link>
        <Link href={nextHref} className="rounded-ctl border border-line bg-paper p-2 hover:bg-surface" aria-label="Période suivante">
          <ChevronRight className="size-4" />
        </Link>
        <h2 className="ml-1 text-lg font-bold first-letter:uppercase">{title}</h2>
        {!(ctx.today >= from && ctx.today <= to) && (
          <Link href="/app/calendrier" className="ml-auto text-sm text-ink-soft underline underline-offset-4">
            Aujourd&apos;hui
          </Link>
        )}
      </div>
      <PlanningGrid
        days={days}
        today={ctx.today}
        orgWorkDays={ctx.org.work_days}
        holidays={(holidays ?? []) as { day: string; name: string }[]}
        teams={teamList}
        members={memberList}
        rows={rows}
        canCreateFor={ctx.canApprove}
        meId={ctx.member.id}
        compact={days.length > 20}
        monthStartDow={d(from).getDay()}
      />
    </>
  );
}
