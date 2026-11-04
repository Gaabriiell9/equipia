import { createClient } from "@supabase/supabase-js";
import { brand } from "@/lib/config";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/env";

type Ev = { request_id: string; member_name: string; label: string; start_date: string; start_half: string; end_date: string; end_half: string; org_name: string; updated_at: string };

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const ymd = (iso: string) => iso.replace(/-/g, "");
const next = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

// Flux iCal à s'abonner dans Google Agenda, Outlook ou Apple Calendrier
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = token.replace(/\.ics$/, "");
  if (!/^[0-9a-f-]{36}$/.test(t)) return new Response("Lien invalide", { status: 404 });
  const supabase = createClient(supabaseUrl(), supabaseKey(), { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("ics_feed", { p_token: t });
  if (error) return new Response("Indisponible", { status: 503 });
  const events = (data ?? []) as Ev[];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${brand.name}//Absences//FR`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`Absences ${events[0]?.org_name ?? brand.name}`)}`,
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap((e) => {
      const half = e.start_date === e.end_date && (e.start_half === "pm" || e.end_half === "am") ? (e.start_half === "pm" ? " (après-midi)" : " (matin)") : "";
      return [
        "BEGIN:VEVENT",
        `UID:${e.request_id}@equipia`,
        `DTSTAMP:${stamp}`,
        `LAST-MODIFIED:${new Date(e.updated_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
        `DTSTART;VALUE=DATE:${ymd(e.start_date)}`,
        `DTEND;VALUE=DATE:${ymd(next(e.end_date))}`,
        `SUMMARY:${esc(`${e.member_name} : ${e.label}${half}`)}`,
        "TRANSP:TRANSPARENT",
        "END:VEVENT",
      ];
    }),
    "END:VCALENDAR",
  ];
  return new Response(lines.join("\r\n"), {
    headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=900" },
  });
}
