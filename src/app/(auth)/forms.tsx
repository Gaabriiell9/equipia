"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select } from "@/components/ui/field";
import { confirmToken, requestPasswordReset, signIn, signUp, updatePassword, verifyMfa } from "./actions";

export function AuthCard({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[440px] rounded-panel border border-line bg-paper p-6 sm:p-8">
      <h1 className="font-condensed text-[2rem] leading-[1.05] font-bold text-ink">{title}</h1>
      {description && <p className="mt-2 text-[15px] text-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function SignInForm({ next, message }: { next?: string; message?: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      {message && <p className="rounded-ctl bg-marker-soft px-3.5 py-2.5 text-sm text-ink">{message}</p>}
      <FormError message={state && !state.ok ? state.error : null} />
      <input type="hidden" name="suite" value={next ?? "/app"} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="-mt-1 text-right">
        <Link href="/mot-de-passe-oublie" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
          Mot de passe oublié ?
        </Link>
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, null);
  if (state?.ok) {
    return (
      <div className="flex flex-col items-start gap-3">
        <MailCheck className="size-8 text-ok" />
        <p className="text-[15px] text-ink">
          Un e-mail de confirmation vient de partir vers <strong>{state.message}</strong>. Cliquez sur le lien pour choisir votre mot de passe et créer votre espace.
        </p>
        <p className="text-sm text-muted">Rien reçu après 2 minutes ? Regardez dans les indésirables ou recommencez l&apos;inscription.</p>
      </div>
    );
  }
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="hidden" aria-hidden>
        <label>
          Site web <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" htmlFor="first_name" error={fe.first_name}>
          <Input id="first_name" name="first_name" autoComplete="given-name" required />
        </Field>
        <Field label="Nom" htmlFor="last_name" error={fe.last_name}>
          <Input id="last_name" name="last_name" autoComplete="family-name" required />
        </Field>
      </div>
      <Field label="Entreprise" htmlFor="company" error={fe.company}>
        <Input id="company" name="company" autoComplete="organization" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Secteur" htmlFor="sector">
          <Select id="sector" name="sector" defaultValue="general">
            <option value="general">Tous secteurs</option>
            <option value="hcr">Hôtellerie, restauration (HCR)</option>
          </Select>
        </Field>
        <Field label="Effectif" htmlFor="size">
          <Select id="size" name="size" defaultValue="11-50">
            <option value="1-10">1 à 10</option>
            <option value="11-50">11 à 50</option>
            <option value="51-200">51 à 200</option>
            <option value="201-500">201 à 500</option>
            <option value="500+">Plus de 500</option>
          </Select>
        </Field>
      </div>
      <Field label="E-mail professionnel" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Checkbox
        name="cgu"
        label={
          <>
            J&apos;accepte les{" "}
            <Link href="/cgu" className="underline underline-offset-2" target="_blank">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="underline underline-offset-2" target="_blank">
              politique de confidentialité
            </Link>
          </>
        }
      />
      {fe.cgu && <p className="-mt-2 text-[13px] text-danger">{fe.cgu}</p>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Envoi..." : "Créer mon espace gratuit"}
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  if (state?.ok) {
    return (
      <p className="text-[15px] text-ink">
        Si un compte existe pour <strong>{state.message}</strong>, un lien de réinitialisation vient de lui être envoyé.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state && !state.ok ? state.error : null} />
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Envoi..." : "Recevoir un lien"}
      </Button>
    </form>
  );
}

export function NewPasswordForm({ next, cta = "Enregistrer le mot de passe" }: { next: string; cta?: string }) {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state && !state.ok ? state.error : null} />
      <input type="hidden" name="suite" value={next} />
      <Field label="Nouveau mot de passe" htmlFor="password" hint="10 caractères minimum.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus />
      </Field>
      <Field label="Confirmation" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enregistrement..." : cta}
      </Button>
    </form>
  );
}

export function ConfirmForm({ tokenHash, type, next, cta }: { tokenHash: string; type: string; next: string; cta: string }) {
  const [state, action, pending] = useActionState(confirmToken, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state && !state.ok ? state.error : null} />
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="suite" value={next} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Vérification..." : cta}
      </Button>
      {state && !state.ok && (
        <Link href="/connexion" className="text-center text-sm underline underline-offset-4">
          Aller à la connexion
        </Link>
      )}
    </form>
  );
}

export function MfaForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(verifyMfa, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state && !state.ok ? state.error : null} />
      <input type="hidden" name="suite" value={next} />
      <Field label="Code à 6 chiffres" htmlFor="code">
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          className="h-12 text-center text-xl tracking-[0.3em] tabular"
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Vérification..." : "Valider"}
      </Button>
    </form>
  );
}
