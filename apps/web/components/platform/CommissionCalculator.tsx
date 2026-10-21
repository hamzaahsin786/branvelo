"use client";

import { useMemo, useState } from "react";

const PKR = new Intl.NumberFormat("en-PK");

/**
 * Interactive commission calculator: the visitor's monthly marketplace
 * commission vs Branvelo's flat fee. pricePkr comes from the page so the
 * pricing section and the calculator can never disagree.
 */
export default function CommissionCalculator({ pricePkr }: { pricePkr: number }) {
  const [monthlyOrders, setMonthlyOrders] = useState(900);
  const [avgOrder, setAvgOrder] = useState(650);
  const [commissionPct, setCommissionPct] = useState(25);

  const { monthlySales, monthlyCommission, yearlyCommission, yearlySaving } =
    useMemo(() => {
      const sales = monthlyOrders * avgOrder;
      const commission = Math.round((sales * commissionPct) / 100);
      const yearly = commission * 12;
      return {
        monthlySales: sales,
        monthlyCommission: commission,
        yearlyCommission: yearly,
        yearlySaving: yearly - pricePkr * 12,
      };
    }, [monthlyOrders, avgOrder, commissionPct, pricePkr]);

  const field =
    "w-full rounded-xl border border-[#D9D6F5] bg-white px-3.5 py-2.5 text-[15px] font-bold text-[#17143A] outline-none focus:border-[#3B34C4]";
  const label = "mb-1.5 block text-[13px] font-extrabold uppercase tracking-wide text-[#6B6794]";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-3xl border border-[#E4E1FA] bg-white p-6 shadow-sm sm:p-7">
        <div className="space-y-5">
          <div>
            <label className={label} htmlFor="cc-orders">
              Delivery orders per month: {PKR.format(monthlyOrders)}
            </label>
            <input
              id="cc-orders"
              type="range"
              min={50}
              max={5000}
              step={50}
              value={monthlyOrders}
              onChange={(e) => setMonthlyOrders(Number(e.target.value))}
              className="w-full accent-[#2C24A3]"
            />
          </div>
          <div>
            <label className={label} htmlFor="cc-avg">
              Average order value (Rs)
            </label>
            <input
              id="cc-avg"
              type="number"
              min={100}
              step={10}
              value={avgOrder}
              onChange={(e) => setAvgOrder(Number(e.target.value) || 0)}
              className={field}
            />
          </div>
          <div>
            <label className={label} htmlFor="cc-pct">
              Marketplace commission
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 20, 25, 30].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setCommissionPct(pct)}
                  className={`rounded-xl border px-2 py-2.5 text-[15px] font-extrabold transition ${
                    commissionPct === pct
                      ? "border-[#2C24A3] bg-[#2C24A3] text-white"
                      : "border-[#D9D6F5] bg-white text-[#4A4570] hover:border-[#3B34C4]"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
          <p className="rounded-xl bg-[#F7F6FF] px-4 py-3 text-sm font-semibold leading-relaxed text-[#4A4570]">
            Your monthly delivery sales:{" "}
            <span className="font-black text-[#17143A]">
              Rs {PKR.format(monthlySales)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-3xl bg-[#17143A] p-6 text-white sm:p-7">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-white/50">
            You pay the marketplaces
          </p>
          <p className="mt-1.5 text-4xl font-black tracking-tight">
            Rs {PKR.format(monthlyCommission)}
            <span className="text-lg font-bold text-white/60"> /month</span>
          </p>
          <p className="mt-1 text-[15px] font-semibold text-white/60">
            Rs {PKR.format(yearlyCommission)} every year, gone.
          </p>

          <div className="my-6 border-t border-white/10" />

          <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#F59E0B]">
            With Branvelo you pay
          </p>
          <p className="mt-1.5 text-4xl font-black tracking-tight">
            Rs {PKR.format(pricePkr)}
            <span className="text-lg font-bold text-white/60"> /month, flat</span>
          </p>
        </div>
        <p className="mt-6 rounded-2xl bg-[#2C24A3] px-4 py-3.5 text-[15px] font-extrabold leading-relaxed">
          You keep an extra Rs {PKR.format(Math.max(yearlySaving, 0))} every
          year. That is a rider's salary, a new oven, or your second branch.
        </p>
      </div>
    </div>
  );
}
