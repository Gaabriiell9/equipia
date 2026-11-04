import { getContext } from "@/lib/auth";

// Droit à la portabilité : export JSON des données personnelles de l'utilisateur connecté
export async function GET() {
  const ctx = await getContext();
  const { data, error } = await ctx.supabase.rpc("export_my_data", { p_org: ctx.org.id });
  if (error) return new Response(error.message, { status: 400 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="mes-donnees-equipia-${ctx.today}.json"`,
      "cache-control": "no-store",
    },
  });
}
