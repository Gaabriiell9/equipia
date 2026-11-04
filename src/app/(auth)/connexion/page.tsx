import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard, SignInForm } from "../forms";

export const metadata: Metadata = { title: "Connexion" };

export default async function Page({ searchParams }: { searchParams: Promise<{ suite?: string; message?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard title="Connexion" description="Accédez à l'espace de votre entreprise.">
      <SignInForm next={sp.suite} message={sp.message} />
      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-ink underline underline-offset-4">
          Créer un espace gratuit
        </Link>
      </p>
    </AuthCard>
  );
}
