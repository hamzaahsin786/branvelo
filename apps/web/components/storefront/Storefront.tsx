"use client";

/**
 * Storefront (v2): renders one restaurant from the Django storefront
 * payload - profile, theme, hours, menu, zones - and takes orders.
 *
 * The theme is data (color, font, layout variant, sections from the
 * tenant profile). The cart lives in this page; checkout posts to the
 * Django ordering API, which recomputes every price server-side.
 */
import { useEffect, useMemo, useState } from "react";
import { slugFromHostname, tenantApiOrigin } from "@/lib/staff-api";
import { PoweredBy } from "./PoweredBy";

interface Theme {
  primary: string;
  accent: string;
  font: string;
  layout: "classic" | "grid" | "minimal";
  sections: { announcement: boolean; featured: boolean; about: boolean };
}
interface ModifierOption {
  id: number;
  name: string;
  price_delta: number;
  available: boolean;
}
interface ModifierGroup {
  id: number;
  name: string;
  required: boolean;
  min_select: number;
  max_select: number;
  options: ModifierOption[];
}
interface Item {
  id: number;
  name: string;
  description: string;
  price: number;
  photo_url: string;
  badges: string[];
  modifier_groups: ModifierGroup[];
}
interface Category {
  id: number;
  name: string;
  tagline: string;
  items: Item[];
}
interface Zone {
  id: number;
  name: string;
  fee_pkr: number;
  min_order_pkr: number;
  free_above_pkr: number | null;
}
interface StorefrontData {
  profile: {
    name: string;
    logo_url: string;
    cover_url: string;
    phone: string;
    address: string;
    city: string;
    announcement: string;
    is_open: boolean;
    theme: Theme;
  };
  hours: { weekday: number; open: string | null; close: string | null; is_closed: boolean }[];
  categories: Category[];
  zones: Zone[];
}

interface CartOption {
  id: number;
  group: string;
  name: string;
  price_delta: number;
}
interface CartLine {
  key: string;
  item_id: number;
  name: string;
  unit_price: number;
  qty: number;
  options: CartOption[];
}

