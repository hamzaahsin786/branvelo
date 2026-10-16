import WebSocket from "ws";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

// Polyfill a global WebSocket for @supabase/realtime-js: on Node < 22 there
// is no native WebSocket and realtime-js only looks for the global, so
// createClient() throws before any query can run. `ws` supplies it.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket = WebSocket;
}

let client: SupabaseClient | null = null;

/** Service-role client (bypasses RLS). Every query MUST still scope by tenant_id. */
export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
