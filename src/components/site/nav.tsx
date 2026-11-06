"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#secteurs", label: "Secteurs" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/securite", label: "Sécurité" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between px-5">
        <Link href="/" aria-label="Accueil">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-[15px] text-ink-soft md:flex" aria-label="Navigation du site">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link href="/connexion">Se connecter</Link>
          </Button>
          <Button asChild>
            <Link href="/inscription">Essai gratuit</Link>
          </Button>
        </div>
        <button className="rounded-ctl p-2 md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="menu-drop border-t border-line bg-paper px-5 pt-2 pb-5 md:hidden">
          <nav className="flex flex-col" aria-label="Navigation mobile">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-line py-3 text-[15px]">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <Link href="/connexion">Se connecter</Link>
            </Button>
            <Button asChild>
              <Link href="/inscription">Essai gratuit</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
