import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  OrderCreateSchema,
  normalizePkPhone,
  type Coupon,
  type MenuItem,
  type OrderItemSnapshot,
  type OrderPublic,
} from "@branvelo/shared";
import { supabase } from "../lib/supabase";
import { ORDER_RATE_LIMIT } from "../lib/rate-limit";

interface DbMenuItem extends MenuItem {
  available: boolean;
}

export async function orderRoutes(app: FastifyInstance) {
  /**
   * POST /api/orders - diner checkout (20/min per IP).
   * Prices are ALWAYS re-read from the DB; client totals are never trusted.
   */
  app.post(
    "/api/orders",
    { config: { rateLimit: ORDER_RATE_LIMIT } },
    async (request, reply) => {
    const parsed = OrderCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "Invalid order", details: parsed.error.flatten().fieldErrors });
    }
    const input = parsed.data;
    const db = supabase();
    const tenantId = request.tenant.id;

    // 1) PK phone validation + normalization
    const phone = normalizePkPhone(input.customer_phone);
    if (!phone) {
      return reply.code(400).send({ error: "Invalid phone number. Use 03XXXXXXXXX" });
    }

    // 2) Re-read every item from the DB (tenant-scoped); verify availability
    const ids = [...new Set(input.items.map((l) => l.menu_item_id))];
    const { data: dbItems, error: itemsErr } = await db
      .from("menu_items")
      .select("id, name, price, available")
      .eq("tenant_id", tenantId)
      .in("id", ids);
    if (itemsErr) {
      request.log.error(itemsErr);
      return reply.code(500).send({ error: "Could not price your order" });
    }
    const byId = new Map((dbItems as DbMenuItem[]).map((i) => [i.id, i]));
    for (const line of input.items) {
      const item = byId.get(line.menu_item_id);
      if (!item) {
        return reply.code(400).send({ error: "An item in your cart no longer exists" });
      }
      if (!item.available) {
        return reply.code(400).send({ error: `"${item.name}" is currently unavailable` });
      }
    }

    // 3) Subtotal from DB prices
    const snapshots: OrderItemSnapshot[] = input.items.map((line) => {
      const item = byId.get(line.menu_item_id) as DbMenuItem;
      return {
        menu_item_id: item.id,
        name: item.name,
        unit_price: item.price,
        qty: line.qty,
        line_total: item.price * line.qty,
      };
    });
    const subtotal = snapshots.reduce((n, s) => n + s.line_total, 0);

    // 3b) Scheduled orders must be in the future (5-min grace for clock skew)
    if (input.scheduled_for) {
      const when = new Date(input.scheduled_for).getTime();
      if (when < Date.now() - 5 * 60_000) {
        return reply.code(400).send({ error: "Scheduled time must be in the future" });
      }
    }

    // 4) Coupon (optional)
    let discount = 0;
    let couponCode: string | null = null;
    let couponClaimed = false;
    if (input.coupon_code) {
      const code = input.coupon_code.toUpperCase();
      const { data: couponRow } = await db
        .from("coupons")
        .select("id, code, type, value, min_order, max_uses, uses, active, valid_from, valid_until")
        .eq("tenant_id", tenantId)
        .eq("code", code)
        .maybeSingle();
      const coupon = couponRow as Coupon | null;
      const now = new Date();
      const usable =
        coupon &&
        coupon.active &&
        (coupon.max_uses == null || coupon.uses < coupon.max_uses) &&
        subtotal >= coupon.min_order &&
        (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
        (!coupon.valid_until || new Date(coupon.valid_until) >= now);
      if (!usable) {
        return reply.code(400).send({ error: "Coupon is invalid or expired" });
      }
      discount =
        coupon.type === "percent"
          ? Math.round((subtotal * coupon.value) / 100)
          : coupon.value;
      discount = Math.min(discount, subtotal);
      couponCode = coupon.code;

      // Atomically claim one use (guarded: active, uses < max_uses, validity
      // window). This prevents max_uses overshoot under concurrency. If the
      // order later fails to save, the claim is released (see below).
      const { data: claimed, error: claimErr } = await db.rpc("claim_coupon_use", {
        p_tenant_id: tenantId,
        p_code: couponCode,
      });
      if (claimErr || claimed !== true) {
        request.log.warn({ couponCode }, "coupon claim lost the race");
        return reply.code(400).send({ error: "This coupon just ran out. Please try another" });
      }
      couponClaimed = true;
    }

    // Releases a claimed coupon use (best-effort compensation when the order
    // fails to save after the claim).
    const releaseCoupon = async () => {
      if (couponClaimed && couponCode) {
        couponClaimed = false;
        await db.rpc("release_coupon_use", { p_tenant_id: tenantId, p_code: couponCode });
      }
    };

    const net = subtotal - discount;

    // 5) Delivery zone + fee (delivery only)
    let deliveryFee = 0;
    let zoneId: string | null = null;
    if (input.type === "delivery") {
      if (!input.customer_address) {
        return reply.code(400).send({ error: "Delivery address is required" });
      }
      if (!input.zone_id) {
        return reply.code(400).send({ error: "Please choose your delivery area" });
      }
      const { data: zoneRow } = await db
        .from("delivery_zones")
        .select("id, fee, min_order, free_above, active")
        .eq("tenant_id", tenantId)
        .eq("id", input.zone_id)
        .maybeSingle();
      const zone = zoneRow as {
        id: string;
        fee: number;
        min_order: number;
        free_above: number | null;
        active: boolean;
      } | null;
      if (!zone || !zone.active) {
        return reply.code(400).send({ error: "Invalid delivery area" });
      }
      if (net < zone.min_order) {
        return reply
          .code(400)
          .send({ error: `Minimum order for this area is Rs ${zone.min_order}` });
      }
      deliveryFee = zone.free_above != null && net >= zone.free_above ? 0 : zone.fee;
      zoneId = zone.id;
    }

    // 6) Tax (if the tenant enabled it)
    const tax = Math.round((net * request.tenant.tax_percent) / 100);
    const total = net + deliveryFee + tax;

    // 7) Upsert customer by (tenant, phone)
    let customerId: string | null = null;
    const { data: existingCustomer } = await db
      .from("customers")
      .select("id, total_orders")
      .eq("tenant_id", tenantId)
      .eq("phone", phone)
      .maybeSingle();
    const existing = existingCustomer as {
      id: string;
      total_orders: number;
    } | null;
    if (existing) {
      customerId = existing.id;
      await db
        .from("customers")
        .update({
          name: input.customer_name,
          address:
            input.type === "delivery" && input.customer_address
              ? input.customer_address
              : undefined,
          total_orders: existing.total_orders + 1,
        })
        .eq("id", customerId);
    } else {
      const { data: created, error: custErr } = await db
        .from("customers")
        .insert({
          tenant_id: tenantId,
          name: input.customer_name,
          phone,
          address: input.type === "delivery" ? input.customer_address : null,
          total_orders: 1,
        })
        .select("id")
        .single();
      if (custErr) {
        request.log.error(custErr);
        await releaseCoupon();
        return reply.code(500).send({ error: "Could not save your order" });
      }
      customerId = (created as { id: string }).id;
    }

    // 8) Per-tenant order number + tracking token
    const { data: orderNo, error: seqErr } = await db.rpc("next_order_no", {
      p_tenant_id: tenantId,
    });
    if (seqErr || typeof orderNo !== "number") {
      request.log.error(seqErr);
      await releaseCoupon();
      return reply.code(500).send({ error: "Could not save your order" });
    }
    const trackingToken = randomBytes(8).toString("hex");

    // 9) Insert order + items + history
    const { data: orderRow, error: orderErr } = await db
      .from("orders")
      .insert({
        tenant_id: tenantId,
        order_no: orderNo,
        tracking_token: trackingToken,
        customer_id: customerId,
        customer_name: input.customer_name,
        customer_phone: phone,
        customer_address: input.type === "delivery" ? input.customer_address : null,
        type: input.type,
        status: "placed",
        items: snapshots,
        subtotal,
        discount,
        delivery_fee: deliveryFee,
        tax,
        total,
        zone_id: zoneId,
        coupon_code: couponCode,
        payment_method: input.payment_method,
        payment_ref: input.payment_ref || null,
        scheduled_for: input.scheduled_for ?? null,
        notes: input.notes || null,
        source: "web",
      })
      .select("id")
      .single();
    if (orderErr || !orderRow) {
      request.log.error(orderErr);
      await releaseCoupon();
      return reply.code(500).send({ error: "Could not save your order" });
    }
    const orderId = (orderRow as { id: string }).id;

    const { error: itemsInsertErr } = await db.from("order_items").insert(
      snapshots.map((s) => ({
        order_id: orderId,
        tenant_id: tenantId,
        menu_item_id: s.menu_item_id,
        name: s.name,
        unit_price: s.unit_price,
        qty: s.qty,
        modifiers: [],
        line_total: s.line_total,
      }))
    );
    if (itemsInsertErr) {
      request.log.error(itemsInsertErr);
    }

    await db.from("order_status_history").insert({
      order_id: orderId,
      tenant_id: tenantId,
      from_status: null,
      to_status: "placed",
      actor: "system",
    });

    return reply.code(201).send({
      id: orderId,
      order_no: orderNo,
      tracking_token: trackingToken,
    });
    }
  );

  /**
   * GET /api/orders/:id - public tracking lookup (tenant-scoped).
   * :id accepts the tracking token or the raw order UUID.
   */
  app.get("/api/orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = supabase();
    const tenantId = request.tenant.id;

    let query = db
      .from("orders")
      .select(
        "id, order_no, tracking_token, customer_name, type, status, items, subtotal, discount, delivery_fee, tax, total, created_at, scheduled_for"
      )
      .eq("tenant_id", tenantId);

    const looksUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    query = looksUuid ? query.eq("id", id) : query.eq("tracking_token", id);

    const { data } = await query.maybeSingle();
    if (!data) {
      return reply.code(404).send({ error: "Order not found" });
    }
    return reply.send(data as OrderPublic);
  });
}
