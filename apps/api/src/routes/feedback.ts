import type { FastifyInstance } from "fastify";
import { FeedbackSchema } from "@mezban/shared";
import { supabase } from "../lib/supabase";
import { FEEDBACK_RATE_LIMIT } from "../lib/rate-limit";

/** POST /api/feedback - diner feedback / complaints (10/min per IP). */
export async function feedbackRoutes(app: FastifyInstance) {
  app.post(
    "/api/feedback",
    { config: { rateLimit: FEEDBACK_RATE_LIMIT } },
    async (request, reply) => {
    const parsed = FeedbackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "Invalid feedback", details: parsed.error.flatten().fieldErrors });
    }
    const input = parsed.data;
    const db = supabase();
    const tenantId = request.tenant.id;

    // Link to an order when the diner gave an order number (optional)
    let orderId: string | null = null;
    if (input.order_no) {
      const { data } = await db
        .from("orders")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("order_no", input.order_no)
        .maybeSingle();
      orderId = (data as { id: string } | null)?.id ?? null;
    }

    const { error } = await db.from("feedback").insert({
      tenant_id: tenantId,
      order_id: orderId,
      type: input.type,
      name: input.name || null,
      phone: input.phone || null,
      message: input.message,
      status: "open",
    });
    if (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Could not save your feedback" });
    }
    return reply.code(201).send({ ok: true });
    }
  );
}
