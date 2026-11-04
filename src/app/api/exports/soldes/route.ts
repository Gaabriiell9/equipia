import { getContext } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";

type Row = { member_id: string; first_name: string; last_name: string; code: string; available: number; pending: number; previous_balance: number; current_balance: number; current_acquired: number };

export async function GET() {
  const ctx = await getContext();
  if (!ctx.isHR) return new Response("Accès réservé aux RH", { status: 403 });
  const [{ data }, { data: contracts }] = await Promise.all([
    ctx.supabase.rpc("balances_report", { p_org: ctx.org.id }),
    ctx.supabase.from("member_contracts").select("member_id, employee_number").eq("org_id", ctx.org.id),
  ]);
  const num = new Map((contracts ?? []).map((c) => [c.member_id, c.employee_number]));
  const rows: (string | number | null)[][] = [
    ["Matricule", "Nom", "Prénom", "Compteur", "Solde période précédente (N-1)", "Solde période en cours (N)", "Acquis période en cours", "En attente", "Disponible"],
    ...((data ?? []) as Row[]).map((r) => [
      num.get(r.member_id) ?? "", r.last_name, r.first_name, r.code, Number(r.previous_balance), Number(r.current_balance), Number(r.current_acquired), Number(r.pending), Number(r.available) - Number(r.pending),
    ]),
  ];
  return csvResponse(toCsv(rows), `soldes-${ctx.today}.csv`);
}
