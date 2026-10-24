"use client";

import { useCallback, useEffect, useState } from "react";
import { formatRs } from "@branvelo/shared";
import { staffFetch } from "@/lib/staff-api";

interface DeliveryItem {
  name: string;
  qty: number;
  line_total_pkr: number;
  note?: string;
}

interface MyOrder {
  id: string;
  order_no: number;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: DeliveryItem[];
  total_pkr: number;
  payment_method: string;
  created_at: string;
  customer_note: string;
  branch_name: string;
  scheduled_for: string | null;
}

interface AvailableOrder {
  id: string;
  order_no: number;
  customer_name: string;
  total_pkr: number;
  payment_method: string;
  created_at: string;
}

/** My Deliveries: the rider workspace. Shows the deliveries assigned to
 * the signed-in rider (with the two buttons a rider needs), plus ready
 * unassigned deliveries any rider can take. Taking one assigns it to
 * you and marks it dispatched in one go. */
export function DeliveriesBoard() {
  const [mine, setMine] = useState<MyOrder[] | null>(null);
  const [available, setAvailable] = useState<AvailableOrder[]>([]);
  const [deliveredToday, setDeliveredToday] = useState(0);
  const [myId, setMyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [mineRes, meRes] = await Promise.all([
        staffFetch("/api/staff/orders/mine"),
        staffFetch("/api/staff/me"),
      ]);
      if (meRes.ok) {
        const me = await meRes.json();
        setMyId(me.user?.id ?? null);
      }
      if (!mineRes.ok) throw new Error("load failed");
      const data = await mineRes.json();
      setMine(data.mine as MyOrder[]);
      setAvailable(data.available as AvailableOrder[]);
      setDeliveredToday(data.delivered_today as number);
      setError(null);
    } catch {
      setError("Could not load your deliveries. Retrying automatically.");
    }
  }, []);

  useEffect(() => {
    void load();
    const poll = setInterval(load, 20000);
    return () => clearInterval(poll);
  }, [load]);

  const transition = async (order: MyOrder, to: string) => {
    setError(null);
    setBusyId(order.id);
    try {
      const res = await staffFetch(`/api/staff/orders/${order.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to_status: to }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.detail || "Could not update the order.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the order.");
    } finally {
      setBusyId(null);
    }
  };

  const take = async (order: AvailableOrder) => {
    if (myId === null) return;
    setError(null);
    setBusyId(order.id);
    try {
      const assignRes = await staffFetch(`/api/staff/orders/${order.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ rider_id: myId }),
      });
      const assignBody = await assignRes.json().catch(() => ({}));
      if (!assignRes.ok)
        throw new Error(assignBody.detail || "Could not take this order.");
      const goRes = await staffFetch(`/api/staff/orders/${order.id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to_status: "dispatched" }),
      });
      const goBody = await goRes.json().catch(() => ({}));
      if (!goRes.ok)
        throw new Error(goBody.detail || "Could not start the delivery.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not take this order.");
    } finally {
      setBusyId(null);
    }
  };

  if (mine === null && !error) {
    return (
      <p className="text-sm font-semibold text-neutral-400">Loading deliveries...</p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h1 className="text-lg font-black">My Deliveries</h1>
        <span className="rounded-full bg-green-50 px-3 py-1 text-[12px] font-extrabold text-green-700">
          {deliveredToday} delivered today
        </span>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {mine && mine.length === 0 && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-neutral-400 ring-1 ring-neutral-100">
          Nothing assigned to you right now. Ready orders you can take
          appear below.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(mine ?? []).map((order) => (
          <article key={order.id} className="rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-black">Order #{order.order_no}</p>
              <span
                className={`rounded-full px-3 py-1 text-[12px] font-extrabold ${
                  order.status === "dispatched"
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-teal-50 text-teal-700"
                }`}
              >
                {order.status === "dispatched" ? "On the way" : "Ready to go"}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-neutral-700">
              {order.customer_name} - {order.customer_phone}
            </p>
            {order.customer_address && (
              <p className="mt-0.5 text-sm font-semibold text-neutral-500">
                {order.customer_address}
              </p>
            )}
            {order.customer_note && (
              <p className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-800">
                Customer note: {order.customer_note}
              </p>
            )}
            {order.branch_name && (
              <p className="mt-1 text-[13px] font-semibold text-neutral-500">
                Pickup branch: {order.branch_name}
              </p>
            )}
            {order.scheduled_for && (
              <p className="mt-1 text-[13px] font-semibold text-neutral-500">
                Scheduled for: {new Date(order.scheduled_for).toLocaleString("en-PK")}
              </p>
            )}
            <div className="mt-2 border-t border-neutral-100 pt-2">
              {order.items.map((line, i) => (
                <p key={i} className="text-[13px] font-semibold text-neutral-500">
                  {line.qty} x {line.name} - {formatRs(line.line_total_pkr)}
                  {line.note && (
                    <span className="block text-[12px] font-semibold italic text-amber-700">
                      Note: {line.note}
                    </span>
                  )}
                </p>
              ))}
              <p className="mt-1.5 text-sm font-black">
                {order.payment_method === "cod"
                  ? `Collect ${formatRs(order.total_pkr)} (cash on delivery)`
                  : `Paid online - ${formatRs(order.total_pkr)}`}
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <a
                href={`tel:${order.customer_phone.replace(/\s/g, "")}`}
                className="rounded-full bg-neutral-100 px-4 py-2.5 text-sm font-extrabold text-neutral-700"
              >
                Call customer
              </a>
              {order.status === "ready" && (
                <button
                  onClick={() => transition(order, "dispatched")}
                  disabled={busyId === order.id}
                  className="flex-1 rounded-full bg-neutral-900 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
                >
                  Start delivery
                </button>
              )}
              {order.status === "dispatched" && (
                <button
                  onClick={() => transition(order, "delivered")}
                  disabled={busyId === order.id}
                  className="flex-1 rounded-full bg-green-600 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
                >
                  Mark delivered
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {available.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-extrabold uppercase tracking-wide text-neutral-400">
            Ready and unassigned
          </h2>
          <div className="flex flex-col gap-2">
            {available.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-neutral-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">
                    Order #{order.order_no} - {order.customer_name}
                  </p>
                  <p className="text-[12px] font-semibold text-neutral-400">
                    {order.payment_method === "cod"
                      ? `Collect ${formatRs(order.total_pkr)}`
                      : `Paid online - ${formatRs(order.total_pkr)}`}
                    {" - "}
                    {new Date(order.created_at).toLocaleTimeString("en-PK", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => take(order)}
                  disabled={busyId === order.id}
                  className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                >
                  Take delivery
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
