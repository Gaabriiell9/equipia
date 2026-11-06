import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { brand } from "@/lib/config";
import { SiteNav } from "@/components/site/nav";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1160px] gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">
              La gestion des congés et absences pour les entreprises de tous les secteurs. Conçu et hébergé en France.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Produit</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
              <li><Link href="/#fonctionnalites" className="hover:text-ink">Fonctionnalités</Link></li>
              <li><Link href="/#secteurs" className="hover:text-ink">Secteurs</Link></li>
              <li><Link href="/hotellerie-restauration" className="hover:text-ink">Pack hôtellerie-restauration</Link></li>
              <li><Link href="/tarifs" className="hover:text-ink">Tarifs</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Compte</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
              <li><Link href="/inscription" className="hover:text-ink">Créer un espace</Link></li>
              <li><Link href="/connexion" className="hover:text-ink">Se connecter</Link></li>
              <li><a href={`mailto:${brand.contactEmail}?subject=Démonstration%20${encodeURIComponent(brand.name)}`} className="hover:text-ink">Demander une démonstration</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold">Informations</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-soft">
              <li><Link href="/securite" className="hover:text-ink">Sécurité et RGPD</Link></li>
              <li><Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link></li>
              <li><Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link></li>
              <li><Link href="/cgu" className="hover:text-ink">Conditions générales</Link></li>
              <li><a href={`mailto:${brand.contactEmail}`} className="hover:text-ink">{brand.contactEmail}</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-[1160px] px-5 py-5 text-xs text-muted">
            {brand.name} est édité par {brand.legalEntity}. Les informations juridiques fournies dans l&apos;application ne remplacent pas le conseil d&apos;un professionnel.
          </p>
        </div>
      </footer>
    </div>
  );
}
