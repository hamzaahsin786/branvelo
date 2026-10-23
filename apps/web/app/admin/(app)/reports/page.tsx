"use client";

/**
 * Reports page (v2): sales summary from the Django reports API —
 * totals, per-day table, top items, busiest hours, CSV downloads.
 */
import { useCallback, useEffect, useState } from "react";
import { staffFetch } from "@/lib/staff-api";
import { formatRs } from "@/components/storefront/Storefront";

interface SalesReport {
  from: string;
  to: string;
  orders: number;
  revenue_pkr: number;
  avg_order_pkr: number;
  by_day: { date: string; orders: number; revenue: number }[];
  by_hour: { hour: number; orders: number; revenue: number }[];
  by_item: { name: string; qty: number; revenue: number }[];
  by_status: Record<string, number>;
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function ReportsPage() {
  const [from, setFrom] = useState(daysAgoStr(6));
  const [to, setTo] = useState(daysAgoStr(0));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [feedback, setFeedback] = useState<
    { id: number; type: string; message: string; status: string; created_at: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [salesRes, fbRes] = await Promise.all([
        staffFetch(`/api/staff/reports/sales?from=${from}&to=${to}`),
        staffFetch("/api/staff/feedback"),
      ]);
      if (!salesRes.ok) throw new Error("sales");
      setReport((await salesRes.json()) as SalesReport);
      if (fbRes.ok) setFeedback((await fbRes.json()).feedback || []);
      setError(null);
    } catch {
      setError("Could not load reports for this range.");
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadCsv = async (kind: "days" | "items") => {
    const res = await staffFetch(
      `/api/staff/reports/sales.csv?kind=${kind}&from=${from}&to=${to}`,
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${kind}-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setFeedbackStatus = async (id: number, statusValue: string) => {
    const res = await staffFetch(`/api/staff/feedback/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: statusValue }),
    });
    if (res.ok) {
      setFeedback((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: statusValue } : f)),
      );
    }
  };

  const maxHourOrders = Math.max(1, ...(report?.by_hour.map((h) => h.orders) || [1]));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-black">Reports</h1>
        <div className="ml-auto flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-semibold outline-none" />
          <span className="text-sm font-bold text-neutral-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-semibold outline-none" />
        </div>
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">{error}</p>}

      {report && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Orders", value: `${report.orders}` },
              { label: "Revenue", value: formatRs(report.revenue_pkr) },
              { label: "Avg order", value: formatRs(report.avg_order_pkr) },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
                <p className="text-[12px] font-extrabold uppercase tracking-wide text-neutral-400">{card.label}</p>
                <p className="mt-1 text-xl font-black">{card.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] font-semibold text-neutral-400">
            Cancelled orders are excluded. Status mix:{" "}
            {Object.entries(report.by_status).map(([s, n]) => `${s} ${n}`).join(" · ") || "none"}
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black">Sales by day</h2>
                <button onClick={() => downloadCsv("days")} className="rounded-full bg-neutral-900 px-3 py-1 text-[12px] font-extrabold text-white">CSV</button>
              </div>
              <div className="mt-2">
                {report.by_day.length === 0 && <p className="text-sm font-semibold text-neutral-400">No sales in this range.</p>}
                {report.by_day.map((d) => (
                  <p key={d.date} className="flex justify-between border-b border-neutral-50 py-1.5 text-sm font-semibold text-neutral-600">
                    <span>{d.date}</span>
                    <span>{d.orders} orders · {formatRs(d.revenue)}</span>
                  </p>
                ))}
              </div>
              <h2 className="mt-5 text-sm font-black">Busiest hours</h2>
              <div className="mt-2 flex items-end gap-1" style={{ height: 72 }}>
                {report.by_hour.map((h) => (
                  <div key={h.hour} className="flex flex-1 flex-col items-center gap-1" title={`${h.hour}:00 — ${h.orders} orders`}>
                    <div className="w-full rounded-t bg-[#2C24A3]" style={{ height: `${Math.max(6, (h.orders / maxHourOrders) * 56)}px` }} />
                    <span className="text-[10px] font-bold text-neutral-400">{h.hour}</span>
                  </div>
                ))}
                {report.by_hour.length === 0 && <p className="text-sm font-semibold text-neutral-400">No data.</p>}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black">Top items</h2>
                <button onClick={() => downloadCsv("items")} className="rounded-full bg-neutral-900 px-3 py-1 text-[12px] font-extrabold text-white">CSV</button>
              </div>
              <div className="mt-2">
                {report.by_item.length === 0 && <p className="text-sm font-semibold text-neutral-400">No items sold in this range.</p>}
                {report.by_item.map((item, i) => (
                  <p key={item.name} className="flex justify-between border-b border-neutral-50 py-1.5 text-sm font-semibold text-neutral-600">
                    <span>{i + 1}. {item.name}</span>
                    <span>{item.qty} sold · {formatRs(item.revenue)}</span>
                  </p>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className="text-sm font-black">Customer feedback</h2>
        {feedback.length === 0 && <p className="mt-2 text-sm font-semibold text-neutral-400">No feedback yet.</p>}
        <div className="mt-2 flex flex-col gap-2">
          {feedback.map((f) => (
            <div key={f.id} className="flex flex-wrap items-start gap-2 rounded-xl bg-neutral-50 px-3 py-2.5">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold capitalize ${
                f.type === "complaint" ? "bg-red-50 text-red-700" : f.type === "praise" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
              }`}>
                {f.type}
              </span>
              <p className="min-w-40 flex-1 text-sm font-semibold text-neutral-700">{f.message}</p>
              <span className="text-[12px] font-semibold text-neutral-400">
                {new Date(f.created_at).toLocaleDateString("en-PK")}
              </span>
              {f.status !== "resolved" ? (
                <button onClick={() => setFeedbackStatus(f.id, "resolved")} className="rounded-full bg-neutral-900 px-3 py-1 text-[12px] font-extrabold text-white">
                  Mark resolved
                </button>
              ) : (
                <span className="rounded-full bg-green-50 px-3 py-1 text-[12px] font-extrabold text-green-700">Resolved</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
