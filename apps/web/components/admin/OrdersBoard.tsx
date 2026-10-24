"use client";

/**
 * Admin orders board (v2): today's orders from the Django staff API,
 * live updates over the admin websocket, role-gated status actions
 * (the API's state machine is the real enforcer; this mirrors it so
 * staff only see moves they may actually make).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getStaffToken, staffFetch, tenantApiOrigin } from "@/lib/staff-api";
import { formatRs } from "@/components/storefront/Storefront";

interface OrderSummary {
  id: string;
  order_no: number;
  status: string;
  type: string;
  customer_name: string;
  customer_phone: string;
  total_pkr: number;
  payment_method: string;
  source: string;
  created_at: string;
  rider_name: string;
  assigned_rider: { id: number; name: string } | null;
}

interface RiderOption {
  id: number;
  name: string;
}
interface OrderDetail extends OrderSummary {
  customer_address: string;
  items: {
    name: string;
    qty: number;
    unit_price_pkr: number;
    line_total_pkr: number;
    modifiers: { group: string; name: string; price_delta_pkr: number }[];
    note?: string;
  }[];
  subtotal_pkr: number;
  delivery_fee_pkr: number;
  discount_pkr: number;
  tax_pkr: number;
  coupon_code: string | null;
  customer_note: string;
  branch_name: string;
  scheduled_for: string | null;
  history: { from_status: string | null; to_status: string; actor: string; created_at: string }[];
}

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  preparing: "bg-violet-50 text-violet-700",
  ready: "bg-teal-50 text-teal-700",
  dispatched: "bg-indigo-50 text-indigo-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

const NEXT_ACTIONS: Record<string, { to: string; label: string; roles: string[] }[]> = {
  placed: [
    { to: "confirmed", label: "Confirm", roles: ["owner", "manager", "cashier"] },
    { to: "cancelled", label: "Cancel", roles: ["owner", "manager"] },
  ],
  confirmed: [
    { to: "preparing", label: "Start preparing", roles: ["owner", "manager", "kitchen"] },
    { to: "cancelled", label: "Cancel", roles: ["owner", "manager"] },
  ],
  preparing: [
    { to: "ready", label: "Mark ready", roles: ["owner", "manager", "kitchen"] },
    { to: "cancelled", label: "Cancel", roles: ["owner", "manager"] },
  ],
  ready: [
    { to: "dispatched", label: "Dispatch", roles: ["owner", "manager", "cashier", "rider"] },
    { to: "delivered", label: "Hand over", roles: ["owner", "manager", "cashier"] },
    { to: "cancelled", label: "Cancel", roles: ["owner", "manager"] },
  ],
  dispatched: [
    { to: "delivered", label: "Delivered", roles: ["owner", "manager", "rider"] },
  ],
  delivered: [],
  cancelled: [],
};

function whatsAppLink(order: OrderDetail, tenantName: string): string {
  let digits = order.customer_phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;
  const text =
    `Assalam o Alaikum ${order.customer_name}, your order #${order.order_no} ` +
    `at ${tenantName || "our restaurant"} is ${order.status}. ` +
    `Total: ${formatRs(order.total_pkr)}. Thank you for ordering with us.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function todayStr(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function OrdersBoard() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [role, setRole] = useState<string>("");
  const [tenantName, setTenantName] = useState<string>("");
  const [date, setDate] = useState(todayStr());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, OrderDetail>>({});
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [assignPick, setAssignPick] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await staffFetch(`/api/staff/orders/?date=${date}`);
      if (!res.ok) throw new Error("load");
      const data = await res.json();
      setOrders(data.orders as OrderSummary[]);
    } catch {
      setError("Could not load orders. Retrying automatically.");
    }
  }, [date]);

  useEffect(() => {
    load();
    staffFetch("/api/staff/me")
      .then((r) => r.json())
      .then((d) => {
        const myRole = d.user?.role || "";
        setRole(myRole);
        setTenantName(d.tenant?.name || "");
        if (["owner", "manager", "cashier"].includes(myRole)) {
          staffFetch("/api/staff/team")
            .then((r) => r.json())
            .then((t) => {
              setRiders(
                ((t.team || []) as { id: number; name: string; role: string; is_active: boolean }[])
                  .filter((m) => m.role === "rider" && m.is_active)
                  .map((m) => ({ id: m.id, name: m.name })),
              );
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
    const poll = setInterval(load, 20000);
    return () => clearInterval(poll);
  }, [load]);

  useEffect(() => {
    const token = getStaffToken();
    if (!token) return;
    let ws: WebSocket | null = null;
    try {
      const wsOrigin = tenantApiOrigin().replace(/^http/, "ws");
      ws = new WebSocket(`${wsOrigin}/ws/admin/orders?token=${encodeURIComponent(token)}`);
      ws.onopen = () => setLive(true);
      ws.onclose = () => setLive(false);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          const incoming = msg.order as OrderDetail;
          if (!incoming) return;
          if (msg.event === "order.created") {
            setOrders((prev) =>
              prev.some((o) => o.id === incoming.id) ? prev : [incoming, ...prev],
            );
            // New-order alert: browser notification when the owner has
            // enabled it and the tab is in the background.
            try {
              if (
                typeof Notification !== "undefined" &&
                Notification.permission === "granted" &&
                document.hidden
              ) {
                new Notification(`New order #${incoming.order_no}`, {
                  body: `${incoming.customer_name} - ${formatRs(incoming.total_pkr)}`,
                });
              }
            } catch { /* notifications unsupported */ }
          } else {
            setOrders((prev) =>
              prev.map((o) => (o.id === incoming.id ? { ...o, status: incoming.status } : o)),
            );
            setDetails((prev) =>
              prev[incoming.id] ? { ...prev, [incoming.id]: incoming } : prev,
            );
          }
        } catch { /* ignore malformed frames */ }
      };
      wsRef.current = ws;
    } catch { /* polling covers it */ }
    return () => ws?.close();
  }, []);

  const toggleDetail = async (id: string) => {
    if (expanded === id) return setExpanded(null);
    setExpanded(id);
    if (!details[id]) {
      try {
        const res = await staffFetch(`/api/staff/orders/${id}`);
        if (res.ok) {
          const data = (await res.json()) as OrderDetail;
          setDetails((prev) => ({ ...prev, [id]: data }));
        }
      } catch { /* detail stays collapsed content */ }
    }
  };

  const transition = async (id: string, to: string) => {
    setError(null);
    try {
      const res = await staffFetch(`/api/staff/orders/${id}/transition`, {
        method: "POST",
        body: JSON.stringify({ to_status: to }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail || "That move is not allowed.");
        return;
      }
      const updated = body as OrderDetail;
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: updated.status } : o)));
      setDetails((prev) => ({ ...prev, [id]: updated }));
    } catch {
      setError("Network error while updating the order.");
    }
  };

  const assign = async (id: string) => {
    const riderId = Number(assignPick[id]);
    if (!riderId) {
      setError("Choose a rider first.");
      return;
    }
    setError(null);
    try {
      const res = await staffFetch(`/api/staff/orders/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ rider_id: riderId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail || "Could not assign the rider.");
        return;
      }
      const updated = body as OrderDetail;
      setDetails((prev) => ({ ...prev, [id]: updated }));
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, rider_name: updated.rider_name, assigned_rider: updated.assigned_rider }
            : o,
        ),
      );
    } catch {
      setError("Network error while assigning the rider.");
    }
  };

  const activeCount = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((n, o) => n + o.total_pkr, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-black">Orders</h1>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${live ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
          {live ? "● Live" : "○ Polling"}
        </span>
        <button
          onClick={() => {
            if (typeof Notification !== "undefined") void Notification.requestPermission();
          }}
          className="rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-neutral-500 ring-1 ring-neutral-200"
        >
          Enable alerts
        </button>
        <span className="text-sm font-bold text-neutral-500">
          {activeCount} active - {formatRs(revenue)} today{date === todayStr() ? "" : ` (${date})`}
        </span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="ml-auto rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-semibold outline-none"
        />
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{error}</p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {orders.length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-neutral-400 ring-1 ring-neutral-100">
            No orders for this day yet. New orders appear here live.
          </p>
        )}
        {orders.map((order) => {
          const detail = details[order.id];
          const isOpen = expanded === order.id;
          return (
            <article key={order.id} className="rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => toggleDetail(order.id)} className="text-base font-black">
                  #{order.order_no} {isOpen ? "▾" : "▸"}
                </button>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold capitalize ${STATUS_STYLES[order.status] || "bg-neutral-100 text-neutral-600"}`}>
                  {order.status}
                </span>
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-extrabold capitalize text-neutral-600">
                  {order.type}
                </span>
                {(order.assigned_rider || order.rider_name) && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-extrabold text-indigo-700">
                    Rider: {order.assigned_rider?.name || order.rider_name}
                  </span>
                )}
                <span className="text-sm font-bold text-neutral-500">
                  {order.customer_name} - {order.customer_phone}
                </span>
                <span className="ml-auto text-sm font-black">{formatRs(order.total_pkr)}</span>
                <span className="text-[12px] font-semibold text-neutral-400">
                  {new Date(order.created_at).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(NEXT_ACTIONS[order.status] || [])
                  .filter((a) => role === "" || a.roles.includes(role))
                  .map((action) => (
                    <button
                      key={action.to}
                      onClick={() => transition(order.id, action.to)}
                      className={`rounded-full px-4 py-1.5 text-[13px] font-extrabold ${
                        action.to === "cancelled"
                          ? "bg-white text-red-600 ring-1 ring-red-200"
                          : "bg-neutral-900 text-white"
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
              </div>

              {isOpen && (
                <div className="mt-3 border-t border-neutral-100 pt-3">
                  {!detail ? (
                    <p className="text-sm font-semibold text-neutral-400">Loading details...</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        {detail.items.map((line, i) => (
                          <p key={i} className="text-sm font-semibold text-neutral-700">
                            {line.qty} × {line.name} - {formatRs(line.line_total_pkr)}
                            {line.modifiers.length > 0 && (
                              <span className="block text-[12px] font-semibold text-neutral-400">
                                {line.modifiers.map((m) => `${m.group}: ${m.name}`).join(" - ")}
                              </span>
                            )}
                            {line.note && (
                              <span className="block text-[12px] font-semibold italic text-amber-700">
                                Note: {line.note}
                              </span>
                            )}
                          </p>
                        ))}
                        <p className="mt-2 text-[13px] font-semibold text-neutral-500">
                          Subtotal {formatRs(detail.subtotal_pkr)}
                          {detail.discount_pkr > 0 && ` - Discount -${formatRs(detail.discount_pkr)} (${detail.coupon_code || "coupon"})`}
                          {detail.type === "delivery" && ` - Delivery ${detail.delivery_fee_pkr === 0 ? "free" : formatRs(detail.delivery_fee_pkr)}`}
                          {detail.tax_pkr > 0 && ` - Tax ${formatRs(detail.tax_pkr)}`}
                          {` - ${detail.payment_method === "cod" ? "Cash on delivery" : detail.payment_method}`}
                        </p>
                        {detail.customer_note && (
                          <p className="mt-1 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-800">
                            Customer note: {detail.customer_note}
                          </p>
                        )}
                        {detail.branch_name && (
                          <p className="mt-1 text-[13px] font-semibold text-neutral-500">
                            Pickup branch: {detail.branch_name}
                          </p>
                        )}
                        {detail.scheduled_for && (
                          <p className="mt-1 text-[13px] font-semibold text-neutral-500">
                            Scheduled for: {new Date(detail.scheduled_for).toLocaleString("en-PK")}
                          </p>
                        )}
                        {detail.customer_address && (
                          <p className="mt-1 text-[13px] font-semibold text-neutral-500">{detail.customer_address}</p>
                        )}
                        <a
                          href={whatsAppLink(detail, tenantName)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block rounded-full bg-green-600 px-4 py-1.5 text-[13px] font-extrabold text-white"
                        >
                          WhatsApp customer
                        </a>
                        {detail.type === "delivery" && (
                          <div className="mt-3">
                            <p className="text-[12px] font-extrabold uppercase tracking-wide text-neutral-400">
                              Rider
                            </p>
                            <p className="mt-0.5 text-[13px] font-semibold text-neutral-600">
                              {detail.assigned_rider?.name || detail.rider_name || "Not assigned yet"}
                            </p>
                            {["owner", "manager", "cashier"].includes(role) &&
                              !["delivered", "cancelled"].includes(detail.status) && (
                                <div className="mt-1.5 flex gap-1.5">
                                  <select
                                    value={assignPick[detail.id] || ""}
                                    onChange={(e) =>
                                      setAssignPick((prev) => ({
                                        ...prev,
                                        [detail.id]: e.target.value,
                                      }))
                                    }
                                    className="min-w-0 flex-1 rounded-full border border-neutral-200 px-3 py-1.5 text-[13px] font-semibold outline-none"
                                  >
                                    <option value="">
                                      {riders.length ? "Choose a rider" : "No rider accounts yet"}
                                    </option>
                                    {riders.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => assign(detail.id)}
                                    disabled={!riders.length}
                                    className="shrink-0 rounded-full bg-neutral-900 px-4 py-1.5 text-[13px] font-extrabold text-white disabled:opacity-40"
                                  >
                                    Assign
                                  </button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[12px] font-extrabold uppercase tracking-wide text-neutral-400">History</p>
                        {detail.history.map((h, i) => (
                          <p key={i} className="text-[13px] font-semibold text-neutral-500">
                            {h.from_status ? `${h.from_status} -> ` : ""}{h.to_status} - {h.actor} -{" "}
                            {new Date(h.created_at).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
