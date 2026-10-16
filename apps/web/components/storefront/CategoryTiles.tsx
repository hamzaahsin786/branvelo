"use client";

import type { Category } from "@mezban/shared";

interface Props {
  categories: Category[];
  onSelect: (id: string) => void;
}

/** Horizontal scrollable category tiles (Kababjees-style illustrated row). */
export function CategoryTiles({ categories, onSelect }: Props) {
  return (
    <section className="mt-6 px-3">
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="flex w-20 shrink-0 flex-col items-center gap-1.5"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)] text-2xl font-extrabold text-[var(--brand)]">
              {c.icon || c.name.charAt(0).toUpperCase()}
            </span>
            <span className="text-center text-[11px] font-bold leading-tight text-[var(--brand)]">
              {c.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
