"use client";

import { useCallback, useMemo } from "react";
import { createBrowserSupabase } from "./supabase-browser";
import { useTenantSlug } from "./tenant-context";
import { apiFetch } from "./api";

/**
 * Authenticated API caller for admin client components.
 * Attaches the Supabase Auth JWT as a Bearer token; the API verifies it
 * and checks the users table for owner/manager before every call.
 */
export function useAuthedApi() {
  const slug = useTenantSlug();
  const supabase = useMemo(() => createBrowserSupabase(), []);

  return useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      const res = await apiFetch(path, slug, {
        ...init,
        token: session.access_token,
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error("Not authorized for this restaurant");
      }
      return res;
    },
    [slug, supabase]
  );
}
