/**
 * API client - every business-data call goes to the Fastify API.
 * The x-tenant-slug header is always sent (middleware sets it on page
 * requests; client fetches send it explicitly since the API is cross-origin).
 */
import type { CatalogData, OrderPublic } from "@mezban/shared";

export function apiBase(): string {
  const base =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3001";
  return base.replace(/\/$/, "");
}

/** Server-side: fetch the public storefront catalogue (ISR-friendly). */
export async function fetchCatalog(slug: string): Promise<CatalogData> {
  const res = await fetch(`${apiBase()}/api/catalog`, {
    headers: { "x-tenant-slug": slug },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Catalog fetch failed (${res.status})`);
  return (await res.json()) as CatalogData;
}

/** Server-side: public order lookup for the tracking page. */
export async function fetchOrderPublic(
  slug: string,
  idOrToken: string
): Promise<OrderPublic | null> {
  const res = await fetch(
    `${apiBase()}/api/orders/${encodeURIComponent(idOrToken)}`,
    { headers: { "x-tenant-slug": slug }, cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Order fetch failed (${res.status})`);
  return (await res.json()) as OrderPublic;
}

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

/** Universal fetch against the API (works in browser + server). */
export async function apiFetch(
  path: string,
  slug: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set("x-tenant-slug", slug);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${apiBase()}${path}`, { ...init, headers });
}
