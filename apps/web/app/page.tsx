import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantSlugFromHeaders } from "@/lib/tenant";
import { fetchCatalog } from "@/lib/api";
import { TenantProvider } from "@/lib/tenant-context";
import { StorefrontClient } from "@/components/storefront/StorefrontClient";

/** Themed storefront for the resolved tenant (SSR, ISR 60s via the API). */
export default async function Home() {
  const slug = getTenantSlugFromHeaders();
  let catalog;
  try {
    catalog = await fetchCatalog(slug);
  } catch {
    notFound();
  }

  return (
    <TenantProvider slug={slug}>
      <StorefrontClient catalog={catalog} />
    </TenantProvider>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const slug = getTenantSlugFromHeaders();
  try {
    const catalog = await fetchCatalog(slug);
    return {
      title: `${catalog.tenant.name} - Order Online`,
      description: `Order ${catalog.tenant.name} online: burgers, shawarma, fries and more. ${catalog.tenant.announcement ?? ""}`,
    };
  } catch {
    return {};
  }
}
