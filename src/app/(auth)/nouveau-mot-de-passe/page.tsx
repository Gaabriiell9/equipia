import type { Metadata } from "next";
import { AuthCard, NewPasswordForm } from "../forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function Page() {
  return (
    <AuthCard title="Nouveau mot de passe" description="Choisissez un mot de passe que vous n'utilisez nulle part ailleurs.">
      <NewPasswordForm next="/app" />
    </AuthCard>
  );
}
