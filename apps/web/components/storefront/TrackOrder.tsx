"use client";

/**
 * Public order tracking (v2): REST snapshot + live websocket updates
 * from the Django ordering API, with polling as a fallback.
 */
import { useEffect, useRef, useState } from "react";
import { tenantApiOrigin } from "@/lib/staff-api";
import { formatRs } from "./Storefront";

interface TrackedOrder {
  id: string;
  order_no: number;
  status: string;
  type: string;
  items: {
    name: string;
    qty: number;
    unit_price_pkr: number;
    line_total_pkr: number;
    modifiers: { name: string; price_delta_pkr: number }[];
  }[];
  subtotal_pkr: number;
  delivery_fee_pkr: number;
  discount_pkr: number;
  total_pkr: number;
  payment_method: string;
  created_at: string;
  history: { from_status: string | null; to_status: string; created_at: string }[];
  restaurant?: { name: string; phone: string };
}

const STEP_LABELS: Record<string, string> = {
  placed: "Order placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  dispatched: "Out for delivery",
  delivered: "Delivered",
};

export function TrackOrder({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${tenantApiOrigin()}/api/orders/${orderId}`);
        if (res.status === 404) return setState("missing");
        if (!res.ok) throw new Error("bad");
        const data = (await res.json()) as TrackedOrder;
        if (!cancelled) {
          setOrder(data);
          setState("ready");
        }
        return data;
      } catch {
        if (!cancelled && state === "loading") setState("error");
      }
    };
    load();
    pollRef.current = setInterval(load, 25000);

    let ws: WebSocket | null = null;
    try {
      const wsOrigin = tenantApiOrigin().replace(/^http/, "ws");
      ws = new WebSocket(`${wsOrigin}/ws/track/${orderId}`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.order) {
            setOrder((prev) => ({ ...(prev as TrackedOrder), ...msg.order }));
            setState("ready");
          }
        } catch { /* ignore malformed frames */ }
      };
    } catch { /* polling covers it */ }

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (state === "loading") {
    return <Shell><p className="text-sm font-semibold text-neutral-400">Loading your order...</p></Shell>;
  }
  if (state === "missing") {
    return (
      <Shell>
        <h1 className="text-lg font-black">Order not found</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-500">
          This tracking link does not match any order at this restaurant.
        </p>
      </Shell>
    );
  }
  if (state === "error" || !order) {
    return <Shell><p className="text-sm font-semibold text-neutral-500">Could not load the order. Please refresh.</p></Shell>;
  }

  const steps =
    order.type === "delivery"
      ? ["placed", "confirmed", "preparing", "ready", "dispatched", "delivered"]
      : ["placed", "confirmed", "preparing", "ready", "delivered"];
  const currentIdx = steps.indexOf(order.status);
  const cancelledOrder = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-[#FAFAFF] px-4 py-8 text-neutral-900">
      <div className="mx-auto max-w-md">
        <p className="text-center text-[13px] font-bold uppercase tracking-widest text-neutral-400">
          {order.restaurant?.name || "Your order"}
        </p>
        <h1 className="mt-1 text-center text-2xl font-black">Order #{order.order_no}</h1>
        <p className="mt-1 text-center text-sm font-semibold text-neutral-500">
          {order.type === "delivery" ? "Delivery" : "Pickup"} - {formatRs(order.total_pkr)} -{" "}
          {order.payment_method === "cod" ? "Cash on delivery" : order.payment_method}
        </p>

        {cancelledOrder ? (
          <div className="mt-6 rounded-3xl bg-red-50 p-5 text-center ring-1 ring-red-100">
            <p className="text-base font-black text-red-700">This order was cancelled</p>
            {order.restaurant?.phone && (
              <p className="mt-1 text-sm font-semibold text-red-600">
                Questions? Call {order.restaurant.phone}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-neutral-100">
            {steps.map((step, i) => {
              const done = i < currentIdx;
              const current = i === currentIdx;
              const at = order.history.find((h) => h.to_status === step)?.created_at;
              return (
                <div key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black text-white ${
                        done || current ? "bg-[#2C24A3]" : "bg-neutral-200 text-neutral-400"
                      }`}
                    >
                      {done ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    {i < steps.length - 1 && (
                      <span className={`w-0.5 flex-1 ${done ? "bg-[#2C24A3]" : "bg-neutral-100"}`} style={{ minHeight: 22 }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-sm font-extrabold ${current ? "text-[#2C24A3]" : done ? "text-neutral-800" : "text-neutral-400"}`}>
                      {STEP_LABELS[step]}
                      {current && order.status !== "delivered" && <span className="ml-2 animate-pulse text-[11px] font-black uppercase">Now</span>}
                    </p>
                    {at && (
                      <p className="text-[12px] font-semibold text-neutral-400">
                        {new Date(at).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 rounded-3xl bg-white p-5 ring-1 ring-neutral-100">
          <h2 className="text-sm font-black">Items</h2>
          <div className="mt-2 flex flex-col gap-2">
            {order.items.map((line, i) => (
              <div key={i} className="flex justify-between gap-3 text-sm">
                <div>
                  <p className="font-bold">
                    {line.qty} × {line.name}
                  </p>
                  {line.modifiers.length > 0 && (
                    <p className="text-[12px] font-semibold text-neutral-400">
                      {line.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                </div>
                <p className="font-extrabold">{formatRs(line.line_total_pkr)}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-sm font-semibold text-neutral-600">
            <p className="flex justify-between"><span>Subtotal</span><span>{formatRs(order.subtotal_pkr)}</span></p>
            {order.discount_pkr > 0 && (
              <p className="flex justify-between text-green-700"><span>Discount</span><span>- {formatRs(order.discount_pkr)}</span></p>
            )}
            {order.type === "delivery" && (
              <p className="flex justify-between"><span>Delivery</span><span>{order.delivery_fee_pkr === 0 ? "Free" : formatRs(order.delivery_fee_pkr)}</span></p>
            )}
            <p className="flex justify-between text-base font-black text-neutral-900"><span>Total</span><span>{formatRs(order.total_pkr)}</span></p>
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] font-bold text-neutral-400">
          This page updates live. Powered by Branvelo
        </p>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFF] px-4">
      <div className="text-center">{children}</div>
    </div>
  );
}
