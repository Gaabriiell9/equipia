import Link from "next/link";
import type { Metadata } from "next";
import { requireHR } from "@/lib/auth";
import { regionLabels } from "@/lib/format";
import { PageHeader } from "@/components/ui/display";
import { HolidayGrid } from "./grid";

export const metadata: Metadata = { title: "Jours fériés" };

export default async function Page({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireHR();
  const year = /^\d{4}$/.test(sp.annee ?? "") ? Number(sp.annee) : Number(ctx.today.slice(0, 4));
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const [{ data: holidays }, { data: members }, { data: statuses }, { data: fg }] = await Promise.all([
    ctx.supabase.from("public_holidays").select("day, name").eq("region", ctx.org.holiday_region).gte("day", from).lte("day", to).order("day"),
    ctx.supabase.from("members").select("id, first_name, last_name").eq("org_id", ctx.org.id).neq("status", "disabled").order("last_name"),
    ctx.supabase.from("holiday_work").select("member_id, day, status").eq("org_id", ctx.org.id).gte("day", from).lte("day", to),
    ctx.supabase.from("leave_types").select("id").eq("org_id", ctx.org.id).eq("category", "holiday_comp").eq("active", true).limit(1).maybeSingle(),
  ]);
  let fgBalances: Record<string, number> = {};
  if (fg && ctx.org.sector === "hcr") {
    const { data: ledger } = await ctx.supabase.from("leave_ledger").select("member_id, amount").eq("leave_type_id", fg.id).eq("period_start", from);
    fgBalances = (ledger ?? []).reduce<Record<string, number>>((acc, l) => {
      acc[l.member_id] = (acc[l.member_id] ?? 0) + Number(l.amount);
      return acc;
    }, {});
  }
  return (
    <>
      <PageHeader
        title="Jours fériés"
        description={
          ctx.org.sector === "hcr"
            ? "Indiquez qui a chômé ou travaillé chaque férié. Un férié chômé consomme un des 6 fériés garantis (convention HCR) ; ceux qui restent sont à récupérer ou à payer. Le 1er mai travaillé est signalé dans l'export paie."
            : "Indiquez qui a travaillé un jour férié : l'information remonte dans l'export paie."
        }
        actions={
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/app/feries?annee=${year - 1}`} className="rounded-ctl border border-line bg-paper px-3 py-1.5 hover:bg-surface">
              {year - 1}
            </Link>
            <span className="rounded-ctl bg-ink px-3 py-1.5 font-semibold text-white">{year}</span>
            <Link href={`/app/feries?annee=${year + 1}`} className="rounded-ctl border border-line bg-paper px-3 py-1.5 hover:bg-surface">
              {year + 1}
            </Link>
          </div>
        }
      />
      <p className="mb-3 text-[13px] text-muted">Calendrier : {regionLabels[ctx.org.holiday_region]}. Cliquez sur une case pour alterner entre non renseigné, chômé et travaillé.</p>
      <HolidayGrid
        holidays={(holidays ?? []) as { day: string; name: string }[]}
        members={(members ?? []) as { id: string; first_name: string; last_name: string }[]}
        statuses={(statuses ?? []) as { member_id: string; day: string; status: "off" | "worked" }[]}
        fgBalances={ctx.org.sector === "hcr" && fg ? fgBalances : null}
      />
    </>
  );
}
