"use client";

import type { MenuItem } from "@mezban/shared";
import { formatRs } from "@mezban/shared";
import { PlusIcon } from "./icons";

interface Props {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

function BadgePill({ badge }: { badge: string }) {
  const styles: Record<string, string> = {
    bestseller: "bg-[var(--accent)] text-black",
    popular: "bg-yellow-300 text-black",
    new: "bg-green-600 text-white",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow ${styles[badge] ?? "bg-neutral-800 text-white"}`}
    >
      {badge}
    </span>
  );
}

/** Product card: photo, badges, name, description, price + add button. */
export function ProductCard({ item, onAdd }: Props) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border-2 border-[var(--brand)]/20 bg-white">
      <div className="relative aspect-[4/3] bg-[var(--muted)]">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photo_url}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-4xl font-extrabold text-[var(--brand)]/30">
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {item.badges.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {item.badges.map((b) => (
              <BadgePill key={b} badge={b} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-extrabold uppercase leading-snug">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
            {item.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-sm font-extrabold text-neutral-700">
            {formatRs(item.price)}
          </span>
          <button
            onClick={() => onAdd(item)}
            aria-label={`Add ${item.name} to cart`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow transition active:scale-90"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
