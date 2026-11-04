// Lanceur local (hors Supabase) : deno run -A supabase/functions/admin-auth/local.ts
import { handler } from "./handler.ts";

Deno.serve({ port: Number(Deno.env.get("LOCAL_PORT") ?? 54330), hostname: "127.0.0.1" }, handler);
