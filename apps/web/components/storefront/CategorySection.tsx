"use client";

import type { Category, MenuItem } from "@branvelo/shared";
import { ProductCard } from "./ProductCard";

interface Props {
  category: Category;
  items: MenuItem[];
  onAdd: (item: MenuItem) => void;
}

/** Category section: illustrated banner + rhyming tagline + card grid. */
export function CategorySection({ category, items, onAdd }: Props) {
  if (items.length === 0) return null;
  return (
    <section
      id={`cat-${category.id}`}
      data-cat-section={category.id}
      className="scroll-mt-36 px-3 pt-6"
    >
      <div
        className="rounded-2xl px-5 py-5 text-white"
        style={{
          background:
            "linear-gradient(120deg, var(--brand) 0%, var(--brand-dark) 100%)",
        }}
      >
        <h2 className="text-xl font-extrabold uppercase tracking-wide">
          {category.name}
        </h2>
        {category.tagline && (
          <p className="mt-1 text-sm text-white/85">{category.tagline}</p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <ProductCard key={item.id} item={item} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}
