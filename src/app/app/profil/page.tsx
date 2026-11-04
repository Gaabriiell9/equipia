import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { brand } from "@/lib/config";
import { roleLabels } from "@/lib/format";
import { PageHeader, Panel, PanelHeader } from "@/components/ui/display";
import { CalendarFeed, MfaSettings, ProfileForm } from "./sections";

export const metadata: Metadata = { title: "Mon profil" };

export default async function Page({ searchParams }: { searchParams: Promise<{ mfa?: string }> }) {
  const sp = await searchParams;
  const ctx = await getContext();
  const { data: token } = await ctx.supabase.rpc("my_calendar_token", { p_org: ctx.org.id, p_rotate: false });
  const { data: factors } = await ctx.supabase.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).filter((f) => f.status === "verified").map((f) => ({ id: f.id, name: f.friendly_name ?? "Application", created: f.created_at }));
  return (
    <>
      <PageHeader title="Mon profil" description={`${roleLabels[ctx.member.role]} chez ${ctx.org.name}`} />
      {(sp.mfa === "obligatoire" || ctx.mfaMissing) && (
        <p className="mb-6 rounded-ctl border border-wait/30 bg-wait-soft px-4 py-3 text-sm text-wait">
          Votre entreprise exige la double authentification pour les RH et les administrateurs. Activez-la ci-dessous pour accéder au reste de l&apos;application.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="self-start">
          <PanelHeader title="Informations" />
          <ProfileForm first={ctx.member.first_name} last={ctx.member.last_name} email={ctx.member.email} notify={ctx.member.notify_email} />
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHeader title="Double authentification" description="Un code à 6 chiffres sur votre téléphone en plus du mot de passe." />
            <MfaSettings factors={verified} />
          </Panel>
          <Panel>
            <PanelHeader title="Planning dans votre agenda" description="Abonnez Google Agenda, Outlook ou Apple Calendrier aux absences de l'équipe." />
            <CalendarFeed url={token ? `${brand.siteUrl}/api/calendrier/${token}.ics` : null} />
          </Panel>
          <Panel>
            <PanelHeader title="Vos données" description="Téléchargez une copie de vos données personnelles (droit à la portabilité, RGPD)." />
            <div className="p-5">
              <a href="/api/rgpd" className="inline-flex h-10 items-center rounded-ctl border border-line-strong px-4 text-sm font-semibold hover:bg-surface">
                Télécharger mes données (JSON)
              </a>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
