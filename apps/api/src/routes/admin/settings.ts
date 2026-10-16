import type { FastifyInstance } from "fastify";
import { SettingsUpdateSchema } from "@mezban/shared";
import { supabase } from "../../lib/supabase";

/** GET /api/admin/me — who am I (used by the web admin shell + login check). */
export async function adminMeRoutes(app: FastifyInstance) {
  app.get("/api/admin/me", async (request, reply) => {
    const { data: tenant } = await supabase()
      .from("tenants")
      .select("id, slug, name, logo_url")
      .eq("id", request.tenant.id)
      .single();
    return reply.send({
      user: {
        id: request.adminUser?.id,
        name: request.adminUser?.name,
        role: request.adminUser?.role,
      },
      tenant: tenant ?? { id: request.tenant.id, slug: request.tenant.slug, name: request.tenant.name },
    });
  });
}

/** GET + PUT /api/admin/settings — brand, contact, hours, tax. */
export async function adminSettingsRoutes(app: FastifyInstance) {
  app.get("/api/admin/settings", async (request, reply) => {
    const { data, error } = await supabase()
      .from("tenants")
      .select("theme, announcement, phone, address, hours, tax_percent")
      .eq("id", request.tenant.id)
      .single();
    if (error || !data) return reply.code(500).send({ error: "Could not load settings" });
    return reply.send(data);
  });

  app.put("/api/admin/settings", async (request, reply) => {
    const parsed = SettingsUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid settings",
        details: parsed.error.flatten().fieldErrors,
      });
    }
    const input = parsed.data;
    const db = supabase();

    // Merge theme patch into the existing theme jsonb
    let theme = input.theme as Record<string, string> | undefined;
    if (input.theme) {
      const { data: current } = await db
        .from("tenants")
        .select("theme")
        .eq("id", request.tenant.id)
        .single();
      const existing = ((current as { theme: Record<string, string> } | null)?.theme) ?? {};
      theme = { ...existing, ...input.theme };
    }

    const patch: Record<string, unknown> = {};
    if (input.announcement !== undefined) patch.announcement = input.announcement;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.address !== undefined) patch.address = input.address;
    if (input.tax_percent !== undefined) patch.tax_percent = input.tax_percent;
    if (theme) patch.theme = theme;
    if (input.hours) {
      const { data: current } = await db
        .from("tenants")
        .select("hours")
        .eq("id", request.tenant.id)
        .single();
      const existingHours = ((current as { hours: Record<string, unknown> } | null)?.hours) ?? {};
      patch.hours = { ...existingHours, ...input.hours };
    }

    const { data, error } = await db
      .from("tenants")
      .update(patch)
      .eq("id", request.tenant.id)
      .select("theme, announcement, phone, address, hours, tax_percent")
      .single();
    if (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Could not save settings" });
    }
    return reply.send(data);
  });
}
