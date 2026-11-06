import type { Metadata } from "next";
import { FeatureComparison, PricingCards } from "@/components/site/pricing";
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
            Prix hors taxes, facturation mensuelle. Exemple pour 25 salariés : 75 € HT par mois en Essentiel, 125 € HT en Pro.
          </p>
        </div>
      </section>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1160px] px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="font-condensed text-[2.4rem] leading-[1.02] font-bold">Essentiel ou Pro ?</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-soft">
                Essentiel remplace le fichier Excel et les e-mails : demandes, validation, soldes et planning.
              </p>
              <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">
                Pro s&apos;adresse aux entreprises qui ont des RH ou des règles à faire respecter : une deuxième validation, un effectif à tenir, des fins de période à clôturer, des indicateurs à présenter. Une seule erreur de solde évitée en fin d&apos;année rembourse souvent la différence.
              </p>
              <p className="mt-3 text-[15px] text-muted">Pendant l&apos;essai, toutes les fonctionnalités Pro sont ouvertes.</p>
            </div>
            <FeatureComparison />
          </div>
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
