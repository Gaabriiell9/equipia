import type { Metadata } from "next";
import { AuthCard, ConfirmForm } from "../../forms";

export const metadata: Metadata = { title: "Confirmation", robots: { index: false } };

const copy: Record<string, { title: string; description: string; cta: string }> = {
  signup: { title: "Confirmez votre adresse", description: "Dernière étape avant de créer l'espace de votre entreprise.", cta: "Confirmer mon adresse" },
  invite: { title: "Rejoindre l'espace", description: "Vous avez été invité par votre employeur.", cta: "Rejoindre l'espace" },
  magiclink: { title: "Connexion", description: "Connectez-vous à votre compte en un clic.", cta: "Me connecter" },
  recovery: { title: "Mot de passe oublié", description: "Vous allez pouvoir choisir un nouveau mot de passe.", cta: "Continuer" },
};

// Confirmation par bouton (et non à l'ouverture du lien) : les antivirus de messagerie
// qui visitent les liens ne peuvent pas consommer le jeton à la place de l'utilisateur.
export default async function Page({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; suite?: string }> }) {
  const sp = await searchParams;
  const c = copy[sp.type ?? ""] ?? copy.magiclink;
  if (!sp.token_hash || !sp.type) {
    return <AuthCard title="Lien incomplet" description="Ouvrez le lien directement depuis l'e-mail reçu, ou demandez-en un nouveau." >{null}</AuthCard>;
  }
  const next = sp.type === "invite" ? "/bienvenue" : sp.suite ?? "/app";
  return (
    <AuthCard title={c.title} description={c.description}>
      <ConfirmForm tokenHash={sp.token_hash} type={sp.type} next={next} cta={c.cta} />
    </AuthCard>
  );
}
