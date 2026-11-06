import Link from "next/link";
import { AppShell } from "@/components/app/shell";
import { getContext } from "@/lib/auth";
import { daysBetween } from "@/lib/format";
import { DemoBanner } from "./demo-banner";

export const metadata = { robots: { index: false } };

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getContext();

  let pendingQuery = ctx.supabase
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.org.id)
    .eq("status", "pending")
    .neq("member_id", ctx.member.id);
  if (!ctx.isHR) pendingQuery = pendingQuery.eq("step", "manager");
  const [{ count: pending }, { count: unread }] = await Promise.all([
    ctx.canApprove ? pendingQuery : Promise.resolve({ count: 0 }),
    ctx.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("member_id", ctx.member.id)
      .is("read_at", null),
  ]);

  const trialLeft = daysBetween(ctx.today, ctx.org.trial_ends_at.slice(0, 10));
  const topBanner =
    ctx.org.plan === "trial" && ctx.isAdmin ? (
      <div className="flex h-9 items-center justify-center gap-1 truncate bg-ink px-4 text-center text-[13px] text-white/85 sm:px-8">
        {trialLeft > 0
          ? `Essai gratuit : ${trialLeft} jour${trialLeft > 1 ? "s" : ""} restant${trialLeft > 1 ? "s" : ""}.`
          : "Votre période d'essai est terminée."}{" "}
        <Link
          href="/tarifs"
          className="font-semibold text-marker underline underline-offset-4 hover:text-white"
        >
          Choisir une offre
        </Link>
      </div>
    ) : null;
  const banner =
    ctx.org.has_demo_data && ctx.isHR ? (
      <DemoBanner orgId={ctx.org.id} />
    ) : null;

  return (
    <AppShell
      me={{
        firstName: ctx.member.first_name,
        lastName: ctx.member.last_name,
        email: ctx.member.email,
        role: ctx.member.role,
      }}
      org={{ id: ctx.org.id, name: ctx.org.name, sector: ctx.org.sector }}
      orgs={ctx.memberships.map((m) => ({
        id: m.org_id,
        name: m.organizations.name,
      }))}
      canApprove={ctx.canApprove}
      isHR={ctx.isHR}
      pendingCount={pending ?? 0}
      unread={unread ?? 0}
      banner={banner}
      topBanner={topBanner}
    >
      {children}
    </AppShell>
  );
}
