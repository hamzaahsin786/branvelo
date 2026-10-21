"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OrderRow, OrderStatus } from "@branvelo/shared";
import { STATUS_LABELS, formatRs } from "@branvelo/shared";
import { createBrowserSupabase } from "@/lib/supabase-browser";

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    osc.start();
    osc.stop(ctx.currentTime + 0.75);
  } catch {
    /* audio not available */
  }
}

const TABS: { key: string; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: "active", label: "Active", match: (s) => !["delivered", "cancelled", "refunded"].includes(s) },
  { key: "all", label: "All", match: () => true },
  { key: "delivered", label: "Delivered", match: (s) => s === "delivered" },
  { key: "cancelled", label: "Cancelled", match: (s) => ["cancelled", "refunded"].includes(s) },
];

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  ready: "bg-purple-100 text-purple-800",
  dispatched: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-neutral-200 text-neutral-700",
};

/**
 * Live order feed - subscribes to postgres_changes on orders (RLS-scoped to
 * the staff member's tenant) and beeps on every new order.
 */
export function OrderFeed({
  initialOrders,
  tenantId,
}: {
  initialOrders: OrderRow[];
  tenantId: string;
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`admin-orders-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as OrderRow;
          setOrders((prev) =>
            prev.some((o) => o.id === row.id) ? prev : [row, ...prev]
          );
          beep();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as OrderRow;
          setOrders((prev) =>
            prev.map((o) => (o.id === row.id ? { ...o, ...row } : o))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const filtered = useMemo(() => {
    const t = TABS.find((x) => x.key === tab) ?? TABS[0];
    return orders.filter((o) => t.match(o.status));
  }, [orders, tab]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Orders</h1>
        <span className="flex items-center gap-1.5 text-xs text-green-700">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          Live
        </span>
      </div>

      <div className="mt-3 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              tab === t.key
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-500 ring-1 ring-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-500">
          No orders here yet.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {filtered.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-100"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-extrabold">#{o.order_no}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${STATUS_COLORS[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium">{o.customer_name}</p>
                <p className="text-xs text-neutral-500">
                  {o.type === "delivery" ? "Delivery" : "Pick-Up"} ·{" "}
                  {o.items.reduce((n, it) => n + it.qty, 0)} items ·{" "}
                  {new Date(o.created_at).toLocaleTimeString("en-PK", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 text-sm font-extrabold">{formatRs(o.total)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
