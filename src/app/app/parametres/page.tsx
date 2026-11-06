import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { SettingsForm } from "./settings-form";
import { isPro } from "@/lib/plan";

export const metadata: Metadata = { title: "Paramètres" };

export default async function Page() {
  const ctx = await getContext();
  return <SettingsForm org={ctx.org} isAdmin={ctx.isAdmin} pro={isPro(ctx.org)} />;
}
