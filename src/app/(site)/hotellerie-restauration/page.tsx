import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Faq } from "@/components/site/faq";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Logiciel de congés pour hôtels, cafés et restaurants (convention HCR)",
  description:
    "Suivi des 6 jours fériés garantis de la convention HCR, 1er mai travaillé, effectif minimum en cuisine et en salle, saisonniers. Planning et congés depuis le téléphone.",
};

export default function Page() {
  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1160px] px-5 pt-16 pb-16">
          <p className="text-[15px] font-semibold text-ink-soft">Convention collective HCR, IDCC 1979</p>
          <h1 className="font-condensed mt-3 max-w-4xl text-[3rem] leading-[0.98] font-bold sm:text-[4rem]">
            Fériés garantis, 1er mai, saisonniers : enfin suivis sans tableur
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
            En restauration, l&apos;équipe tourne 6 ou 7 jours sur 7, les fériés se travaillent et la cuisine ne peut pas fermer parce que deux commis sont en vacances. {brand.name} applique les règles de la convention et prévient avant que le service soit à court de bras.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/inscription">Créer mon espace gratuit</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/tarifs">Voir les tarifs</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-[1160px] gap-12 px-5 py-20 lg:grid-cols-2">
          <div>
            <h2 className="font-condensed text-[2.4rem] leading-[1.02] font-bold">Les 6 fériés garantis, comptés pour vous</h2>
            <div className="mt-5 flex flex-col gap-4 text-[17px] leading-relaxed text-ink-soft">
              <p>
                Après un an d&apos;ancienneté, chaque salarié a droit, en plus du 1er mai, à 10 jours fériés par an dont 6 garantis. Un férié garanti chômé est « consommé » ; s&apos;il est travaillé ou tombe sur un jour de repos, il doit être récupéré ou payé.
              </p>
              <p>
                {brand.name} crédite les 6 jours au 1er janvier pour les salariés éligibles, au prorata pour ceux qui atteignent un an en cours d&apos;année. Il suffit de cocher qui a chômé ou travaillé chaque férié : le compteur se met à jour et le salarié peut poser ses jours de récupération.
              </p>
            </div>
          </div>
          <div className="rounded-[18px] border border-line bg-paper p-6">
            <p className="text-sm font-semibold text-muted">Exemple</p>
            <p className="mt-2 text-lg font-semibold">Lucas, embauché le 1er mars 2025</p>
            <dl className="mt-5 flex flex-col gap-3 text-[15px]">
              {[
                ["1er janvier 2026", "Moins d'un an d'ancienneté : pas encore de droit", "0"],
                ["1er mars 2026", "Un an d'ancienneté : 6 x 10 mois restants / 12", "5"],
                ["14 juillet chômé", "Un férié garanti consommé", "4"],
                ["15 août travaillé", "Le droit reste dû, à récupérer", "4"],
                ["31 décembre", "Jours non récupérés : à payer", "4"],
              ].map(([w, d, v]) => (
                <div key={w} className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-line pb-3 last:border-0">
                  <div>
                    <dt className="font-semibold">{w}</dt>
                    <dd className="text-sm text-muted">{d}</dd>
                  </div>
                  <span className="tabular font-condensed text-2xl font-bold">{v}</span>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-b border-line">
        <div className="mx-auto max-w-[1160px] px-5 py-20">
          <h2 className="font-condensed max-w-3xl text-[2.4rem] leading-[1.02] font-bold">Le reste du métier, aussi</h2>
          <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-2">
            {[
              { t: "Effectif minimum par poste", d: "Fixez le nombre de personnes à garder en cuisine, en salle ou à la réception. Le salarié est averti avant d'envoyer sa demande, le manager voit le jour exact où l'équipe passe sous le seuil." },
              { t: "1er mai travaillé", d: "Il est signalé dans l'export paie avec la mention de rémunération doublée, pour ne jamais l'oublier sur le bulletin." },
              { t: "Établissement ouvert les jours fériés", d: "Si vous restez ouvert, les fériés peuvent être décomptés comme des jours normaux pendant les congés. Les jours d'ouverture (du lundi au samedi par défaut) servent au décompte et au calcul de l'effectif." },
              { t: "Saisonniers et extras", d: "Contrats saisonniers, extras, CDD : les dates de fin bloquent les demandes au-delà du contrat. Importez la brigade de la saison depuis un fichier en quelques secondes." },
              { t: "Planning sur le téléphone", d: "Le personnel en cuisine n'a pas d'ordinateur : tout se fait depuis le téléphone, et le planning de l'équipe peut s'ajouter à l'agenda personnel." },
              { t: "Confidentialité en salle", d: "Les arrêts maladie et absences personnelles n'apparaissent qu'au responsable et aux RH. Les collègues voient seulement « Absent »." },
            ].map((x) => (
              <div key={x.t}>
                <h3 className="text-xl font-semibold">{x.t}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[900px] px-5 py-20">
          <h2 className="font-condensed text-[2.4rem] leading-[1.02] font-bold">Questions des restaurateurs</h2>
          <div className="mt-10">
            <Faq
              items={[
                { q: "Le pack HCR est-il inclus ?", a: "Oui, dans l'offre Pro. Il s'active en choisissant « Hôtellerie, restauration » à la création de l'espace ou dans les paramètres." },
                { q: "Et les 4 autres jours fériés non garantis ?", a: "Ils suivent le régime des jours fériés ordinaires prévu par la convention et votre accord d'entreprise. Vous pouvez les marquer comme travaillés pour qu'ils remontent dans l'export paie." },
                { q: "Je gère plusieurs établissements, c'est possible ?", a: "Oui. Chaque établissement peut avoir son propre espace, et un même compte peut passer d'un espace à l'autre. Pour une gestion multi-sites centralisée, contactez-nous." },
                { q: "Les règles de la convention peuvent-elles changer ?", a: "Les durées et les règles restent modifiables dans les paramètres. Nous mettons à jour les valeurs par défaut quand la convention ou la loi évolue." },
              ]}
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto flex max-w-[1160px] flex-col items-start gap-6 px-5 py-20 md:flex-row md:items-center md:justify-between">
          <h2 className="font-condensed max-w-2xl text-[2.4rem] leading-[1.02] font-bold">Préparez les congés de la saison en une soirée</h2>
          <Button asChild size="lg">
            <Link href="/inscription">Essayer gratuitement</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
