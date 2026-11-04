import type { Metadata } from "next";
import { PricingCards } from "@/components/site/pricing";
import { Faq } from "@/components/site/faq";
import { brand, trialDays } from "@/lib/config";

export const metadata: Metadata = {
  title: "Tarifs",
  description: `${brand.name} : à partir de 3 € HT par salarié et par mois, sans engagement, ${trialDays} jours d'essai gratuit.`,
};

export default function Page() {
  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1160px] px-5 pt-16 pb-20">
          <h1 className="font-condensed max-w-3xl text-[3rem] leading-[0.98] font-bold sm:text-[4rem]">Un prix simple, par salarié</h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-soft">
            {trialDays} jours d&apos;essai avec toutes les fonctionnalités, sans carte bancaire. Ensuite, vous ne payez que pour les salariés présents dans le mois.
          </p>
          <div className="mt-12">
            <PricingCards />
          </div>
          <p className="mt-6 text-sm text-muted">
            Prix hors taxes, facturation mensuelle. Exemple : 25 salariés en offre Pro = 125 € HT par mois.
          </p>
        </div>
      </section>
      <section className="bg-surface">
        <div className="mx-auto max-w-[900px] px-5 py-20">
          <h2 className="font-condensed text-[2.4rem] leading-[1.02] font-bold">Questions sur l&apos;abonnement</h2>
          <div className="mt-10">
            <Faq
              items={[
                { q: "Que se passe-t-il à la fin de l'essai ?", a: "Nous vous contactons pour choisir votre offre. Vos données restent accessibles et exportables à tout moment." },
                { q: "Comment sont comptés les salariés ?", a: "Chaque salarié actif dans le mois compte une fois. Un saisonnier présent 3 mois est facturé 3 mois. Les salariés désactivés ne sont pas facturés." },
                { q: "Puis-je changer d'offre ?", a: "Oui, à tout moment, à partir du mois suivant." },
                { q: "La mise en route accompagnée est-elle obligatoire ?", a: "Non. L'import et le paramétrage se font seuls en quelques minutes. L'accompagnement est utile si vous avez des règles particulières ou beaucoup d'historique à reprendre." },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  );
}
