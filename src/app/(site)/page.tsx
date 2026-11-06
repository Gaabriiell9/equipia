import Link from "next/link";
import { AlertTriangle, Briefcase, Building2, Check, Download, EyeOff, HardHat, HeartPulse, Lock, ScrollText, Server, ShieldCheck, Store, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPlanning } from "@/components/site/hero-planning";
import { PricingCards } from "@/components/site/pricing";
import { Faq } from "@/components/site/faq";
import { PhoneRequest } from "@/components/site/phone-request";
import { brand, trialDays } from "@/lib/config";

const rules = [
  { rule: "Acquisition de 2,5 jours ouvrables par mois (ou 2,08 jours ouvrés)", does: "Calculée automatiquement chaque 1er du mois, au prorata pour une entrée en cours de mois." },
  { rule: "Arrêt maladie non professionnel : 2 jours ouvrables par mois (loi du 22 avril 2024)", does: "L'acquisition est réduite d'elle-même pendant l'arrêt. Les arrêts d'origine professionnelle gardent 2,5 jours." },
  { rule: "Jours fériés exclus du décompte", does: "Calendriers métropole, Alsace-Moselle, Guadeloupe, Martinique, Guyane, La Réunion et Mayotte, jusqu'en 2040." },
  { rule: "Jours de fractionnement (art. L3141-23 du Code du travail)", does: "1 ou 2 jours supplémentaires calculés après le 31 octobre, attribués après votre vérification." },
  { rule: "Congés pour événements familiaux (art. L3142-4)", does: "Motifs et durées minimales proposés au salarié : mariage, naissance, décès, annonce d'un handicap..." },
  { rule: "Périodes N-1 et N, report et perte des jours", does: "Les jours les plus anciens partent en premier. Clôture de période avec aperçu du report et des jours perdus." },
];

const sectors = [
  { i: Briefcase, t: "Bureaux et services", d: "RTT acquis chaque mois, télétravail posé en deux clics et compté comme présent dans l'effectif de l'équipe." },
  { i: Store, t: "Commerce et distribution", d: "Ouverture le samedi prise en compte, effectif minimum par magasin ou par rayon pendant les périodes chargées." },
  { i: HardHat, t: "Industrie, BTP, artisanat", d: "Accidents du travail suivis à part sans réduire l'acquisition des congés, équipes par atelier ou par chantier." },
  { i: HeartPulse, t: "Santé, social, associations", d: "Planning sur 7 jours, double validation par le responsable puis les RH, arrêts maladie confidentiels." },
  { i: UtensilsCrossed, t: "Hôtellerie-restauration", d: "Pack convention HCR : 6 fériés garantis, 1er mai travaillé signalé à la paie, saisonniers et extras.", href: "/hotellerie-restauration" },
  { i: Building2, t: "Plusieurs établissements", d: "Un espace par site, un seul compte pour passer de l'un à l'autre. Chaque établissement garde ses règles." },
];

const faq = [
  { q: "Combien de temps faut-il pour démarrer ?", a: "Une minute pour créer l'espace : les types d'absence courants sont créés selon le droit français. Ensuite, importez vos salariés depuis un fichier CSV (export de votre logiciel de paie ou Excel) avec leurs soldes actuels, et envoyez les invitations. La plupart des équipes sont opérationnelles le jour même." },
  { q: "Comment reprendre les soldes de congés actuels ?", a: "Le fichier d'import accepte les colonnes CP N-1, CP N, RTT et récupération (et les fériés garantis si vous relevez de la convention HCR). Vous pouvez aussi ajuster un compteur à la main depuis la fiche du salarié, avec un motif tracé dans l'historique." },
  { q: "Mes salariés doivent-ils installer une application ?", a: "Non. Équipia fonctionne dans le navigateur du téléphone comme une application : menu en bas d'écran, bouton pour poser une absence, notifications par e-mail. Chacun peut aussi ajouter le planning de l'équipe à son agenda Google, Outlook ou Apple." },
  { q: "Les collègues voient-ils les arrêts maladie ?", a: "Non. Les motifs sensibles (maladie, accident du travail, absences confidentielles) n'apparaissent qu'au salarié, à sa ligne managériale et aux RH. Les collègues voient seulement « Absent » dans le planning." },
  { q: "Mon secteur a des règles particulières, est-ce adapté ?", a: "Oui. Bureaux, commerce, industrie, BTP, santé, associations, hôtellerie-restauration : les règles se paramètrent selon votre convention ou votre accord d'entreprise (décompte en jours ouvrables ou ouvrés, jours d'ouverture, période de référence, anticipation, report maximum, ancienneté requise, délai de prévenance). La convention HCR dispose en plus d'un pack dédié : 6 fériés garantis et 1er mai travaillé." },
  { q: "Et la paie ?", a: "L'export du mois liste chaque absence validée avec le nombre de jours sur la période (absences à cheval incluses), le matricule et les fériés travaillés. Il s'ouvre dans Excel et se transmet à votre expert-comptable. Des connecteurs vers les logiciels de paie sont disponibles sur demande." },
  { q: "Puis-je arrêter quand je veux ?", a: "Oui, l'abonnement est sans engagement. Vous pouvez exporter toutes vos données à tout moment, puis supprimer définitivement votre espace depuis les paramètres." },
];

