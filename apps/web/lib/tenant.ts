import { headers } from "next/headers";

export const TENANT_HEADER = "x-tenant-slug";
export const DEFAULT_TENANT_SLUG =
  process.env.DEFAULT_TENANT_SLUG || "usama-burgers";

/** Tenant slug resolved by middleware (subdomain → /t/<slug> → default). */
export function getTenantSlugFromHeaders(): string {
  return headers().get(TENANT_HEADER) || DEFAULT_TENANT_SLUG;
}
