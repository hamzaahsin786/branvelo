"use client";

import { useState } from "react";
import type {
  OrderRow,
  OrderStatus,
  OrderStatusHistoryRow,
} from "@mezban/shared";
import {
  STATUS_LABELS,
  displayPkPhone,
  formatRs,
  nextStatuses,
} from "@mezban/shared";
import { useAuthedApi } from "@/lib/use-authed-api";

interface Props {
  order: OrderRow;
  history: OrderStatusHistoryRow[];
}

/** Order detail + one-tap status advance (state machine enforced by the API). */
export function OrderDetail({ order: initial, history }: Props) {
  const api = useAuthedApi();
  const [order, setOrder] = useState<OrderRow>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advance = async (status: OrderStatus) => {
    setError(null);
    setBusy(true);
    try {
      const res = await api(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const body = (await res.json()) as { error?: string; status?: OrderStatus };
      if (!res.ok) {
        setError(body.error || "Could not update order");
        return;
      }
      setOrder((o) => ({ ...o, status: body.status as OrderStatus }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  const actions = nextStatuses(order.status);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Order #{order.order_no}</h1>
        <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold uppercase text-white">
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => advance(s)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
                s === "cancelled" ? "bg-red-600" : "bg-green-700"
              }`}
            >
              {s === "cancelled"
                ? "Cancel order"
                : `Mark ${STATUS_LABELS[s].toLowerCase()}`}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
            Customer
          </h2>
          <p className="mt-2 font-bold">{order.customer_name}</p>
          <a
            href={`tel:${order.customer_phone}`}
            className="text-sm text-blue-700"
          >
            {displayPkPhone(order.customer_phone)}
          </a>
          {order.customer_address && (
            <p className="mt-1 text-sm text-neutral-600">{order.customer_address}</p>
          )}
          <p className="mt-2 text-xs text-neutral-500">
            {order.type === "delivery" ? "Delivery" : "Pick-Up"} ·{" "}
            {order.payment_method === "cod"
              ? "Cash on delivery"
              : order.payment_method}
            {order.payment_ref && ` · Ref: ${order.payment_ref}`}
          </p>
          {order.notes && (
            <p className="mt-2 rounded-xl bg-yellow-50 p-2 text-sm">
              Note: {order.notes}
            </p>
          )}
          {order.scheduled_for && (
            <p className="mt-2 text-sm font-semibold text-purple-700">
              Scheduled: {new Date(order.scheduled_for).toLocaleString("en-PK")}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
            Items
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {order.items.map((it, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {it.qty} × {it.name}
                </span>
                <span className="font-semibold">{formatRs(it.line_total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t pt-2 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal</span>
              <span>{formatRs(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span>
                <span>−{formatRs(order.discount)}</span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-neutral-500">
                <span>Delivery</span>
                <span>{formatRs(order.delivery_fee)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between font-extrabold">
              <span>Total</span>
              <span>{formatRs(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
          Status history
        </h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {history.map((h) => (
            <li key={h.id} className="flex justify-between text-neutral-600">
              <span>
                {h.from_status ? `${h.from_status} → ` : ""}
                <strong>{h.to_status}</strong>
                {h.actor && ` · ${h.actor}`}
              </span>
              <span className="text-xs text-neutral-400">
                {new Date(h.created_at).toLocaleTimeString("en-PK", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
