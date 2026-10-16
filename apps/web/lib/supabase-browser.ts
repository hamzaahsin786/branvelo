import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for Client Components (uses the anon key; RLS applies). */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
