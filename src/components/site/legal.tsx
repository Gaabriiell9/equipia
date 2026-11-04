export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <h1 className="font-condensed text-[2.8rem] leading-none font-bold">{title}</h1>
      <p className="mt-3 text-sm text-muted">Dernière mise à jour : {updated}</p>
      <div className="mt-10 flex flex-col gap-4 text-[16px] leading-relaxed text-ink-soft [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">
        {children}
      </div>
    </div>
  );
}

/** Champ à compléter par l'éditeur avant la mise en production */
export function ToFill({ children }: { children: React.ReactNode }) {
  return <mark className="rounded bg-marker-soft px-1 text-ink">[{children}]</mark>;
}