export default function Page() {
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-[1160px] items-center gap-14 px-5 pt-14 pb-20 lg:grid-cols-[1fr_1.1fr] lg:pt-20 lg:pb-24">
          <div>
            <h1 className="font-condensed text-[3.1rem] leading-[0.98] font-bold tracking-[-0.015em] text-balance sm:text-[4.2rem]">
              Excel n&apos;a jamais été pensé pour gérer les congés de votre équipe.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
              {brand.name}, si. Vos salariés posent leurs congés depuis leur téléphone, le manager valide en un clic et les soldes se calculent seuls, selon le Code du travail. Pour toutes les entreprises de 5 à 150 salariés, quel que soit le secteur.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/inscription">Créer mon espace gratuit</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tarifs">Voir les tarifs</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted">
              {trialDays} jours d&apos;essai sans carte bancaire. Une équipe d&apos;exemple est incluse pour tester en deux minutes.
            </p>
          </div>
          <div className="lg:pl-6">
            <HeroPlanning />
          </div>
        </div>
      </section>

      {/* Par rôle */}
      <section id="fonctionnalites" className="scroll-mt-20 border-b border-line">
        <div className="mx-auto max-w-[1160px] px-5 py-20">
          <h2 className="font-condensed max-w-3xl text-[2.6rem] leading-[1.02] font-bold sm:text-[3.2rem]">Chacun fait sa part en quelques secondes</h2>
          <div className="mt-14 flex flex-col gap-16">
            <RoleRow
              title="Le salarié pose ses congés en 30 secondes"
              points={[
                "Il voit son solde avant d'envoyer la demande, et ce qu'il lui restera.",
                "Les jours sont décomptés pour lui : week-ends, fériés et demi-journées compris.",
                "Il est prévenu par e-mail dès que la décision est prise.",
              ]}
              visual={<PhoneRequest />}
            />
            <RoleRow
              reverse
              title="Le manager décide en connaissance de cause"
              points={[
                "Une alerte s'affiche si l'équipe passe sous son effectif minimum.",
                "Valider prend un clic, refuser demande un motif transmis au salarié.",
                "Le planning de l'équipe montre qui est là, qui est en congé, qui attend une réponse.",
              ]}
              visual={<ApprovalMock />}
            />
            <RoleRow
              title="Les RH n'ont plus de saisie à faire"
              points={[
                "Les acquisitions mensuelles, les reports et le fractionnement sont calculés automatiquement.",
                "L'export du mois part chez le comptable en un fichier, matricules inclus.",
                "Chaque action est tracée dans un journal d'audit qui ne se modifie pas.",
              ]}
              visual={<CountersMock />}
            />
          </div>
        </div>
      </section>

      {/* Règles légales */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1160px] px-5 py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="font-condensed text-[2.6rem] leading-[1.02] font-bold sm:text-[3.2rem]">Le droit du travail, déjà paramétré</h2>
              <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-soft">
                Fini les soldes recalculés à la main sur un tableur. Les règles légales s&apos;appliquent dès la création de votre espace, et restent ajustables à votre accord d&apos;entreprise.
              </p>
            </div>
            <div className="overflow-hidden rounded-[18px] border border-line bg-paper">
              <table className="w-full text-left text-[15px]">
                <thead>
                  <tr className="border-b border-line bg-paper text-sm text-muted">
                    <th className="w-[45%] px-5 py-3 font-medium">La règle</th>
                    <th className="px-5 py-3 font-medium">Ce que fait {brand.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.rule} className="border-b border-line align-top last:border-0">
                      <td className="px-5 py-4 font-semibold">{r.rule}</td>
                      <td className="px-5 py-4 text-ink-soft">{r.does}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Secteurs */}
      <section id="secteurs" className="scroll-mt-20 bg-navy-800 text-white">
        <div className="mx-auto max-w-[1160px] px-5 py-20">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 className="font-condensed text-[2.6rem] leading-[1.02] font-bold sm:text-[3.2rem]">Bureau, boutique, atelier ou restaurant</h2>
            <p className="max-w-lg text-[17px] leading-relaxed text-white/75">
              Jours d&apos;ouverture, décompte, effectif à tenir, circuit de validation : {brand.name} se règle sur votre façon de travailler, pas l&apos;inverse.
            </p>
          </div>
          <dl className="mt-12 grid gap-px overflow-hidden rounded-[18px] bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((x) => (
              <div key={x.t} className="bg-navy-800 p-6">
                <x.i className="size-5 text-marker" />
                <dt className="mt-3 text-lg font-semibold">{x.t}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-white/70">{x.d}</dd>
                {x.href && (
                  <Link href={x.href} className="mt-3 inline-block text-[15px] font-semibold text-marker underline underline-offset-4">
                    Voir le pack HCR
                  </Link>
                )}
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Sécurité */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1160px] px-5 py-20">
          <h2 className="font-condensed max-w-3xl text-[2.6rem] leading-[1.02] font-bold sm:text-[3.2rem]">Des données RH traitées comme des données sensibles</h2>
          <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { i: Server, t: "Hébergement à Paris", d: "La base de données est hébergée dans l'Union européenne, à Paris. Chiffrement en transit et au repos." },
              { i: Lock, t: "Cloisonnement à la source", d: "Chaque règle d'accès est appliquée par la base de données elle-même : un manager ne voit que son équipe, une entreprise ne voit jamais une autre." },
              { i: EyeOff, t: "Arrêts maladie confidentiels", d: "Seuls le salarié, sa ligne managériale et les RH voient le motif. Les collègues voient « Absent »." },
              { i: ShieldCheck, t: "Double authentification", d: "Code à 6 chiffres en plus du mot de passe, obligatoire pour les RH si vous le décidez." },
              { i: ScrollText, t: "Journal d'audit", d: "Qui a validé, ajusté ou modifié quoi, et quand. Le journal ne peut pas être modifié." },
              { i: Download, t: "RGPD outillé", d: "Export des données personnelles en un clic, anonymisation des anciens salariés, suppression de l'espace." },
            ].map((x) => (
              <div key={x.t}>
                <x.i className="size-6 text-navy-600" />
                <h3 className="mt-3 text-lg font-semibold">{x.t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{x.d}</p>
              </div>
            ))}
          </div>
          <Link href="/securite" className="mt-10 inline-block font-semibold underline underline-offset-4">
            Le détail de nos mesures de sécurité
          </Link>
        </div>
      </section>

      {/* Démarrage */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1160px] px-5 py-20">
          <h2 className="font-condensed text-[2.6rem] leading-[1.02] font-bold sm:text-[3.2rem]">Opérationnel le jour même</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { t: "Créez votre espace", d: "Une minute. Congés payés, maladie, événements familiaux, télétravail : les types d'absence sont prêts." },
              { t: "Importez l'équipe et ses soldes", d: "Un fichier CSV depuis votre paie ou Excel. Dates et virgules à la française acceptées." },
              { t: "Invitez vos salariés", d: "Chacun reçoit un e-mail, choisit son mot de passe et peut poser ses congés tout de suite." },
            ].map((s, i) => (
              <li key={s.t} className="rounded-[18px] border border-line bg-paper p-6">
                <span className="tabular font-condensed text-[2.8rem] leading-none font-bold text-marker-strong">{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="border-b border-line">
        <div className="mx-auto max-w-[1160px] px-5 py-20">
          <h2 className="font-condensed text-[2.6rem] leading-[1.02] font-bold sm:text-[3.2rem]">Un prix par salarié, sans engagement</h2>
          <p className="mt-4 max-w-2xl text-[17px] text-ink-soft">Tous les salariés comptent, y compris les saisonniers pendant leur contrat. Pas de frais cachés, pas de module à débloquer.</p>
          <div className="mt-10">
            <PricingCards />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[900px] px-5 py-20">
          <h2 className="font-condensed text-[2.6rem] leading-[1.02] font-bold sm:text-[3.2rem]">Questions fréquentes</h2>
          <div className="mt-10">
            <Faq items={faq} />
          </div>
        </div>
      </section>

      {/* Appel final */}
      <section>
        <div className="mx-auto flex max-w-[1160px] flex-col items-start gap-6 px-5 py-20 md:flex-row md:items-center md:justify-between">
          <h2 className="font-condensed max-w-2xl text-[2.6rem] leading-[1.02] font-bold sm:text-[3.2rem]">Testez avec votre équipe avant les prochaines vacances</h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/inscription">Créer mon espace gratuit</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={`mailto:${brand.contactEmail}?subject=Démonstration%20${encodeURIComponent(brand.name)}`}>Demander une démonstration</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function RoleRow({ title, points, visual, reverse }: { title: string; points: string[]; visual: React.ReactNode; reverse?: boolean }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div className={reverse ? "lg:order-2" : ""}>
        <h3 className="text-[1.65rem] leading-tight font-bold">{title}</h3>
        <ul className="mt-5 flex flex-col gap-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-[17px] leading-relaxed text-ink-soft">
              <Check className="mt-1.5 size-4 shrink-0 text-ok" />
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>{visual}</div>
    </div>
  );
}

function ApprovalMock() {
  return (
    <div className="rounded-[18px] border border-line bg-paper shadow-[0_24px_50px_-24px_rgba(13,23,48,0.3)]" aria-hidden>
      <div className="border-b border-line px-5 py-4 text-sm font-bold">À valider</div>
      <div className="px-5 py-4">
        <div className="flex gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-700 text-[13px] font-semibold text-white">TP</span>
          <div className="flex-1">
            <p className="font-semibold">Thomas Petit</p>
            <p className="text-sm text-ink-soft">Congés payés, 3 j</p>
            <p className="text-sm text-muted">Du lun. 16 au mer. 18 nov.</p>
            <p className="mt-1.5 text-[13px] text-muted">
              Solde après validation : <strong className="text-ink">15,5 j</strong>
            </p>
            <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-wait">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              Effectif minimum « Support client » non atteint le 17 nov. (1/2 présents).
            </p>
            <div className="mt-3 flex gap-2">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-[7px] bg-ok px-3 text-[13px] font-semibold text-white">
                <Check className="size-3.5" /> Valider
              </span>
              <span className="inline-flex h-8 items-center rounded-[7px] border border-line-strong px-3 text-[13px] font-semibold">Refuser</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CountersMock() {
  const rows = [
    ["Julie Moreau", "20", "12,5", "32,5"],
    ["Karim Benali", "11", "12,5", "23,5"],
    ["Emma Roux", "4", "12,5", "16,5"],
    ["Moussa Diallo", "12,5", "11,8", "24,3"],
  ];
  return (
    <div className="rounded-[18px] border border-line bg-paper shadow-[0_24px_50px_-24px_rgba(13,23,48,0.3)]" aria-hidden>
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <span className="text-sm font-bold">Congés payés</span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-[7px] border border-line-strong px-3 text-[13px] font-semibold">
          <Download className="size-3.5" /> Export paie
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-5 py-2 font-medium">Salarié</th>
            <th className="px-3 py-2 text-right font-medium">N-1</th>
            <th className="px-3 py-2 text-right font-medium">N</th>
            <th className="px-5 py-2 text-right font-medium">Disponible</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-t border-line">
              <td className="px-5 py-2.5 font-medium">{r[0]}</td>
              <td className="tabular px-3 py-2.5 text-right text-ink-soft">{r[1]}</td>
              <td className="tabular px-3 py-2.5 text-right text-ink-soft">{r[2]}</td>
              <td className="tabular px-5 py-2.5 text-right font-bold">{r[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-5 py-3 text-xs text-muted">Acquisition de novembre calculée le 1er décembre. Arrêt maladie de M. Diallo pris en compte (2 j au lieu de 2,5).</p>
    </div>
  );
}
