import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard, SignUpForm } from "../forms";
import { trialDays } from "@/lib/config";

export const metadata: Metadata = { title: "Créer un espace" };

export default function Page() {
  return (
    <AuthCard
      title="Créer votre espace"
      description={`${trialDays} jours d'essai complet, sans carte bancaire. Vos données restent hébergées en France.`}
    >
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-semibold text-ink underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </AuthCard>
  );
}
