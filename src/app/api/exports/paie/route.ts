import { getContext } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { categoryLabels, fmtDate } from "@/lib/format";
import type { Category } from "@/lib/types";

type Line = {
  line_type: string; employee_number: string | null; last_name: string; first_name: string; email: string; team: string | null;
  code: string; label: string; category: string; start_date: string; start_half: string; end_date: string; end_half: string;
  days_in_period: number; total_days: number; reason: string | null; comment: string | null;
};

export async function GET(req: Request) {
  const ctx = await getContext();
  if (!ctx.isHR) return new Response("Accès réservé aux RH", { status: 403 });
  const url = new URL(req.url);
  const from = url.searchParams.get("du") ?? "";
  const to = url.searchParams.get("au") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return new Response("Période invalide", { status: 400 });
  const { data, error } = await ctx.supabase.rpc("payroll_export", { p_org: ctx.org.id, p_from: from, p_to: to });
  if (error) return new Response(error.message, { status: 400 });
  const lines = (data ?? []) as Line[];
  const rows: (string | number | null)[][] = [
    ["Matricule", "Nom", "Prénom", "E-mail", "Équipe", "Code", "Absence", "Catégorie", "Début", "Début après-midi", "Fin", "Fin à midi", "Jours sur la période", "Jours total", "Motif", "Commentaire"],
    ...lines.map((l) => [
      l.employee_number, l.last_name, l.first_name, l.email.endsWith(".invalid") ? "" : l.email, l.team, l.code, l.label,
      l.line_type === "holiday_worked" ? "Férié travaillé" : categoryLabels[l.category as Category] ?? l.category,
      fmtDate(l.start_date, "dd/MM/yyyy"), l.start_half === "pm" ? "oui" : "", fmtDate(l.end_date, "dd/MM/yyyy"), l.end_half === "am" ? "oui" : "",
      Number(l.days_in_period), Number(l.total_days), l.reason, l.comment,
    ]),
  ];
  return csvResponse(toCsv(rows), `absences-${from}-au-${to}.csv`);
}
