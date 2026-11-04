"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Field, Input } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";

export function ExportForm({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const valid = from && to && from <= to;
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Du" htmlFor="exp-from">
          <Input id="exp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Au" htmlFor="exp-to">
          <Input id="exp-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>
      <a
        href={valid ? `/api/exports/paie?du=${from}&au=${to}` : undefined}
        aria-disabled={!valid}
        className={buttonVariants({ variant: "dark", className: valid ? "" : "pointer-events-none opacity-50" })}
      >
        <Download /> Télécharger le fichier (CSV)
      </a>
    </div>
  );
}
