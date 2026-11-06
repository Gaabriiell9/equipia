"use client";

import Link from "next/link";
import { ViewTransition } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const tabs = [
  { href: "/app/parametres", label: "Règles générales" },
  { href: "/app/parametres/types", label: "Types d'absence" },
  { href: "/app/parametres/equipes", label: "Équipes" },
];

export function SettingsTabs() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections des paramètres">
      {tabs.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn("relative px-3 py-2.5 text-sm whitespace-nowrap transition-colors", active ? "font-semibold text-ink" : "text-muted hover:text-ink")}
          >
            {t.label}
            {active && (
              <ViewTransition name="settings-tab-indicator" share="indicator">
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink" />
              </ViewTransition>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
