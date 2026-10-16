import { redirect } from "next/navigation";
import { createServerSupabase } from "./supabase-server";
import { getTenantSlugFromHeaders } from "./tenant";
import { apiBase } from "./api";

export interface AdminMe {
  user: { id: string; name: string | null; role: string };
  tenant: { id: string; slug: string; name: string; logo_url: string | null };
}

/**
 * Server-side admin gate for /admin pages.
 * 1. Must have a Supabase Auth session (else → /admin/login).
 * 2. The API must confirm owner/manager of the resolved tenant (else → /admin/login).
 * Returns the session token + /api/admin/me payload for data fetching.
 */
export async function requireAdminPage(): Promise<{
  token: string;
  slug: string;
  me: AdminMe;
}> {
  const slug = getTenantSlugFromHeaders();
  const supabase = createServerSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/admin/login");

  const res = await fetch(`${apiBase()}/api/admin/me`, {
    headers: {
      "x-tenant-slug": slug,
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) redirect("/admin/login");
  const me = (await res.json()) as AdminMe;
  return { token: session.access_token, slug, me };
}

/** Server-side GET against an /api/admin/* endpoint (auth included). */
export async function adminApiGet<T>(path: string): Promise<T> {
  const { token, slug } = await requireAdminPage();
  const res = await fetch(`${apiBase()}${path}`, {
    headers: {
      "x-tenant-slug": slug,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Admin API ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}
