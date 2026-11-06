"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Tables dont un changement doit mettre l'écran à jour chez tout le monde
const TABLES = ["leave_requests", "members", "teams", "leave_types", "leave_ledger", "notifications", "holiday_work", "member_contracts"];

/**
 * Actualisation automatique : écoute les changements de la base (Supabase Realtime, filtré par
 * entreprise et soumis aux mêmes droits que la lecture) et recharge les données de la page.
 * En secours, la page se recharge aussi quand l'onglet redevient visible.
 */
export function LiveRefresh({ orgId }: { orgId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      // Regroupe les changements rapprochés (validation + compteur + notification) en un seul rechargement
      timer.current = setTimeout(() => router.refresh(), 350);
    };

    let channel = supabase.channel(`org-${orgId}`);
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `org_id=eq.${orgId}` }, refresh);
    }
    channel = channel.on("postgres_changes", { event: "*", schema: "public", table: "organizations", filter: `id=eq.${orgId}` }, refresh);

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);
      channel.subscribe();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  return null;
}
