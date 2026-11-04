import { NextResponse } from "next/server";
import { getContext } from "@/lib/auth";

// Ouvre un justificatif via une URL signée de 60 secondes (droits vérifiés par la RLS du stockage)
export async function GET(req: Request) {
  const ctx = await getContext();
  const id = new URL(req.url).searchParams.get("demande") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Demande invalide", { status: 400 });
  const { data: r } = await ctx.supabase.from("leave_requests").select("attachment_path").eq("id", id).maybeSingle();
  if (!r?.attachment_path) return new Response("Aucun justificatif", { status: 404 });
  const { data, error } = await ctx.supabase.storage.from("justificatifs").createSignedUrl(r.attachment_path, 60);
  if (error || !data) return new Response("Document indisponible", { status: 404 });
  const signed = data.signedUrl.startsWith("http") ? data.signedUrl : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${data.signedUrl}`;
  return NextResponse.redirect(signed);
}
