"use client";

import { SpeedStreaks } from "@/components/platform/Backdrop";
import { useCurrency } from "@/components/platform/currency";

/**
 * Generic sample storefront used in the hero. Deliberately names no real
 * restaurant: the platform site sells the system, not any one tenant.
 * Prices are PKR amounts converted into the visitor's display currency.
 */
const ITEMS = [
  { n: "Zinger Burger", p: 550, tag: "Bestseller" },
  { n: "Loaded Fries", p: 380, tag: "Popular" },
  { n: "Chicken Shawarma", p: 320, tag: "New" },
];

export default function StorefrontMock() {
  const { fromPkr } = useCurrency();
  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      <SpeedStreaks className="left-[-38px] top-[38%] hidden sm:block" width={58} />
      <div className="relative rounded-[28px] border border-[#E7E4FA] bg-white p-4 shadow-2xl shadow-[#2C24A3]/10">
        <div className="flex items-center gap-3 border-b border-[#F0EEFC] pb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F59E0B] text-lg font-black text-white">
            Y
          </div>
          <div>
            <p className="text-[16px] font-black leading-tight">Your Restaurant</p>
            <p className="text-[13px] font-bold text-[#6B6794]">
              Your City - Open now
            </p>
          </div>
          <span className="ml-auto rounded-full bg-[#EFEDFF] px-2.5 py-1 text-[12px] font-black text-[#2C24A3]">
            SAMPLE
          </span>
        </div>
        {ITEMS.map((item) => (
          <div
            key={item.n}
            className="flex items-center justify-between border-b border-[#F7F6FF] py-3 last:border-0"
          >
            <div>
              <p className="text-[15px] font-extrabold">{item.n}</p>
              <p className="text-[12px] font-bold text-[#F59E0B]">{item.tag}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-black">{fromPkr(item.p)}</span>
              <span className="rounded-full bg-[#2C24A3] px-3 py-1 text-[13px] font-extrabold text-white">
                Add
              </span>
            </div>
          </div>
        ))}
        <div className="mt-3 rounded-2xl bg-[#F7F6FF] px-4 py-3 text-center text-[13px] font-bold text-[#4A4570]">
          This could be your menu, under your name
        </div>
      </div>
      <div className="bv-float-slow absolute -right-3 -top-4 rotate-2 rounded-2xl bg-[#17143A] px-4 py-3 text-white shadow-xl sm:-right-6">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#F59E0B]">
          New order
        </p>
        <p className="text-sm font-extrabold">2x Zinger - {fromPkr(1450)}</p>
        <p className="text-[12px] font-bold text-white/60">
          Commission paid: {fromPkr(0)}
        </p>
      </div>
    </div>
  );
}
