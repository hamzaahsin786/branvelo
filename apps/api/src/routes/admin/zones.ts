import type { FastifyInstance } from "fastify";
import { ZoneCreateSchema, ZoneUpdateSchema } from "@branvelo/shared";
import { supabase } from "../../lib/supabase";

const ZONE_COLUMNS =
  "id, tenant_id, name, areas, fee, min_order, free_above, active, sort";

export async function adminZoneRoutes(app: FastifyInstance) {
  app.get("/api/admin/zones", async (request, reply) => {
    const { data, error } = await supabase()
      .from("delivery_zones")
      .select(ZONE_COLUMNS)
      .eq("tenant_id", request.tenant.id)
      .order("sort");
    if (error) return reply.code(500).send({ error: "Could not load zones" });
    return reply.send(data ?? []);
  });

  app.post("/api/admin/zones", async (request, reply) => {
    const parsed = ZoneCreateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid zone" });
    const { data, error } = await supabase()
      .from("delivery_zones")
      .insert({ tenant_id: request.tenant.id, ...parsed.data })
      .select(ZONE_COLUMNS)
      .single();
    if (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Could not create zone" });
    }
    return reply.code(201).send(data);
  });

  app.patch("/api/admin/zones/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = ZoneUpdateSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid zone" });
    const { data, error } = await supabase()
      .from("delivery_zones")
      .update(parsed.data)
      .eq("tenant_id", request.tenant.id)
      .eq("id", id)
      .select(ZONE_COLUMNS)
      .maybeSingle();
    if (error || !data) return reply.code(404).send({ error: "Zone not found" });
    return reply.send(data);
  });

  app.delete("/api/admin/zones/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { error } = await supabase()
      .from("delivery_zones")
      .delete()
      .eq("tenant_id", request.tenant.id)
      .eq("id", id);
    if (error) return reply.code(500).send({ error: "Could not delete zone" });
    return reply.send({ ok: true });
  });
}
