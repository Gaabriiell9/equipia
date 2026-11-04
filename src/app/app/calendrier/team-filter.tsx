"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/field";

export function TeamFilter({ teams, value, view }: { teams: { id: string; name: string }[]; value: string; view: string }) {
  const router = useRouter();
  return (
    <div className="w-44">
      <Select
        aria-label="Filtrer par équipe"
        value={value}
        onChange={(e) => router.push(`/app/calendrier?vue=${view}${e.target.value ? `&equipe=${e.target.value}` : ""}`)}
        className="h-9 text-sm"
      >
        <option value="">Toutes les équipes</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
