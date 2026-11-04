import Link from "next/link";
import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { getContext } from "@/lib/auth";
import { cn, fmtDateTime } from "@/lib/format";
import { EmptyState, PageHeader, Panel } from "@/components/ui/display";
import { MarkAllRead } from "./mark-read";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page() {
  const ctx = await getContext();
  const { data } = await ctx.supabase
    .from("notifications")
    .select("*")
    .eq("member_id", ctx.member.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <>
      <PageHeader title="Notifications" actions={unread > 0 ? <MarkAllRead /> : undefined} />
      <Panel>
        {items.length === 0 ? (
          <EmptyState icon={<Bell />} title="Aucune notification" description="Vous serez prévenu ici et par e-mail des demandes et décisions qui vous concernent." />
        ) : (
          <ul>
            {items.map((n) => (
              <li key={n.id} className={cn("border-b border-line last:border-0", !n.read_at && "bg-marker-soft/40")}>
                <Link href={n.link ?? "/app"} className="flex gap-3 px-5 py-3.5 hover:bg-surface/60">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-marker-strong")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{n.title}</span>
                    <span className="block text-sm text-ink-soft">{n.body}</span>
                    <span className="mt-0.5 block text-xs text-muted">{fmtDateTime(n.created_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
