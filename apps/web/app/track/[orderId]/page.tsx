import { notFound } from "next/navigation";
import { getTenantSlugFromHeaders } from "@/lib/tenant";
import { fetchCatalog, fetchOrderPublic } from "@/lib/api";
import { TenantProvider } from "@/lib/tenant-context";
import { TrackClient } from "@/components/storefront/TrackClient";

/** Public order tracking - live status via Realtime broadcast + polling. */
export default async function TrackPage({
  params,
}: {
  params: { orderId: string };
}) {
  const slug = getTenantSlugFromHeaders();
  const order = await fetchOrderPublic(slug, params.orderId);
  if (!order) notFound();

  let themePrimary = "#15803d";
  try {
    const catalog = await fetchCatalog(slug);
    themePrimary = catalog.tenant.theme.primary || themePrimary;
  } catch {
    /* keep default */
  }

  return (
    <TenantProvider slug={slug}>
      <TrackClient order={order} themePrimary={themePrimary} />
    </TenantProvider>
  );
}