const FONT_STACKS: Record<string, string> = {
  nunito: "'Nunito', ui-rounded, system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
};
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatRs(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

export function Storefront() {
  const [data, setData] = useState<StorefrontData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sheetItem, setSheetItem] = useState<Item | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${tenantApiOrigin()}/api/storefront/`);
        if (res.status === 404) return setState("missing");
        if (!res.ok) throw new Error("bad response");
        setData((await res.json()) as StorefrontData);
        setState("ready");
      } catch {
        setState("error");
      }
    })();
    try {
      const saved = window.localStorage.getItem(`branvelo-cart-${window.location.hostname}`);
      if (saved) setCart(JSON.parse(saved) as CartLine[]);
    } catch { /* fresh cart */ }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `branvelo-cart-${window.location.hostname}`,
        JSON.stringify(cart),
      );
    } catch { /* storage unavailable */ }
  }, [cart]);

  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<number | null>(null);

  const visibleCategories = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.categories;
    return data.categories
      .map((c) => ({
        ...c,
        items: c.items.filter((i) =>
          `${i.name} ${i.description}`.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [data, query]);
  const searchCount = visibleCategories.reduce(
    (n, c) => n + c.items.length,
    0,
  );

  // Scroll-spy: keep the sticky category pill for the section currently
  // in view highlighted.
  useEffect(() => {
    if (state !== "ready" || query) return;
    const sections = document.querySelectorAll<HTMLElement>("[data-cat-id]");
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveCat(Number(e.target.getAttribute("data-cat-id")));
          }
        }
      },
      { rootMargin: "-150px 0px -65% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [state, data, query]);

  const scrollToCat = (id: number) => {
    setActiveCat(id);
    document
      .getElementById(`cat-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const featured = useMemo(() => {
    if (!data) return [];
    return data.categories
      .flatMap((c) => c.items)
      .filter((i) => i.badges.includes("bestseller") || i.badges.includes("popular"));
  }, [data]);

  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const cartSubtotal = cart.reduce((n, l) => n + l.unit_price * l.qty, 0);

  const addLine = (item: Item, options: CartOption[], qty: number) => {
    const key = `${item.id}:${options.map((o) => o.id).sort((a, b) => a - b).join(",")}`;
    const unit = item.price + options.reduce((n, o) => n + o.price_delta, 0);
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { key, item_id: item.id, name: item.name, unit_price: unit, qty, options }];
    });
    setSheetItem(null);
  };

  const startAdd = (item: Item) => {
    if (item.modifier_groups.length > 0) setSheetItem(item);
    else addLine(item, [], 1);
  };

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFF]">
        <p className="text-sm font-semibold text-neutral-400">Loading menu...</p>
      </div>
    );
  }
  if (state === "missing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFF] px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-black text-neutral-800">
            This restaurant is not on Branvelo yet
          </h1>
          <p className="mt-2 text-sm font-semibold text-neutral-500">
            The address {slugFromHostname() ? `${slugFromHostname()}.` : ""}has
            no live storefront. If you run a restaurant, you can claim yours
            in minutes.
          </p>
          <a
            href="/platform"
            className="mt-5 inline-block rounded-full bg-[#2C24A3] px-5 py-2.5 text-sm font-extrabold text-white"
          >
            About Branvelo
          </a>
        </div>
      </div>
    );
  }
  if (state === "error" || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFF] px-4">
        <p className="text-sm font-semibold text-neutral-500">
          The menu could not be loaded. Please try again shortly.
        </p>
      </div>
    );
  }

  const { profile, hours, categories, zones } = data;
  const theme = profile.theme;
  const primary = theme.primary || "#2C24A3";
  const today = (new Date().getDay() + 6) % 7;
  const todayHours = hours.find((h) => h.weekday === today);

  return (
    <div
      className="min-h-screen bg-[#FAFAFF] pb-28 text-neutral-900"
      style={{ fontFamily: FONT_STACKS[theme.font] || FONT_STACKS.nunito }}
    >
      {theme.sections.announcement && profile.announcement && (
        <div className="px-4 py-2 text-center text-[13px] font-bold text-white" style={{ backgroundColor: primary }}>
          {profile.announcement}
        </div>
      )}

      <header className="relative overflow-hidden text-white" style={{ backgroundColor: primary }}>
        {profile.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: profile.cover_url
              ? "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.15) 100%)"
              : `linear-gradient(120deg, ${primary} 0%, color-mix(in srgb, ${primary} 52%, #0B0930) 100%)`,
          }}
        />
        <div className="relative mx-auto flex max-w-4xl items-end gap-3 px-4 pb-5 pt-12">
          {profile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo_url} alt={profile.name} className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-white/50" />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black text-white ring-2 ring-white/40">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 pb-0.5">
            <h1 className="truncate text-2xl font-black drop-shadow-sm">{profile.name}</h1>
            <p className="text-[13px] font-semibold text-white/85">
              {profile.city}
              {todayHours && !todayHours.is_closed
                ? ` - Open today ${todayHours.open}-${todayHours.close}`
                : todayHours
                  ? " - Closed today"
                  : ""}
            </p>
          </div>
          <span className={`mb-1 ml-auto shrink-0 rounded-full px-3 py-1 text-[12px] font-extrabold ${profile.is_open ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
            {profile.is_open ? "Open" : "Closed"}
          </span>
        </div>
      </header>

      <div className="sticky top-0 z-30 border-b border-neutral-100 bg-[#FAFAFF]/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu..."
            className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold outline-none ring-1 ring-neutral-200 placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-300"
          />
          {!query && categories.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCat(cat.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold ${
                    activeCat === cat.id
                      ? "text-white"
                      : "bg-white text-neutral-600 ring-1 ring-neutral-200"
                  }`}
                  style={activeCat === cat.id ? { backgroundColor: primary } : undefined}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
          {query && (
            <p className="mt-1.5 text-[12px] font-semibold text-neutral-400">
              {searchCount} item{searchCount === 1 ? "" : "s"} found
            </p>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4">
        {!profile.is_open && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            This restaurant is not taking orders right now. You can still browse the menu.
          </p>
        )}

        {theme.sections.featured && !query && featured.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-black">Featured</h2>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {featured.map((item) => (
                <div key={item.id} className="w-44 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-100">
                  <PhotoTile item={item} primary={primary} className="h-24 w-full" />
                  <div className="p-3">
                    <p className="truncate text-sm font-extrabold">{item.name}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-[13px] font-bold" style={{ color: primary }}>{formatRs(item.price)}</p>
                      <AddButton primary={primary} disabled={!profile.is_open} onClick={() => startAdd(item)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {categories.length === 0 && (
          <p className="mt-10 text-center text-sm font-semibold text-neutral-400">
            The menu is being prepared. Please check back soon.
          </p>
        )}

        {query && searchCount === 0 && (
          <p className="mt-10 text-center text-sm font-semibold text-neutral-400">
            Nothing on the menu matches "{query}".
          </p>
        )}

        {visibleCategories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} data-cat-id={cat.id} className="mt-8 scroll-mt-36">
            <h2 className="text-base font-black">{cat.name}</h2>
            {cat.tagline && <p className="text-[13px] font-semibold text-neutral-500">{cat.tagline}</p>}
            <div className={theme.layout === "grid" ? "mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3" : "mt-3 flex flex-col gap-3"}>
              {cat.items.map((item) =>
                theme.layout === "grid" ? (
                  <article key={item.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-100">
                    <PhotoTile item={item} primary={primary} className="h-28 w-full" />
                    <div className="p-3">
                      <ItemText item={item} primary={primary} />
                      <div className="mt-2 flex justify-end">
                        <AddButton primary={primary} disabled={!profile.is_open} onClick={() => startAdd(item)} />
                      </div>
                    </div>
                  </article>
                ) : (
                  <article key={item.id} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-neutral-100">
                    {theme.layout === "classic" && (
                      <PhotoTile item={item} primary={primary} className="h-20 w-20 shrink-0 rounded-xl" />
                    )}
                    <div className="min-w-0 flex-1">
                      <ItemText item={item} primary={primary} />
                      <div className="mt-2">
                        <AddButton primary={primary} disabled={!profile.is_open} onClick={() => startAdd(item)} />
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>
        ))}

        {theme.sections.about && (
          <section className="mt-10 rounded-2xl bg-white p-5 ring-1 ring-neutral-100">
            <h2 className="text-base font-black">About {profile.name}</h2>
            {profile.address && (
              <p className="mt-2 text-sm font-semibold text-neutral-600">
                {profile.address}
                {profile.city ? `, ${profile.city}` : ""}
              </p>
            )}
            {profile.phone && <p className="text-sm font-semibold text-neutral-600">Call: {profile.phone}</p>}
            {hours.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                {hours.map((h) => (
                  <p key={h.weekday} className={`text-[13px] font-semibold ${h.weekday === today ? "text-neutral-900" : "text-neutral-500"}`}>
                    {DAY_NAMES[h.weekday]}: {h.is_closed ? "Closed" : `${h.open}-${h.close}`}
                  </p>
                ))}
              </div>
            )}
            {zones.length > 0 && (
              <p className="mt-3 text-[13px] font-semibold text-neutral-500">
                Delivery:{" "}
                {zones
                  .map((z) => `${z.name} (${z.fee_pkr === 0 ? "free" : formatRs(z.fee_pkr)}${z.min_order_pkr ? `, min ${formatRs(z.min_order_pkr)}` : ""})`)
                  .join(" - ")}
              </p>
            )}
          </section>
        )}

        <FeedbackBlock primary={primary} />

        <footer className="mt-10 text-center text-[12px] font-bold text-neutral-400"><PoweredBy className="hover:text-neutral-600 hover:underline" /></footer>
      </main>

      {cartCount > 0 && !checkoutOpen && (
        <button
          onClick={() => setCheckoutOpen(true)}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-full px-5 py-3.5 text-sm font-extrabold text-white shadow-lg"
          style={{ backgroundColor: primary }}
        >
          <span>{cartCount} item{cartCount > 1 ? "s" : ""} in cart</span>
          <span>{formatRs(cartSubtotal)} - Checkout</span>
        </button>
      )}

      {sheetItem && (
        <ModifierSheet
          item={sheetItem}
          primary={primary}
          onClose={() => setSheetItem(null)}
          onAdd={(options, qty) => addLine(sheetItem, options, qty)}
        />
      )}

      {checkoutOpen && (
        <CheckoutPanel
          cart={cart}
          setCart={setCart}
          zones={zones}
          subtotal={cartSubtotal}
          primary={primary}
          restaurantName={profile.name}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </div>
  );
}

/** Item photo, or a branded gradient tile with the item's initial when
 * the restaurant has not added a photo yet - so a menu imported from a
 * sheet or a photo still looks deliberate, never broken. */
function PhotoTile({
  item,
  primary,
  className,
}: {
  item: Item;
  primary: string;
  className: string;
}) {
  if (item.photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.photo_url} alt={item.name} className={`${className} object-cover`} />
    );
  }
  return (
    <div
      className={`${className} flex items-center justify-center`}
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, color-mix(in srgb, ${primary} 50%, #0B0930) 100%)`,
      }}
      aria-hidden
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white">
        {item.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function AddButton({ primary, disabled, onClick }: { primary: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full px-3.5 py-1.5 text-[12px] font-extrabold text-white disabled:opacity-40"
      style={{ backgroundColor: primary }}
    >
      + Add
    </button>
  );
}

function ItemText({ item, primary }: { item: Item; primary: string }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-extrabold">{item.name}</p>
        {item.badges[0] && (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white" style={{ backgroundColor: primary }}>
            {item.badges[0]}
          </span>
        )}
      </div>
      {item.description && <p className="mt-0.5 line-clamp-2 text-[13px] font-medium text-neutral-500">{item.description}</p>}
      <p className="mt-1 text-sm font-black" style={{ color: primary }}>{formatRs(item.price)}</p>
      {item.modifier_groups.length > 0 && (
        <p className="mt-0.5 text-[12px] font-semibold text-neutral-400">{item.modifier_groups.map((g) => g.name).join(" - ")} available</p>
      )}
    </>
  );
}

function ModifierSheet({
  item,
  primary,
  onClose,
  onAdd,
}: {
  item: Item;
  primary: string;
  onClose: () => void;
  onAdd: (options: CartOption[], qty: number) => void;
}) {
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [qty, setQty] = useState(1);

  const toggle = (group: ModifierGroup, option: ModifierOption) => {
    setSelected((prev) => {
      const current = prev[group.id] || [];
      if (current.includes(option.id)) {
        return { ...prev, [group.id]: current.filter((id) => id !== option.id) };
      }
      if (group.max_select === 1) return { ...prev, [group.id]: [option.id] };
      if (current.length >= group.max_select) return prev;
      return { ...prev, [group.id]: [...current, option.id] };
    });
  };

  const chosen: CartOption[] = item.modifier_groups.flatMap((g) =>
    (selected[g.id] || [])
      .map((id) => g.options.find((o) => o.id === id))
      .filter((o): o is ModifierOption => !!o)
      .map((o) => ({ id: o.id, group: g.name, name: o.name, price_delta: o.price_delta })),
  );
  const valid = item.modifier_groups.every((g) => {
    const n = (selected[g.id] || []).length;
    const minimum = Math.max(g.min_select, g.required ? 1 : 0);
    return n >= minimum && n <= g.max_select;
  });
  const unit = item.price + chosen.reduce((n, o) => n + o.price_delta, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-black">{item.name}</h3>
            <p className="text-sm font-bold" style={{ color: primary }}>{formatRs(item.price)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-bold"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="block"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></button>
        </div>
        {item.modifier_groups.map((group) => (
          <div key={group.id} className="mt-4">
            <p className="text-sm font-extrabold">
              {group.name}
              {group.required && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-extrabold text-red-600">Required</span>}
              <span className="ml-2 text-[12px] font-semibold text-neutral-400">
                {group.max_select === 1 ? "Choose 1" : `Choose up to ${group.max_select}`}
              </span>
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {group.options.filter((o) => o.available).map((option) => {
                const active = (selected[group.id] || []).includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => toggle(group, option)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold ring-1 ${active ? "text-white" : "bg-white text-neutral-700 ring-neutral-200"}`}
                    style={active ? { backgroundColor: primary, borderColor: primary } : undefined}
                  >
                    <span>{option.name}</span>
                    <span>{option.price_delta > 0 ? `+ ${formatRs(option.price_delta)}` : "Free"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full ring-1 ring-neutral-200">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 font-black">-</button>
            <span className="min-w-5 text-center text-sm font-extrabold">{qty}</span>
            <button onClick={() => setQty(Math.min(50, qty + 1))} className="px-3 py-2 font-black">+</button>
          </div>
          <button
            disabled={!valid}
            onClick={() => onAdd(chosen, qty)}
            className="flex-1 rounded-full py-3 text-sm font-extrabold text-white disabled:opacity-40"
            style={{ backgroundColor: primary }}
          >
            Add - {formatRs(unit * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PlacedOrder {
  id: string;
  order_no: number;
  total_pkr: number;
}

function FeedbackBlock({ primary }: { primary: string }) {
  const [type, setType] = useState("suggestion");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${tenantApiOrigin()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim() }),
      });
      if (res.ok) setSent(true);
    } catch { /* leave the form open on failure */ }
    setBusy(false);
  };

  return (
    <section className="mt-10 rounded-2xl bg-white p-5 ring-1 ring-neutral-100">
      <h2 className="text-base font-black">Tell us what you think</h2>
      {sent ? (
        <p className="mt-2 text-sm font-bold text-green-700">
          Thank you - your feedback was sent to the restaurant.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex gap-2">
            {[
              { v: "praise", label: "Praise" },
              { v: "suggestion", label: "Suggestion" },
              { v: "complaint", label: "Complaint" },
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => setType(t.v)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ring-1 ${type === t.v ? "text-white" : "bg-white text-neutral-600 ring-neutral-200"}`}
                style={type === t.v ? { backgroundColor: primary } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Your message for the restaurant..."
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none"
          />
          <button
            onClick={submit}
            disabled={busy || !message.trim()}
            className="self-start rounded-full px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
            style={{ backgroundColor: primary }}
          >
            {busy ? "Sending..." : "Send feedback"}
          </button>
        </div>
      )}
    </section>
  );
}

function CheckoutPanel({
  cart,
  setCart,
  zones,
  subtotal,
  primary,
  restaurantName,
  onClose,
}: {
  cart: CartLine[];
  setCart: (lines: CartLine[]) => void;
  zones: Zone[];
  subtotal: number;
  primary: string;
  restaurantName: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<"delivery" | "pickup">(zones.length > 0 ? "delivery" : "pickup");
  const [zoneId, setZoneId] = useState<number | "">(zones[0]?.id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [coupon, setCoupon] = useState("");
  const [payment, setPayment] = useState("cod");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const zone = zones.find((z) => z.id === zoneId);
  const deliveryFee =
    type === "pickup" || !zone
      ? 0
      : zone.free_above_pkr !== null && subtotal >= zone.free_above_pkr
        ? 0
        : zone.fee_pkr;
  const belowMin = type === "delivery" && zone !== undefined && subtotal < zone.min_order_pkr;

  const setQty = (key: string, qty: number) => {
    setCart(
      qty <= 0
        ? cart.filter((l) => l.key !== key)
        : cart.map((l) => (l.key === key ? { ...l, qty } : l)),
    );
  };

  const place = async () => {
    setError(null);
    if (cart.length === 0) return setError("Your cart is empty.");
    if (!name.trim()) return setError("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Please enter a valid phone number.");
    if (type === "delivery" && !zone) return setError("Please choose a delivery zone.");
    if (type === "delivery" && !address.trim()) return setError("Please enter your delivery address.");
    setBusy(true);
    try {
      const res = await fetch(`${tenantApiOrigin()}/api/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_address: type === "delivery" ? address.trim() : "",
          type,
          zone_id: type === "delivery" ? zoneId : null,
          items: cart.map((l) => ({
            item_id: l.item_id,
            qty: l.qty,
            modifier_option_ids: l.options.map((o) => o.id),
          })),
          coupon_code: coupon.trim(),
          payment_method: payment,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.detail || "The order could not be placed. Please try again.");
        return;
      }
      setPlaced({ id: body.id, order_no: body.order_no, total_pkr: body.total_pkr });
      setCart([]);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {placed ? (
          <div className="py-4 text-center">
            <p className="flex justify-center text-emerald-600">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 12.5l5 5L20 6.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
            <h3 className="mt-2 text-lg font-black">Order placed</h3>
            <p className="mt-1 text-sm font-semibold text-neutral-500">
              {restaurantName} received your order <strong>#{placed.order_no}</strong>.
              Total: <strong>{formatRs(placed.total_pkr)}</strong>
              {payment === "cod" ? " - please keep cash ready." : "."}
            </p>
            <a
              href={`/track/${placed.id}`}
              className="mt-5 inline-block rounded-full px-6 py-3 text-sm font-extrabold text-white"
              style={{ backgroundColor: primary }}
            >
              Track your order live
            </a>
            <button onClick={onClose} className="mt-3 block w-full text-sm font-bold text-neutral-500">
              Back to menu
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black">Your order</h3>
              <button onClick={onClose} aria-label="Close" className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-bold"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="block"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></button>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {cart.map((line) => (
                <div key={line.key} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold">{line.name}</p>
                    {line.options.length > 0 && (
                      <p className="truncate text-[12px] font-semibold text-neutral-400">
                        {line.options.map((o) => o.name).join(", ")}
                      </p>
                    )}
                    <p className="text-[13px] font-bold" style={{ color: primary }}>{formatRs(line.unit_price * line.qty)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setQty(line.key, line.qty - 1)} className="h-7 w-7 rounded-full bg-white font-black ring-1 ring-neutral-200">-</button>
                    <span className="min-w-5 text-center text-sm font-extrabold">{line.qty}</span>
                    <button onClick={() => setQty(line.key, line.qty + 1)} className="h-7 w-7 rounded-full bg-white font-black ring-1 ring-neutral-200">+</button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="py-4 text-center text-sm font-semibold text-neutral-400">Your cart is empty.</p>}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["delivery", "pickup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-full py-2.5 text-sm font-extrabold capitalize ring-1 ${type === t ? "text-white" : "bg-white text-neutral-600 ring-neutral-200"}`}
                  style={type === t ? { backgroundColor: primary } : undefined}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              {type === "delivery" && (
                <>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold outline-none"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} - delivery {z.fee_pkr === 0 ? "free" : formatRs(z.fee_pkr)}
                        {z.free_above_pkr ? ` (free above ${formatRs(z.free_above_pkr)})` : ""}
                      </option>
                    ))}
                  </select>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address (house, street, block)" className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none" />
                </>
              )}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (03xx xxxxxxx)" inputMode="tel" className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none" />
              <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code (optional)" className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm uppercase outline-none" />
              <select value={payment} onChange={(e) => setPayment(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold outline-none">
                <option value="cod">Cash on delivery</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
              </select>
            </div>

            <div className="mt-4 space-y-1 text-sm font-semibold text-neutral-600">
              <p className="flex justify-between"><span>Subtotal</span><span>{formatRs(subtotal)}</span></p>
              {type === "delivery" && (
                <p className="flex justify-between"><span>Delivery</span><span>{deliveryFee === 0 ? "Free" : formatRs(deliveryFee)}</span></p>
              )}
              {coupon.trim() && <p className="text-[12px] font-semibold text-neutral-400">Coupon discount is applied by the restaurant system at confirmation.</p>}
              <p className="flex justify-between border-t border-neutral-100 pt-2 text-base font-black text-neutral-900">
                <span>Total</span><span>{formatRs(subtotal + deliveryFee)}</span>
              </p>
              {belowMin && zone && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] font-bold text-red-700">
                  Minimum order for {zone.name} is {formatRs(zone.min_order_pkr)}.
                </p>
              )}
            </div>

            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700">{error}</p>}
            <button
              onClick={place}
              disabled={busy || cart.length === 0}
              className="mt-4 w-full rounded-full py-3.5 text-sm font-extrabold text-white disabled:opacity-40"
              style={{ backgroundColor: primary }}
            >
              {busy ? "Placing order..." : `Place order - ${formatRs(subtotal + deliveryFee)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
