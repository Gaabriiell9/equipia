import type { Metadata } from "next";
import { AuthCard, MfaForm } from "../../forms";
import { signOut } from "../../actions";

export const metadata: Metadata = { title: "Double authentification" };

export default async function Page({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard title="Double authentification" description="Saisissez le code affiché dans votre application d'authentification.">
      <MfaForm next={sp.suite ?? "/app"} />
      <form action={signOut} className="mt-5 text-center">
        <button className="text-sm text-ink-soft underline underline-offset-4">Se déconnecter</button>
      </form>
    </AuthCard>
  );
}
