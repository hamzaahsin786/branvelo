import type { Metadata } from "next";
import { Storefront } from "@/components/storefront/Storefront";

/**
 * Tenant storefront (v2): rendered client-side from the Django storefront
 * API for whichever tenant the subdomain resolves to. (The v1 SSR page
 * and StorefrontClient remain in the tree until the Phase 7 archive.)
 */
export const metadata: Metadata = {
  title: "Order Online",
  description: "Browse the menu and order direct. Powered by Branvelo.",
};

export default function Home() {
  return <Storefront />;
}
