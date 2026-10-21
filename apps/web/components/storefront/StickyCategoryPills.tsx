"use client";

import type { Category } from "@branvelo/shared";

interface Props {
  categories: Category[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Sticky scrollspy pills - the menu's tab navigation. */
export function StickyCategoryPills({ categories, activeId, onSelect }: Props) {
  return (
    <div className="sticky top-[74px] z-30 -mx-3 bg-white/95 px-3 py-2 backdrop-blur">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {categories.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${
                active
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                  : "border-[var(--brand)] bg-white text-[var(--brand)]"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
