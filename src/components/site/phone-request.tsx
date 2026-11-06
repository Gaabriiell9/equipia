import { CalendarDays, CalendarRange, ChevronLeft, Home, Menu, Plus } from "lucide-react";

// Maquette réaliste d'un téléphone affichant l'écran « Poser une absence » de l'application.
export function PhoneRequest() {
  return (
    <figure className="mx-auto w-[296px]" aria-label="Exemple : un salarié pose 9 jours de congés depuis son téléphone">
      <div className="relative rounded-[48px] bg-navy-900 p-[9px] shadow-[0_30px_60px_-24px_rgba(13,23,48,0.45),inset_0_0_0_1.5px_rgba(255,255,255,0.08)]">
        {/* Boutons latéraux */}
        <span className="absolute top-[108px] -left-[3px] h-8 w-[3px] rounded-l-full bg-navy-700" />
        <span className="absolute top-[152px] -left-[3px] h-12 w-[3px] rounded-l-full bg-navy-700" />
        <span className="absolute top-[132px] -right-[3px] h-16 w-[3px] rounded-r-full bg-navy-700" />

        <div className="relative flex h-[590px] flex-col overflow-hidden rounded-[40px] bg-surface" aria-hidden>
          {/* Barre d'état */}
          <div className="relative flex h-11 shrink-0 items-center justify-between bg-paper px-7 text-[12px] font-semibold">
            <span className="tabular">9:41</span>
            <span className="absolute top-2.5 left-1/2 h-[25px] w-[86px] -translate-x-1/2 rounded-full bg-navy-900" />
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 18 12" className="h-[10px] w-[16px]" fill="currentColor">
                <rect x="0" y="8" width="3" height="4" rx="0.8" />
                <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
                <rect x="10" y="3" width="3" height="9" rx="0.8" />
                <rect x="15" y="0" width="3" height="12" rx="0.8" />
              </svg>
              <svg viewBox="0 0 26 12" className="h-[11px] w-[23px]">
                <rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity="0.4" />
                <rect x="2" y="2" width="15" height="8" rx="1.8" fill="currentColor" />
                <rect x="24" y="4" width="1.6" height="4" rx="0.8" fill="currentColor" opacity="0.4" />
              </svg>
            </span>
          </div>

          {/* En-tête de l'écran */}
          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-paper px-3">
            <ChevronLeft className="size-5 text-muted" />
            <span className="text-[15px] font-bold">Poser une absence</span>
          </div>

          {/* Contenu */}
          <div className="flex-1 px-3.5 pt-3.5">
            <p className="text-[11px] font-semibold text-muted">Type d&apos;absence</p>
            <div className="mt-1.5 flex items-center gap-2 rounded-[10px] border-[1.5px] border-ink bg-paper px-3 py-2.5">
              <span className="size-2.5 rounded-[3px] bg-[#2563eb]" />
              <span className="flex-1 text-[13px] font-semibold">Congés payés</span>
              <span className="tabular text-[11px] text-muted">22,5 j dispo.</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] font-semibold text-muted">Du</p>
                <p className="tabular mt-1.5 rounded-[10px] border border-line-strong bg-paper px-3 py-2 text-[13px]">lun. 21/12</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted">Au</p>
                <p className="tabular mt-1.5 rounded-[10px] border border-line-strong bg-paper px-3 py-2 text-[13px]">jeu. 31/12</p>
              </div>
            </div>

            <div className="mt-3.5 rounded-[12px] bg-paper p-3.5 ring-1 ring-line">
              <p className="flex items-baseline gap-1.5">
                <span className="tabular font-condensed text-[2.5rem] leading-none font-bold">9</span>
                <span className="text-[13px] text-ink-soft">jours ouvrables décomptés</span>
              </p>
              <p className="mt-1.5 text-[11px] text-muted">Dimanches et Noël (25 déc.) exclus</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full w-[40%] rounded-full bg-[#2563eb]" />
              </div>
              <p className="mt-2 flex justify-between text-[12px]">
                <span className="text-muted">Solde ensuite</span>
                <span className="tabular font-bold">13,5 j</span>
              </p>
            </div>

            <div className="mt-3.5 flex h-11 items-center justify-center rounded-[10px] bg-marker text-[14px] font-semibold">Envoyer la demande</div>
            <p className="mt-2 text-center text-[11px] text-muted">Karim (votre manager) sera prévenu par e-mail</p>
          </div>

          {/* Onglets de l'application */}
          <div className="shrink-0 border-t border-line bg-paper pb-5">
            <div className="grid h-14 grid-cols-5 items-center text-[10px] text-muted">
              <span className="flex flex-col items-center gap-0.5"><Home className="size-[18px]" />Accueil</span>
              <span className="flex flex-col items-center gap-0.5"><CalendarDays className="size-[18px]" />Absences</span>
              <span className="flex justify-center">
                <span className="flex size-10 -translate-y-1.5 items-center justify-center rounded-[12px] bg-marker text-ink">
                  <Plus className="size-5" />
                </span>
              </span>
              <span className="flex flex-col items-center gap-0.5"><CalendarRange className="size-[18px]" />Planning</span>
              <span className="flex flex-col items-center gap-0.5"><Menu className="size-[18px]" />Plus</span>
            </div>
            <span className="mx-auto block h-[5px] w-[110px] rounded-full bg-ink" />
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-[13px] text-muted">Dans le navigateur du téléphone, sans application à installer</figcaption>
    </figure>
  );
}
