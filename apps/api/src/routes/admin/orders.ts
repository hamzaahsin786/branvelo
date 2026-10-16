import type { FastifyInstance } from "fastify";
import {
  OrderStatusUpdateSchema,
  isValidTransition,
  type OrderRow,
} from "@mezban/shared";
import { supabase } from "../../lib/supabase";
import { broadcastOrderStatus } from "../../lib/broadcast";

const ORDER_COLUMNS =
  "id, tenant_id, branch_id, order_no, tracking_token, customer_id, customer_name, customer_phone, customer_address, type, status, items, subtotal, discount, delivery_fee, tax, total, zone_id, coupon_code, payment_method, payment_ref, scheduled_for, notes, source, created_at, updated_at";

export async function adminOrderRoutes(app: FastifyInstance) {
  /** GET /api/admin/orders — recent orders for the dashboard (newest first). */
  app.get("/api/admin/orders", async (request, reply) => {
    const query = request.query as { status?: string; limit?: string };
    const db = supabase();
    let q = db
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("tenant_id", request.tenant.id)
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(query.limit) || 50, 200));
    if (query.status) q = q.eq("status", query.status);
    const { data, error } = await q;
    if (error) {
      request.log.error(error);
      return reply.code(500).send({ error: "Could not load orders" });
    }
    return reply.send((data ?? []) as OrderRow[]);
  });

  /** GET /api/admin/orders/:id — single order with items + status history. */
  app.get("/api/admin/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = supabase();
    const { data: order } = await db
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("tenant_id", request.tenant.id)
      .eq("id", id)
      .maybeSingle();
    if (!order) return reply.code(404).send({ error: "Order not found" });

    const { data: history } = await db
      .from("order_status_history")
      .select("id, from_status, to_status, actor, note, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true });

    return reply.send({ order: order as OrderRow, history: history ?? [] });
  });

  /**
   * PATCH /api/admin/orders/:id/status — advance (or cancel) an order.
   * The state machine is enforced: only nextStatuses(from) are allowed.
   */
  app.patch("/api/admin/orders/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = OrderStatusUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid status update" });
    }
    const { status: to, note } = parsed.data;
    const db = supabase();

    const { data: orderRow } = await db
      .from("orders")
      .select("id, status, order_no, tracking_token")
      .eq("tenant_id", request.tenant.id)
      .eq("id", id)
      .maybeSingle();
    const order = orderRow as {
      id: string;
      status: OrderRow["status"];
      order_no: number;
      tracking_token: string;
    } | null;
    if (!order) return reply.code(404).send({ error: "Order not found" });

    if (!isValidTransition(order.status, to)) {
      return reply
        .code(400)
        .send({ error: `Cannot move order from ${order.status} to ${to}` });
    }

    const { error: updateErr } = await db
      .from("orders")
      .update({ status: to })
      .eq("id", id);
    if (updateErr) {
      request.log.error(updateErr);
      return reply.code(500).send({ error: "Could not update order" });
    }

    await db.from("order_status_history").insert({
      order_id: id,
      tenant_id: request.tenant.id,
      from_status: order.status,
      to_status: to,
      actor: request.adminUser?.name || request.adminUser?.role || "staff",
      note: note || null,
    });

    // Push the update to the diner's tracking page (best-effort)
    await broadcastOrderStatus(order.tracking_token, {
      status: to,
      order_no: order.order_no,
    });

    return reply.send({ ok: true, status: to });
  });
}
