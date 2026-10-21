"use client";

import type { MenuItem } from "@branvelo/shared";
import { ProductCard } from "./ProductCard";

interface Props {
  items: MenuItem[];
  onAdd: (item: MenuItem) => void;
}

/** "Popular items" - horizontal snap row of badge-flagged items. */
export function PopularItems({ items, onAdd }: Props) {
  const popular = items.filter(
    (i) => i.badges.includes("popular") || i.badges.includes("bestseller")
  );
  if (popular.length === 0) return null;
  return (
    <section className="pt-6">
      <div className="px-3">
        <h2 className="text-xl font-extrabold">
          <span className="text-[var(--ink)]">POPULAR</span>{" "}
          <span className="text-[var(--brand)]">ITEMS</span>
        </h2>
        <p className="text-xs text-neutral-500">Most ordered right now</p>
      </div>
      <div className="no-scrollbar mt-3 flex snap-x gap-3 overflow-x-auto px-3">
        {popular.map((item) => (
          <div key={item.id} className="w-44 shrink-0 snap-start sm:w-52">
            <ProductCard item={item} onAdd={onAdd} />
          </div>
        ))}
      </div>
    </section>
  );
}
