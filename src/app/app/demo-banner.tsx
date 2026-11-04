"use client";

import { ConfirmButton } from "@/components/ui/confirm";
import { removeDemoData } from "./actions/admin";

export function DemoBanner({ orgId }: { orgId: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-marker/50 bg-marker-soft px-4 py-2 text-center text-[13px] text-ink sm:px-8">
      <span>Vous testez avec une équipe d&apos;exemple (9 salariés fictifs).</span>
      <ConfirmButton
        variant="link"
        size="sm"
        className="h-auto text-[13px]"
        title="Supprimer l'équipe d'exemple ?"
        description="Les salariés fictifs et leurs absences seront supprimés. Vos propres données et vos paramètres sont conservés."
        confirmLabel="Supprimer les données d'exemple"
        tone="danger"
        successMessage="Données d'exemple supprimées"
        onConfirm={() => removeDemoData(orgId)}
      >
        Supprimer les données d&apos;exemple
      </ConfirmButton>
    </div>
  );
}
