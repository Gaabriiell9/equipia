import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard, ForgotForm } from "../forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function Page() {
  return (
    <AuthCard title="Mot de passe oublié" description="Recevez un lien pour en choisir un nouveau.">
      <ForgotForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/connexion" className="text-ink-soft underline underline-offset-4">
          Retour à la connexion
        </Link>
      </p>
    </AuthCard>
  );
}
