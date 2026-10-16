import { supabase } from "./supabase";

export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
  tax_percent: number;
  status: string;
}

interface CacheEntry {
  tenant: ResolvedTenant | null;
  expires: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

/** Resolve the x-tenant-slug header to an active tenant (cached 60s). */
export async function resolveTenant(
  slug: string
): Promise<ResolvedTenant | null> {
  const now = Date.now();
  const hit = cache.get(slug);
  if (hit && now < hit.expires) return hit.tenant;

  const { data, error } = await supabase()
    .from("tenants")
    .select("id, slug, name, tax_percent, status")
    .eq("slug", slug)
    .single();

  const tenant =
    error || !data || (data as ResolvedTenant).status !== "active"
      ? null
      : (data as ResolvedTenant);

  cache.set(slug, { tenant, expires: now + TTL_MS });
  return tenant;
}
