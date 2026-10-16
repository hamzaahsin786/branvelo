import type { FastifyInstance } from "fastify";
import type { CatalogData } from "@mezban/shared";
import { supabase } from "../lib/supabase";

/**
 * GET /api/catalog - public storefront payload for the resolved tenant:
 * tenant brand data + active categories + available items + active zones.
 * The frontend caches this (ISR, 60s).
 */
export async function catalogRoutes(app: FastifyInstance) {
  app.get("/api/catalog", async (request, reply) => {
    const db = supabase();
    const tenantId = request.tenant.id;

    const [{ data: tenant, error: tenantErr }, { data: categories }, { data: items }, { data: zones }] =
      await Promise.all([
        db
          .from("tenants")
          .select(
            "id, slug, name, logo_url, theme, phone, email, address, latitude, longitude, hours, announcement, status, tax_percent"
          )
          .eq("id", tenantId)
          .single(),
        db
          .from("categories")
          .select("id, tenant_id, name, name_ur, tagline, icon, sort, active")
          .eq("tenant_id", tenantId)
          .eq("active", true)
          .order("sort"),
        db
          .from("menu_items")
          .select(
            "id, tenant_id, category_id, name, name_ur, description, price, photo_url, badges, sort, available, prep_minutes"
          )
          .eq("tenant_id", tenantId)
          .eq("available", true)
          .order("sort"),
        db
          .from("delivery_zones")
          .select("id, tenant_id, name, areas, fee, min_order, free_above, active, sort")
          .eq("tenant_id", tenantId)
          .eq("active", true)
          .order("sort"),
      ]);

    if (tenantErr || !tenant) {
      return reply.code(404).send({ error: "Restaurant not found" });
    }

    const catalog: CatalogData = {
      tenant: tenant as CatalogData["tenant"],
      categories: (categories ?? []) as CatalogData["categories"],
      items: (items ?? []) as CatalogData["items"],
      zones: (zones ?? []) as CatalogData["zones"],
    };
    return reply.send(catalog);
  });
}
