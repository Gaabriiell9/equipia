"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input } from "@/components/ui/field";
import { fmtDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { rotateCalendarToken, updateProfile } from "@/app/app/actions/profile";

export function ProfileForm({ first, last, email, notify }: { first: string; last: string; email: string; notify: boolean }) {
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-col gap-4 p-5"
      action={(fd) =>
        start(async () => {
          const r = await updateProfile(String(fd.get("first")), String(fd.get("last")), fd.get("notify") === "on");
          if (r.ok) toast.success(r.message);
                else toast.error(r.error);
        })
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" htmlFor="p-first">
          <Input id="p-first" name="first" defaultValue={first} required />
        </Field>
        <Field label="Nom" htmlFor="p-last">
          <Input id="p-last" name="last" defaultValue={last} required />
        </Field>
      </div>
      <Field label="E-mail" htmlFor="p-email" hint="Pour changer d'adresse, contactez vos RH.">
        <Input id="p-email" value={email} disabled />
      </Field>
      <Checkbox name="notify" defaultChecked={notify} label="Recevoir les notifications par e-mail" description="Demandes à valider, décisions, absences de l'équipe." />
      <div className="flex justify-end">
        <Button type="submit" variant="dark" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

export function MfaSettings({ factors }: { factors: { id: string; name: string; created: string }[] }) {
  const router = useRouter();
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const supabase = createClient();

  async function begin() {
    setError(null);
    // Nettoie un éventuel enrôlement abandonné
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Équipia ${new Date().toLocaleDateString("fr-FR")}` });
    if (error || !data) return setError("Activation impossible pour le moment. Réessayez.");
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  function verify() {
    if (!enroll) return;
    start(async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code: code.replace(/\s/g, "") });
      if (error) return setError("Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.");
      toast.success("Double authentification activée");
      setEnroll(null);
      setCode("");
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (error) return void toast.error("Suppression impossible : reconnectez-vous avec votre code puis réessayez.");
      toast.success("Double authentification désactivée");
      router.refresh();
    });
  }

  if (factors.length > 0) {
    return (
      <div className="flex flex-col gap-3 p-5">
        {factors.map((f) => (
          <div key={f.id} className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-ok" />
            <span className="flex-1 text-sm">
              <span className="block font-semibold">Activée</span>
              <span className="block text-muted">
                {f.name}, depuis le {fmtDate(f.created)}
              </span>
            </span>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => remove(f.id)}>
              Désactiver
            </Button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <FormError message={error} />
      {!enroll ? (
        <Button variant="dark" className="self-start" onClick={begin}>
          <ShieldCheck /> Activer la double authentification
        </Button>
      ) : (
        <>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink-soft">
            <li>Ouvrez votre application d&apos;authentification (Google Authenticator, Microsoft Authenticator, 1Password...).</li>
            <li>Scannez ce QR code, ou saisissez la clé manuellement.</li>
            <li>Entrez le code à 6 chiffres affiché.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="QR code de configuration" className="size-40 rounded-ctl border border-line bg-white p-2" />
            <code className="rounded-ctl bg-surface px-3 py-2 text-sm break-all select-all">{enroll.secret}</code>
          </div>
          <div className="flex items-end gap-2">
            <Field label="Code" htmlFor="mfa-code">
              <Input id="mfa-code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="w-36 text-center tracking-[0.2em]" />
            </Field>
            <Button onClick={verify} disabled={pending || code.replace(/\s/g, "").length !== 6}>
              Vérifier et activer
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function CalendarFeed({ url: initial }: { url: string | null }) {
  const [url, setUrl] = useState(initial);
  const [pending, start] = useTransition();
  if (!url) return <p className="p-5 text-sm text-muted">Lien indisponible.</p>;
  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex gap-2">
        <Input value={url} readOnly aria-label="Adresse du flux d'agenda" className="text-[13px]" onFocus={(e) => e.target.select()} />
        <Button
          variant="outline"
          size="icon"
          aria-label="Copier le lien"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            toast.success("Lien copié");
          }}
        >
          <Copy />
        </Button>
      </div>
      <p className="text-[13px] text-muted">
        Ce lien est personnel : il montre ce que vous voyez dans le planning. Ne le partagez pas. En cas de doute, générez-en un nouveau.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await rotateCalendarToken();
            if (r.ok) {
              setUrl(url.replace(/[0-9a-f-]{36}\.ics$/, `${r.data}.ics`));
              toast.success(r.message);
            } else toast.error(r.error);
          })
        }
      >
        Générer un nouveau lien
      </Button>
    </div>
  );
}
