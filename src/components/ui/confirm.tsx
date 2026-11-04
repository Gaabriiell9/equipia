"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "./button";
import { Field, Input, Textarea } from "./field";
import { Dialog, DialogContent, DialogTrigger } from "./overlays";
import type { ActionResult } from "@/lib/actions";

/** Bouton qui ouvre une confirmation avant d'exécuter une action serveur */
export function ConfirmButton({
  title,
  description,
  confirmLabel,
  successMessage,
  onConfirm,
  tone = "dark",
  reason,
  typeToConfirm,
  children,
  ...buttonProps
}: Omit<ButtonProps, "onClick"> & {
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  successMessage?: string;
  onConfirm: (reason: string) => Promise<ActionResult<unknown>>;
  tone?: "dark" | "danger" | "ok";
  reason?: { label: string; required?: boolean; placeholder?: string };
  typeToConfirm?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const blocked = (reason?.required && text.trim().length < 2) || (typeToConfirm !== undefined && typed.trim() !== typeToConfirm);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setText(""); setTyped(""); } }}>
      <DialogTrigger asChild>
        <Button {...buttonProps}>{children}</Button>
      </DialogTrigger>
      <DialogContent title={title} description={description}>
        <div className="flex flex-col gap-4">
          {reason && (
            <Field label={reason.label} htmlFor="confirm-reason">
              <Textarea id="confirm-reason" value={text} onChange={(e) => setText(e.target.value)} placeholder={reason.placeholder} autoFocus />
            </Field>
          )}
          {typeToConfirm !== undefined && (
            <Field label={`Saisissez « ${typeToConfirm} » pour confirmer`} htmlFor="confirm-typed">
              <Input id="confirm-typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </Field>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button
              variant={tone}
              disabled={pending || blocked}
              onClick={() =>
                start(async () => {
                  const r = await onConfirm(text);
                  if (r.ok) {
                    if (successMessage || r.message) toast.success(r.message ?? successMessage);
                    setOpen(false);
                  } else toast.error(r.error);
                })
              }
            >
              {pending ? "Patientez..." : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
