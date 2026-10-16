import type { FastifyInstance } from "fastify";
import {
  CategoryCreateSchema,
  CategoryUpdateSchema,
  MenuItemCreateSchema,
  MenuItemUpdateSchema,
} from "@mezban/shared";
import { supabase } from "../../lib/supabase";

const CATEGORY_COLUMNS =
  "id, tenant_id, name, name_ur, tagline, icon, sort, active";
const ITEM_COLUMNS =
  "id, tenant_id, category_id, name, name_ur, description, price, photo_url, badges, sort, available, prep_minutes";

export async function adminMenuRoutes(app: FastifyInstance) {
  // ── categories ──────────────────────────────────────────────────────────
  app.get("/api/admin/menu/categories", async (request, reply) => {
    const { data, error } = await supabase()
      .from("categories")
      .select(CATEGORY_COLUMNS)
      .eq("tenant_id", request.tenant.id)
      .order("sort");
    if (error) return reply.code(500).send({ error: "Could not load categories" });
    return reply.send(data ?? []);
  });

  app.post("/api/admin/menu/categories", async (request, reply) => {
    const parsed = CategoryCreateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid category" });
    const { data, error } = await supabase()
      .from("categories")
      .insert({ tenant_id: request.tenant.id, ...parsed.data })
      .select(CATEGORY_COLUMNS)
      .single();
    if (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Could not create category" });
    }
    return reply.code(201).send(data);
  });

  app.patch("/api/admin/menu/categories/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = CategoryUpdateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid category" });
    const { data, error } = await supabase()
      .from("categories")
      .update(parsed.data)
      .eq("tenant_id", request.tenant.id)
      .eq("id", id)
      .select(CATEGORY_COLUMNS)
      .maybeSingle();
    if (error || !data) return reply.code(404).send({ error: "Category not found" });
    return reply.send(data);
  });

  app.delete("/api/admin/menu/categories/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = supabase();
    const { count } = await db
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", request.tenant.id)
      .eq("category_id", id);
    if ((count ?? 0) > 0) {
      return reply
        .code(400)
        .send({ error: "Category has items — move or delete them first" });
    }
    const { error } = await db
      .from("categories")
      .delete()
      .eq("tenant_id", request.tenant.id)
      .eq("id", id);
    if (error) return reply.code(500).send({ error: "Could not delete category" });
    return reply.send({ ok: true });
  });

  // ── menu items ──────────────────────────────────────────────────────────
  app.get("/api/admin/menu/items", async (request, reply) => {
    const { data, error } = await supabase()
      .from("menu_items")
      .select(ITEM_COLUMNS)
      .eq("tenant_id", request.tenant.id)
      .order("sort");
    if (error) return reply.code(500).send({ error: "Could not load items" });
    return reply.send(data ?? []);
  });

  app.post("/api/admin/menu/items", async (request, reply) => {
    const parsed = MenuItemCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid item",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const db = supabase();
    // category must belong to this tenant
    const { data: cat } = await db
      .from("categories")
      .select("id")
      .eq("tenant_id", request.tenant.id)
      .eq("id", parsed.data.category_id)
      .maybeSingle();
    if (!cat) return reply.code(400).send({ error: "Invalid category" });

    const { data, error } = await db
      .from("menu_items")
      .insert({ tenant_id: request.tenant.id, ...parsed.data })
      .select(ITEM_COLUMNS)
      .single();
    if (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Could not create item" });
    }
    return reply.code(201).send(data);
  });

  app.patch("/api/admin/menu/items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = MenuItemUpdateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid item" });
    const db = supabase();
    if (parsed.data.category_id) {
      const { data: cat } = await db
        .from("categories")
        .select("id")
        .eq("tenant_id", request.tenant.id)
        .eq("id", parsed.data.category_id)
        .maybeSingle();
      if (!cat) return reply.code(400).send({ error: "Invalid category" });
    }
    const { data, error } = await db
      .from("menu_items")
      .update(parsed.data)
      .eq("tenant_id", request.tenant.id)
      .eq("id", id)
      .select(ITEM_COLUMNS)
      .maybeSingle();
    if (error || !data) return reply.code(404).send({ error: "Item not found" });
    return reply.send(data);
  });

  app.delete("/api/admin/menu/items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { error } = await supabase()
      .from("menu_items")
      .delete()
      .eq("tenant_id", request.tenant.id)
      .eq("id", id);
    if (error) return reply.code(500).send({ error: "Could not delete item" });
    return reply.send({ ok: true });
  });
}
