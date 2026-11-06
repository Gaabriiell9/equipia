"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select } from "@/components/ui/field";
import { regionLabels } from "@/lib/format";
import { createOrganization } from "./actions";
import { activities } from "@/lib/activities";

export function OnboardingForm({ defaults }: { defaults: Record<string, string> }) {
  const [state, action, pending] = useActionState(createOrganization, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormError message={state && !state.ok ? state.error : null} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Votre prénom" htmlFor="first_name">
          <Input id="first_name" name="first_name" defaultValue={defaults.first_name} required />
        </Field>
        <Field label="Votre nom" htmlFor="last_name">
          <Input id="last_name" name="last_name" defaultValue={defaults.last_name} required />
        </Field>
      </div>
      <Field label="Nom de l'entreprise" htmlFor="company">
        <Input id="company" name="company" defaultValue={defaults.company} required minLength={2} />
      </Field>
      <div className="grid gap-4">
        <Field label="Secteur d'activité" htmlFor="activity" hint="Hôtels, cafés, restaurants : le pack HCR suit en plus les 6 fériés garantis.">
          <Select id="activity" name="activity" defaultValue={defaults.activity || (defaults.sector === "hcr" ? "hcr" : "")} required>
            <option value="" disabled>
              Choisissez
            </option>
            {activities.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jours fériés" htmlFor="region" hint="Pour le décompte des congés.">
          <Select id="region" name="region" defaultValue="metropole">
            {Object.entries(regionLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
      </div>
      <input type="hidden" name="size" value={defaults.size ?? ""} />
      <div className="rounded-ctl border border-line bg-surface p-4">
        <Checkbox
          name="demo"
          defaultChecked
          label="Ajouter une équipe d'exemple"
          description="9 salariés fictifs avec des congés et des demandes à valider, pour tester tout de suite. Vous les supprimez en un clic quand vous voulez."
        />
      </div>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Création de l'espace..." : "Créer l'espace"}
      </Button>
    </form>
  );
}
