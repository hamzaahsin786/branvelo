"use client";

import { useEffect, useState } from "react";
import type { OrderPublic, OrderStatus } from "@branvelo/shared";
import {
  STATUS_FLOW,
  STATUS_LABELS,
  TERMINAL_STATUSES,
  formatRs,
} from "@branvelo/shared";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { apiFetch } from "@/lib/api";
import { useTenantSlug } from "@/lib/tenant-context";
import { ThemeStyle } from "./ThemeStyle";
import { CheckIcon } from "./icons";

interface Props {
  order: OrderPublic;
  themePrimary: string;
}

/** Live order tracking: Realtime broadcast + polling fallback. */
export function TrackClient({ order: initial, themePrimary }: Props) {
  const slug = useTenantSlug();
  const [order, setOrder] = useState<OrderPublic>(initial);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`order:${order.tracking_token}`)
      .on(
        "broadcast",
        { event: "status_changed" },
        (msg: { payload: { status: OrderStatus } }) => {
          setOrder((o) => ({ ...o, status: msg.payload.status }));
        }
      )
      .subscribe();

    const poll = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/orders/${order.tracking_token}`, slug);
        if (res.ok) {
          const fresh = (await res.json()) as OrderPublic;
          setOrder((o) => (o.status !== fresh.status ? fresh : o));
        }
      } catch {
        /* offline - keep last known status */
      }
    }, 15000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.tracking_token]);

  const flowIdx = STATUS_FLOW.indexOf(order.status);
  const terminal = TERMINAL_STATUSES.includes(order.status);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <ThemeStyle
        theme={{ primary: themePrimary, accent: "#FFC400" }}
      />
      <p className="text-center text-xs font-bold uppercase tracking-widest text-neutral-400">
        Order tracking
      </p>
      <h1 className="mt-1 text-center text-3xl font-extrabold">
        Order #{order.order_no}
      </h1>
      <p className="mt-1 text-center text-sm text-neutral-500">
        {order.customer_name} ·{" "}
        {order.type === "delivery" ? "Delivery" : "Pick-Up"} ·{" "}
        {formatRs(order.total)}
      </p>

      <div className="mt-8">
        {terminal ? (
          <div className="rounded-3xl bg-neutral-100 p-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white">
              <CheckIcon className="h-7 w-7" />
            </span>
            <p className="mt-3 text-lg font-extrabold">
              {STATUS_LABELS[order.status]}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {order.status === "delivered" && "Enjoy your meal!"}
              {order.status === "cancelled" && "This order was cancelled."}
              {order.status === "refunded" && "This order was refunded."}
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-0">
            {STATUS_FLOW.map((s, i) => {
              const done = i < flowIdx;
              const current = i === flowIdx;
              return (
                <li key={s} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        done
                          ? "bg-[var(--brand)] text-white"
                          : current
                            ? "bg-[var(--accent)] text-black"
                            : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      {done ? <CheckIcon className="h-4 w-4" /> : i + 1}
                    </span>
                    {i < STATUS_FLOW.length - 1 && (
                      <span
                        className={`h-8 w-0.5 ${done ? "bg-[var(--brand)]" : "bg-neutral-200"}`}
                      />
                    )}
                  </div>
                  <div className="pb-6 pt-1">
                    <p
                      className={`text-sm font-bold ${current ? "" : "text-neutral-500"}`}
                    >
                      {STATUS_LABELS[s]}
                      {current && (
                        <span className="ml-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] uppercase">
                          current
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="mt-6 rounded-3xl bg-neutral-50 p-5">
        <h2 className="text-sm font-extrabold uppercase tracking-wide">
          Your items
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
              <span>Discount</span>
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

      <p className="mt-6 text-center text-xs text-neutral-400">
        Live updates · Powered by Branvelo
      </p>
    </div>
  );
}
