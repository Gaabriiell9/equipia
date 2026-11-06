"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, ViewTransition } from "react";
import {
  Bell,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronsUpDown,
  Download,
  Flag,
  Home,
  LogOut,
  Menu as MenuIcon,
  Plus,
  ScrollText,
  Settings,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { LiveRefresh } from "@/components/app/live-refresh";
import { Avatar } from "@/components/ui/display";
import {
  Dialog,
  DialogContent,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/overlays";
import { cn, roleLabels } from "@/lib/format";
import type { Role } from "@/lib/types";
import { signOutAction, switchOrg } from "@/app/app/shell-actions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  exact?: boolean;
};

export type ShellProps = {
  me: { firstName: string; lastName: string; email: string; role: Role };
  org: { id: string; name: string; sector: string };
  orgs: { id: string; name: string }[];
  canApprove: boolean;
  isHR: boolean;
  pendingCount: number;
  unread: number;
  children: React.ReactNode;
  banner?: React.ReactNode;
  topBanner?: React.ReactNode;
};

function groups(p: ShellProps): { title?: string; items: NavItem[] }[] {
  const g: { title?: string; items: NavItem[] }[] = [
    {
      items: [
        { href: "/app", label: "Accueil", icon: Home, exact: true },
        { href: "/app/absences", label: "Absences", icon: CalendarDays },
        {
          href: "/app/calendrier",
          label: "Planning d'équipe",
          icon: CalendarRange,
        },
      ],
    },
  ];
  if (p.canApprove) {
    g.push({
      title: "Encadrement",
      items: [
        {
          href: "/app/validations",
          label: "Validations",
          icon: BookOpenCheck,
          badge: p.pendingCount,
        },
        {
          href: "/app/equipe",
          label: p.isHR ? "Salariés" : "Mon équipe",
          icon: Users,
        },
      ],
    });
  }
  if (p.isHR) {
    g.push({
      title: "Ressources humaines",
      items: [
        { href: "/app/compteurs", label: "Compteurs", icon: Wallet },
        { href: "/app/feries", label: "Jours fériés", icon: Flag },
        { href: "/app/exports", label: "Export paie", icon: Download },
        { href: "/app/parametres", label: "Paramètres", icon: Settings },
        { href: "/app/journal", label: "Journal d'audit", icon: ScrollText },
      ],
    });
  }
  return g;
}

function isActive(path: string, item: NavItem) {
  return item.exact
    ? path === item.href
    : path === item.href || path.startsWith(item.href + "/");
}

function NavList({
  p,
  onNavigate,
  indicator,
}: {
  p: ShellProps;
  onNavigate?: () => void;
  indicator?: boolean;
}) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-5" aria-label="Navigation principale">
      {groups(p).map((group, i) => (
        <div key={i}>
          {group.title && (
            <p className="mb-1.5 px-3 text-xs font-semibold text-muted">
              {group.title}
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(path, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-ctl px-3 text-[15px] text-ink-soft transition-colors hover:bg-surface hover:text-ink",
                      active && "bg-surface font-semibold text-ink",
                    )}
                  >
                    {active && indicator && (
                      <ViewTransition
                        name="sidebar-indicator"
                        share="indicator"
                      >
                        <span
                          className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-ink"
                          aria-hidden
                        />
                      </ViewTransition>
                    )}
                    <item.icon
                      className={cn(
                        "relative size-[18px] text-muted",
                        active && "text-ink",
                      )}
                    />
                    <span className="relative flex-1">{item.label}</span>
                    {!!item.badge && (
                      <span className="tabular relative rounded-full bg-marker px-2 py-0.5 text-xs font-bold text-ink">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserMenu({ p, compact }: { p: ShellProps; compact?: boolean }) {
  return (
    <Menu>
      <MenuTrigger
        className={cn(
          "flex items-center gap-2.5 rounded-ctl text-left hover:bg-surface",
          compact ? "p-1" : "w-full p-2",
        )}
        aria-label="Menu du compte"
      >
        <Avatar
          first={p.me.firstName}
          last={p.me.lastName}
          size={compact ? "sm" : "md"}
        />
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {p.me.firstName} {p.me.lastName}
            </span>
            <span className="block truncate text-xs text-muted">
              {roleLabels[p.me.role]}
            </span>
          </span>
        )}
      </MenuTrigger>
      <MenuContent align={compact ? "end" : "start"}>
        <MenuLabel>{p.me.email}</MenuLabel>
        <MenuItem asChild>
          <Link href="/app/profil">
            <User /> Mon profil
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/app/notifications">
            <Bell /> Notifications
          </Link>
        </MenuItem>
        {p.orgs.length > 1 && (
          <>
            <MenuSeparator />
            <MenuLabel>Changer d&apos;entreprise</MenuLabel>
            {p.orgs.map((o) => (
              <MenuItem key={o.id} onSelect={() => switchOrg(o.id)}>
                {o.id === p.org.id ? <Check /> : <span className="size-4" />}{" "}
                {o.name}
              </MenuItem>
            ))}
          </>
        )}
        <MenuSeparator />
        <MenuItem onSelect={() => signOutAction()}>
          <LogOut /> Se déconnecter
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function MobileTab({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] text-muted transition-colors",
        active && "font-semibold text-ink",
      )}
    >
      {active && (
        <ViewTransition name="mobile-tab-indicator" share="indicator">
          <span
            className="absolute top-0 h-[3px] w-8 rounded-b-full bg-ink"
            aria-hidden
          />
        </ViewTransition>
      )}
      <Icon className="size-5" /> {label}
    </Link>
  );
}

export function AppShell(p: ShellProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const path = usePathname();
  const tab = (href: string, exact?: boolean) =>
    exact ? path === href : path.startsWith(href);
  return (
    <div
      className="min-h-dvh bg-surface"
      style={{ "--top-h": p.topBanner ? "36px" : "0px" } as React.CSSProperties}
    >
      <LiveRefresh orgId={p.org.id} />
      {p.topBanner && (
        <div className="sticky top-0 z-50 h-9 overflow-hidden">
          {p.topBanner}
        </div>
      )}
      <div className="lg:flex">
        {/* Barre latérale (ordinateur) */}
        <aside className="sticky top-(--top-h) hidden h-[calc(100dvh-var(--top-h))] w-[264px] shrink-0 flex-col border-r border-line bg-paper px-3 py-4 lg:flex">
          <Link href="/app" className="px-3 py-1">
            <Logo />
          </Link>
          {p.orgs.length > 1 ? (
            <Menu>
              <MenuTrigger className="mx-1 mt-3 flex items-center justify-between gap-2 rounded-ctl border border-line px-3 py-2 text-left text-sm hover:bg-surface">
                <span className="truncate font-semibold">{p.org.name}</span>
                <ChevronsUpDown className="size-4 text-muted" />
              </MenuTrigger>
              <MenuContent align="start">
                {p.orgs.map((o) => (
                  <MenuItem key={o.id} onSelect={() => switchOrg(o.id)}>
                    {o.id === p.org.id ? (
                      <Check />
                    ) : (
                      <span className="size-4" />
                    )}{" "}
                    {o.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
          ) : (
            <p className="mt-3 truncate px-3 text-sm text-muted">
              {p.org.name}
            </p>
          )}
          {path !== "/app" && (
            <Link
              href="/app/absences/nouvelle"
              className="mx-1 mt-4 flex h-11 items-center justify-center gap-2 rounded-ctl bg-marker text-[15px] font-semibold text-ink hover:bg-marker-strong"
            >
              <Plus className="size-[18px]" /> Poser une absence
            </Link>
          )}
          <div className="mt-5 flex-1 overflow-y-auto">
            <NavList p={p} indicator />
          </div>
          <div className="border-t border-line pt-3">
            <UserMenu p={p} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* En-tête (mobile) */}
          <header className="sticky top-(--top-h) z-30 flex h-14 items-center justify-between border-b border-line bg-paper/95 px-4 backdrop-blur lg:hidden">
            <Link href="/app" aria-label="Accueil">
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/app/notifications"
                className="relative rounded-ctl p-2 text-ink-soft"
                aria-label="Notifications"
              >
                <Bell className="size-5" />
                {p.unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" />
                )}
              </Link>
              <UserMenu p={p} compact />
            </div>
          </header>

          {/* Barre du haut (ordinateur) */}
          <div className="hidden h-14 items-center justify-end gap-2 px-8 lg:flex">
            <Link
              href="/app/notifications"
              className="relative rounded-ctl p-2 text-ink-soft hover:bg-paper"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {p.unread > 0 && (
                <span className="tabular absolute -top-0.5 -right-0.5 rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                  {p.unread}
                </span>
              )}
            </Link>
          </div>

          {p.banner}
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-2 lg:pb-12">
            {p.children}
          </main>
        </div>
      </div>

      {/* Onglets (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Navigation mobile"
      >
        <div className="grid h-16 grid-cols-5 items-center">
          <MobileTab
            href="/app"
            active={tab("/app", true)}
            icon={Home}
            label="Accueil"
          />
          <MobileTab
            href="/app/absences"
            active={tab("/app/absences") && !tab("/app/absences/nouvelle")}
            icon={CalendarDays}
            label="Absences"
          />
          <Link
            href="/app/absences/nouvelle"
            className="flex flex-col items-center"
            aria-label="Poser une absence"
          >
            <span className="flex size-12 -translate-y-2 items-center justify-center rounded-[14px] bg-marker text-ink shadow-[0_4px_14px_rgba(220,170,18,0.45)]">
              <Plus className="size-6" />
            </span>
          </Link>
          <MobileTab
            href="/app/calendrier"
            active={tab("/app/calendrier")}
            icon={CalendarRange}
            label="Planning"
          />
          <button
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-col items-center gap-0.5 text-[11px] text-muted"
          >
            <MenuIcon className="size-5" /> Plus
            {p.pendingCount > 0 && (
              <span className="absolute top-0 right-[calc(50%-16px)] size-2 rounded-full bg-marker-strong" />
            )}
          </button>
        </div>
      </nav>
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent title="Menu">
          <NavList p={p} onNavigate={() => setMoreOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
