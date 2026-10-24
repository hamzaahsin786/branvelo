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
import { CartPanel } from "./CartPanel";

interface Theme {
  primary: string;
  accent: string;
  font: string;
  layout: "classic" | "grid" | "minimal";
  cat_nav?: string;
  sections: {
    announcement: boolean;
    featured: boolean;
    deals?: boolean;
    about: boolean;
    whatsapp?: boolean;
    location_gate?: boolean;
  };
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
  compare_at: number | null;
  photo_url: string;
  badges: string[];
  modifier_groups: ModifierGroup[];
}
interface Deal {
  id: number;
  title: string;
  description: string;
  contents: string;
  price_pkr: number;
  compare_at_pkr: number | null;
  photo_url: string;
  is_active: boolean;
  sort: number;
}
interface Category {
  id: number;
  name: string;
  tagline: string;
  banner_url: string;
  items: Item[];
}
interface Zone {
  id: number;
  name: string;
  areas: string[];
  fee_pkr: number;
  min_order_pkr: number;
  free_above_pkr: number | null;
  eta_minutes: number;
}
interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  sort: number;
  is_active: boolean;
}
interface TaxRule {
  country: string;
  name: string;
  standard_rate: number;
  digital_rate: number | null;
  on_delivery: boolean;
}
interface PopularItem {
  id: number;
  name: string;
  price_pkr: number;
  photo_url: string;
  ordered_qty: number;
}

/** What the location gate captured: how the customer wants their food,
 * and (for delivery) which zone/area they are in. Persisted per host. */
interface GateSelection {
  type: "delivery" | "pickup";
  zone_id: number | null;
  area: string;
  branch_id?: number | null;
}
interface StorefrontData {
  profile: {
    name: string;
    logo_url: string;
    cover_url: string;
    cover_photos: string[];
    phone: string;
    address: string;
    city: string;
    announcement: string;
    is_open: boolean;
    theme: Theme;
    seo_text: string;
    tax: TaxRule;
  };
  hours: { weekday: number; open: string | null; close: string | null; is_closed: boolean }[];
  categories: Category[];
  deals: Deal[];
  zones: Zone[];
  branches: Branch[];
  popular_items: PopularItem[];
  bought_together: Record<string, { id: number; count: number }[]>;
}

interface CartOption {
  id: number;
  group: string;
  name: string;
  price_delta: number;
}
export interface CartLine {
  key: string;
  item_id: number;
  deal_id: number | null;
  name: string;
  unit_price: number;
  qty: number;
  options: CartOption[];
  note: string;
}

const FONT_STACKS: Record<string, string> = {
  nunito: "'Nunito', ui-rounded, system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  playfair: "'Playfair Display', Georgia, serif",
};
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatRs(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

/** Whole-percent discount when a compare-at ("was") price beats the price. */
function offPct(item: Item): number {
  if (item.compare_at && item.compare_at > item.price) {
    return Math.round((1 - item.price / item.compare_at) * 100);
  }
  return 0;
}

/** wa.me link for a locally formatted phone number (03xx -> 923xx). */
function waLink(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

/** The tax rate for a payment method under the restaurant's rule:
 * Pakistan charges a lower rate on digital payments (cards, wallets,
 * QR) than on cash; everywhere else one rate applies. */
export function taxRateFor(tax: TaxRule, payment: string): number {
  if (
    (payment === "jazzcash" || payment === "easypaisa" || payment === "card") &&
    tax.digital_rate !== null &&
    tax.digital_rate !== undefined
  ) {
    return tax.digital_rate;
  }
  return tax.standard_rate;
}

/** Whole-rupee tax on an amount at a percentage rate. */
export function calcTax(amount: number, rate: number): number {
  if (!rate) return 0;
  return Math.round((amount * rate) / 100);
}

/** Next opening time as a short label ("Today 5:00 PM", "Tue 11:00 AM"),
 * or null when the restaurant has no usable hours. weekday: 0 = Monday. */
export function nextOpeningLabel(
  hours: { weekday: number; open: string | null; close: string | null; is_closed: boolean }[],
): string | null {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;
  const fmt = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
  };
  for (let offset = 0; offset < 7; offset++) {
    const idx = (todayIdx + offset) % 7;
    const row = hours.find((h) => h.weekday === idx);
    if (!row || row.is_closed || !row.open) continue;
    if (offset === 0) {
      const [h, m] = row.open.split(":").map(Number);
      const openAt = new Date();
      openAt.setHours(h, m, 0, 0);
      if (openAt > now) return `Today ${fmt(row.open)}`;
      continue;
    }
    return `${DAY_NAMES[idx]} ${fmt(row.open)}`;
  }
  return null;
}

export function Storefront() {
  const [data, setData] = useState<StorefrontData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sheetItem, setSheetItem] = useState<Item | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

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
    try {
      const gate = window.localStorage.getItem(`branvelo-gate-${window.location.hostname}`);
      if (gate) setGateSel(JSON.parse(gate) as GateSelection);
    } catch { /* no saved selection */ }
    setGateLoaded(true);
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
  const [showTop, setShowTop] = useState(false);
  const [gateSel, setGateSel] = useState<GateSelection | null>(null);
  const [gateLoaded, setGateLoaded] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  // The location gate: ask once per customer (the choice persists on
  // this device) - skipping only dismisses it for this session.
  useEffect(() => {
    if (!gateLoaded || state !== "ready" || !data || gateSel) return;
    if (data.profile.theme.sections.location_gate === false) return;
    try {
      if (window.sessionStorage.getItem("branvelo-gate-skip")) return;
    } catch { /* storage unavailable */ }
    setGateOpen(true);
  }, [gateLoaded, state, data, gateSel]);

  const saveGate = (sel: GateSelection) => {
    setGateSel(sel);
    setGateOpen(false);
    try {
      window.localStorage.setItem(
        `branvelo-gate-${window.location.hostname}`,
        JSON.stringify(sel),
      );
    } catch { /* storage unavailable */ }
  };

  const skipGate = () => {
    setGateOpen(false);
    try {
      window.sessionStorage.setItem("branvelo-gate-skip", "1");
    } catch { /* storage unavailable */ }
  };

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The search placeholder cycles through real dish names, the way the
  // indolj storefronts do - it advertises the menu while you browse.
  const dishNames = useMemo(
    () =>
      (data?.categories ?? [])
        .flatMap((c) => c.items.map((i) => i.name))
        .slice(0, 8),
    [data],
  );
  const [dishIdx, setDishIdx] = useState(0);
  useEffect(() => {
    if (dishNames.length < 2) return;
    const t = setInterval(
      () => setDishIdx((i) => (i + 1) % dishNames.length),
      2600,
    );
    return () => clearInterval(t);
  }, [dishNames]);
  const searchPlaceholder = dishNames.length
    ? `Search "${dishNames[dishIdx]}"...`
    : "Search the menu...";

  // Cover carousel: rotate the banner slides every few seconds; a
  // single photo stays static and shows no controls.
  const [slideIdx, setSlideIdx] = useState(0);
  const [slidePaused, setSlidePaused] = useState(false);
  const slideCount = useMemo(() => {
    if (!data) return 0;
    const list = data.profile.cover_photos ?? [];
    return list.length > 0 ? list.length : data.profile.cover_url ? 1 : 0;
  }, [data]);
  useEffect(() => {
    if (slideCount < 2 || slidePaused) return;
    const t = setInterval(
      () => setSlideIdx((i) => (i + 1) % slideCount),
      5200,
    );
    return () => clearInterval(t);
  }, [slideCount, slidePaused]);

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

  const addLine = (item: Item, options: CartOption[], qty: number, note = "") => {
    const cleanNote = note.trim().slice(0, 200);
    const key = `${item.id}:${options.map((o) => o.id).sort((a, b) => a - b).join(",")}:${cleanNote}`;
    const unit = item.price + options.reduce((n, o) => n + o.price_delta, 0);
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { key, item_id: item.id, deal_id: null, name: item.name, unit_price: unit, qty, options, note: cleanNote }];
    });
    setSheetItem(null);
  };

  const addDeal = (deal: Deal) => {
    const key = `deal:${deal.id}`;
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          item_id: 0,
          deal_id: deal.id,
          name: deal.title,
          unit_price: deal.price_pkr,
          qty: 1,
          options: [],
          note: "",
        },
      ];
    });
  };

  /** The plain (no modifiers, no note) cart line for an item, if one
   * exists - used to render a qty stepper on the card instead of Add. */
  const plainLineFor = (itemId: number) =>
    cart.find(
      (l) => l.item_id === itemId && l.deal_id === null && l.options.length === 0 && !l.note,
    );

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );
  };

  /** Copy a shareable link for an item (opens the item sheet on load). */
  const shareItem = async (itemId: number) => {
    const url = `${window.location.origin}${window.location.pathname}?item=${itemId}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied - send it to anyone.");
    } catch {
      setShareMsg(url);
    }
    window.setTimeout(() => setShareMsg(null), 4000);
  };

  // Deep link: ?item=<id> opens that item's sheet once the menu loads.
  useEffect(() => {
    if (state !== "ready" || !data) return;
    const id = Number(new URLSearchParams(window.location.search).get("item"));
    if (!id) return;
    const found = data.categories.flatMap((c) => c.items).find((i) => i.id === id);
    if (found) setSheetItem(found);
  }, [state, data]);

  const startAdd = (item: Item) => {
    if (item.modifier_groups.length > 0) setSheetItem(item);
    else addLine(item, [], 1);
  };

  if (state === "loading") {
    // Skeleton that mirrors the real layout (banner, rail, cards) so the
    // page settles into place instead of jumping - an indolj polish cue.
    return (
      <div className="min-h-screen bg-[#FAFAFF]" aria-hidden>
        <div className="h-16 bg-neutral-200/70" />
        <div className="mx-auto max-w-4xl px-4">
          <div className="mt-4 h-56 animate-pulse rounded-[28px] bg-neutral-200 sm:h-72" />
          <div className="mt-5 flex gap-2 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-neutral-200" />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="overflow-hidden rounded-[20px] bg-white ring-1 ring-neutral-100">
                <div className="aspect-[4/3] animate-pulse bg-neutral-200" />
                <div className="space-y-2 p-3.5">
                  <div className="h-3.5 animate-pulse rounded bg-neutral-200" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200" />
                  <div className="h-8 animate-pulse rounded-full bg-neutral-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
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
  const slides =
    profile.cover_photos && profile.cover_photos.length > 0
      ? profile.cover_photos
      : profile.cover_url
        ? [profile.cover_url]
        : [];
  const activeSlide = slides.length ? slideIdx % slides.length : 0;
  const deals = data.deals ?? [];
  const today = (new Date().getDay() + 6) % 7;
  const todayHours = hours.find((h) => h.weekday === today);

  return (
    <div
      className="min-h-screen bg-[#FAFAFF] pb-28 text-neutral-900"
      style={{ fontFamily: FONT_STACKS[theme.font] || FONT_STACKS.nunito }}
    >
      {theme.sections.announcement && profile.announcement && (
        <div className="px-4 py-2 text-center text-[13px] font-extrabold text-neutral-900" style={{ backgroundColor: theme.accent || "#F59E0B" }}>
          {profile.announcement}
        </div>
      )}

      <header className="text-white" style={{ backgroundColor: primary }}>
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          {profile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo_url} alt={profile.name} className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/40" />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-black text-white ring-2 ring-white/40">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-black leading-tight">{profile.name}</p>
            {profile.city && (
              <p className="truncate text-[12px] font-semibold text-white/75">{profile.city}</p>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              onClick={() => setGateOpen(true)}
              className="flex max-w-[150px] items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-extrabold text-white"
              title="Change order type or delivery area"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
              </svg>
              <span className="truncate">
                {gateSel
                  ? gateSel.type === "pickup"
                    ? "Pick-Up"
                    : gateSel.area ||
                      zones.find((z) => z.id === gateSel.zone_id)?.name ||
                      "Delivery"
                  : "Select area"}
              </span>
            </button>
            {profile.phone && (
              <a
                href={`tel:${profile.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12px] font-extrabold text-white"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.4 11.4 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
                </svg>
                <span className="hidden min-[430px]:inline">{profile.phone}</span>
              </a>
            )}
            <span className={`flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] font-extrabold ${profile.is_open ? "text-green-700" : "text-red-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${profile.is_open ? "bg-green-500" : "bg-red-500"}`} />
              {profile.is_open ? "Open" : "Closed"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4">
        <div
          className="relative mt-4 h-56 overflow-hidden rounded-[28px] sm:h-72"
          style={{ backgroundColor: primary }}
          onMouseEnter={() => setSlidePaused(true)}
          onMouseLeave={() => setSlidePaused(false)}
        >
          {slides.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${src}-${i}`}
              src={src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
              style={{ opacity: i === activeSlide ? 1 : 0 }}
            />
          ))}
          <div
            className="absolute inset-0"
            style={{
              background: slides.length
                ? "linear-gradient(to top, rgba(0,0,0,0.74) 0%, rgba(0,0,0,0.28) 55%, rgba(0,0,0,0.12) 100%)"
                : `linear-gradient(120deg, ${primary} 0%, color-mix(in srgb, ${primary} 52%, #0B0930) 100%)`,
            }}
          />
          {slides.length > 1 && (
            <>
              <div className="absolute right-4 top-4 z-10 flex gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    aria-label={`Cover photo ${i + 1}`}
                    onClick={() => setSlideIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activeSlide ? "w-6 bg-white" : "w-2.5 bg-white/45"}`}
                  />
                ))}
              </div>
              <button
                aria-label="Previous cover photo"
                onClick={() => setSlideIdx((activeSlide - 1 + slides.length) % slides.length)}
                className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4" aria-hidden>
                  <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                aria-label="Next cover photo"
                onClick={() => setSlideIdx((activeSlide + 1) % slides.length)}
                className="absolute right-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4" aria-hidden>
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 p-5">
            <h1 className="text-3xl font-black text-white drop-shadow-sm sm:text-4xl">{profile.name}</h1>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {todayHours && (
                <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
                  {todayHours.is_closed
                    ? "Closed today"
                    : `Open today ${todayHours.open} - ${todayHours.close}`}
                </span>
              )}
              {!profile.is_open && nextOpeningLabel(hours) && (
                <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
                  Opens {nextOpeningLabel(hours)}
                </span>
              )}
              {zones.length > 0 && (
                <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
                  {Math.min(...zones.map((z) => z.fee_pkr)) === 0
                    ? "Free delivery"
                    : `Delivery from ${formatRs(Math.min(...zones.map((z) => z.fee_pkr)))}`}
                </span>
              )}
              {zones.some((z) => z.free_above_pkr) && (
                <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
                  Free delivery over {formatRs(Math.min(...zones.filter((z) => z.free_above_pkr).map((z) => z.free_above_pkr as number)))}
                </span>
              )}
              {profile.city && (
                <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] font-bold text-white backdrop-blur-sm">
                  {profile.city}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-30 mt-4 border-b border-neutral-100 bg-[#FAFAFF]/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-2.5">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-full bg-white py-2.5 pl-11 pr-4 text-sm font-semibold shadow-sm outline-none ring-1 ring-neutral-200 placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-300"
            />
          </div>
          {!query && categories.length > 1 && theme.cat_nav === "tiles" && (
            <div className="mt-2.5 flex gap-3 overflow-x-auto pb-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCat(cat.id)}
                  className="w-[74px] shrink-0 text-center"
                >
                  <span
                    className="block h-14 w-full overflow-hidden rounded-2xl ring-1 ring-neutral-200"
                    style={activeCat === cat.id ? { boxShadow: `0 0 0 3px ${primary}` } : undefined}
                  >
                    {cat.banner_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.banner_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span
                        className="flex h-full w-full items-center justify-center text-lg font-black text-white"
                        style={{ background: `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 50%, #0B0930))` }}
                      >
                        {cat.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span
                    className={`mt-1 block truncate text-[11px] ${
                      activeCat === cat.id ? "font-extrabold" : "font-bold text-neutral-500"
                    }`}
                    style={activeCat === cat.id ? { color: primary } : undefined}
                  >
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          )}
          {!query && categories.length > 1 && theme.cat_nav !== "tiles" && (
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

        {theme.sections.deals !== false && !query && deals.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-black">Deals</h2>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {deals.map((deal) => {
                const saving =
                  deal.compare_at_pkr && deal.compare_at_pkr > deal.price_pkr
                    ? Math.round(
                        (1 - deal.price_pkr / deal.compare_at_pkr) * 100,
                      )
                    : 0;
                const contents = (deal.contents || "")
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean);
                return (
                  <div key={deal.id} className="flex w-64 shrink-0 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
                    <div className="relative">
                      {deal.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={deal.photo_url} alt="" className="aspect-[16/10] w-full object-cover" />
                      ) : (
                        <div
                          className="flex aspect-[16/10] w-full items-center justify-center text-4xl font-black text-white"
                          style={{
                            background: `linear-gradient(120deg, ${primary} 0%, color-mix(in srgb, ${primary} 52%, #0B0930) 100%)`,
                          }}
                        >
                          {deal.title.charAt(0)}
                        </div>
                      )}
                      {saving > 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-black text-white">
                          SAVE {saving}%
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3.5">
                      <p className="text-sm font-extrabold">{deal.title}</p>
                      {deal.description && (
                        <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold text-neutral-500">
                          {deal.description}
                        </p>
                      )}
                      {contents.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {contents.slice(0, 4).map((line, i) => (
                            <li key={i} className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500">
                              <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: primary }} />
                              {line}
                            </li>
                          ))}
                          {contents.length > 4 && (
                            <li className="text-[12px] font-semibold text-neutral-400">
                              + {contents.length - 4} more
                            </li>
                          )}
                        </ul>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <p className="flex items-baseline gap-1.5">
                          <span className="text-[15px] font-black" style={{ color: primary }}>
                            {formatRs(deal.price_pkr)}
                          </span>
                          {deal.compare_at_pkr != null && deal.compare_at_pkr > deal.price_pkr && (
                            <span className="text-[12px] font-bold text-neutral-400 line-through">
                              {formatRs(deal.compare_at_pkr)}
                            </span>
                          )}
                        </p>
                        <AddButton primary={primary} disabled={!profile.is_open} onClick={() => addDeal(deal)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!query && (data.popular_items ?? []).length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-black">Most ordered right now</h2>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {(data.popular_items ?? []).map((pop) => {
                const found = categories.flatMap((c) => c.items).find((i) => i.id === pop.id);
                if (!found) return null;
                return (
                  <div key={pop.id} className="w-52 shrink-0 overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
                    <div className="relative">
                      <PhotoTile item={found} primary={primary} className="aspect-[16/10] w-full" />
                      <CardChips item={found} primary={primary} />
                    </div>
                    <div className="p-3.5">
                      <p className="truncate text-sm font-extrabold">{found.name}</p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <PriceLine item={found} primary={primary} />
                        <AddButton primary={primary} disabled={!profile.is_open} onClick={() => startAdd(found)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {theme.sections.featured && !query && featured.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-black">Featured</h2>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {featured.map((item) => (
                <div key={item.id} className="w-52 shrink-0 overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
                  <div className="relative">
                    <PhotoTile item={item} primary={primary} className="aspect-[16/10] w-full" />
                    <CardChips item={item} primary={primary} />
                  </div>
                  <div className="p-3.5">
                    <p className="truncate text-sm font-extrabold">{item.name}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <PriceLine item={item} primary={primary} />
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
          <section key={cat.id} id={`cat-${cat.id}`} data-cat-id={cat.id} className={`mt-10 ${theme.cat_nav === "tiles" ? "scroll-mt-52" : "scroll-mt-36"}`}>
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-black">{cat.name}</h2>
                {cat.tagline && <p className="text-[13px] font-semibold text-neutral-500">{cat.tagline}</p>}
              </div>
              <span className="shrink-0 text-[12px] font-bold text-neutral-400">
                {cat.items.length} item{cat.items.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className={theme.layout === "grid" ? "mt-3.5 grid grid-cols-2 gap-3.5 sm:grid-cols-3" : "mt-3 flex flex-col gap-3"}>
              {cat.items.map((item) =>
                theme.layout === "grid" ? (
                  <article key={item.id} className="flex flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
                    <div className="relative">
                      <PhotoTile item={item} primary={primary} className="aspect-[4/3] w-full" />
                      <CardChips item={item} primary={primary} />
                    </div>
                    <div className="flex flex-1 flex-col p-3.5">
                      <p className="text-[15px] font-extrabold leading-snug">{item.name}</p>
                      {item.description ? (
                        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-snug text-neutral-500">{item.description}</p>
                      ) : (
                        <div className="min-h-[2.5rem]" />
                      )}
                      {item.modifier_groups.length > 0 && (
                        <p className="mt-1 text-[12px] font-semibold text-neutral-400">{item.modifier_groups.map((g) => g.name).join(" - ")} available</p>
                      )}
                      <div className="mt-auto pt-2.5">
                        <PriceLine item={item} primary={primary} />
                        <div className="mt-2.5 flex items-center gap-2">
                          {(() => {
                            const plain = plainLineFor(item.id);
                            if (plain) {
                              return (
                                <div className="flex flex-1 items-center justify-between rounded-full py-1 pl-2 pr-1 ring-1 ring-neutral-200">
                                  <button onClick={() => changeQty(plain.key, -1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 font-black">-</button>
                                  <span className="text-[13px] font-extrabold">{plain.qty} in cart</span>
                                  <button onClick={() => changeQty(plain.key, 1)} className="flex h-7 w-7 items-center justify-center rounded-full font-black text-white" style={{ backgroundColor: primary }}>+</button>
                                </div>
                              );
                            }
                            return (
                              <button
                                onClick={() => startAdd(item)}
                                disabled={!profile.is_open}
                                className="flex-1 rounded-full py-2 text-[13px] font-extrabold text-white disabled:opacity-40"
                                style={{ backgroundColor: primary }}
                              >
                                Add
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => shareItem(item.id)}
                            aria-label={`Share ${item.name}`}
                            title="Copy a link to this item"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 ring-1 ring-neutral-200"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden><path d="M12 15V3m0 0L8 7m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        </div>
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
                      <div className="mt-2 flex items-center gap-2">
                        {(() => {
                          const plain = plainLineFor(item.id);
                          if (plain) {
                            return (
                              <div className="flex items-center gap-2 rounded-full ring-1 ring-neutral-200">
                                <button onClick={() => changeQty(plain.key, -1)} className="px-3 py-1.5 font-black">-</button>
                                <span className="text-[12px] font-extrabold">{plain.qty}</span>
                                <button onClick={() => changeQty(plain.key, 1)} className="px-3 py-1.5 font-black">+</button>
                              </div>
                            );
                          }
                          return <AddButton primary={primary} disabled={!profile.is_open} onClick={() => startAdd(item)} />;
                        })()}
                        <button
                          onClick={() => shareItem(item.id)}
                          aria-label={`Share ${item.name}`}
                          title="Copy a link to this item"
                          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 ring-1 ring-neutral-200"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden><path d="M12 15V3m0 0L8 7m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
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

        <footer className="mt-12 border-t border-neutral-200/70 pb-2 pt-8 text-center">
          {profile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo_url} alt={profile.name} className="mx-auto h-12 w-12 rounded-full object-cover ring-1 ring-neutral-200" />
          ) : (
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-black text-white" style={{ backgroundColor: primary }}>
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
          <p className="mt-3 text-base font-black">{profile.name}</p>
          {(profile.address || profile.city) && (
            <p className="mt-1 text-[13px] font-semibold text-neutral-500">
              {profile.address}
              {profile.address && profile.city ? ", " : ""}
              {profile.city}
            </p>
          )}
          {profile.phone && (
            <p className="mt-0.5 text-[13px] font-semibold text-neutral-500">
              <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className="hover:underline">{profile.phone}</a>
            </p>
          )}
          {profile.seo_text && (
            <div className="mx-auto mt-5 max-w-2xl text-left">
              <p className={`text-[13px] font-medium leading-relaxed text-neutral-500 ${seoExpanded ? "" : "line-clamp-3"}`}>
                {profile.seo_text}
              </p>
              {profile.seo_text.length > 220 && (
                <button
                  onClick={() => setSeoExpanded(!seoExpanded)}
                  className="mt-1 text-[13px] font-extrabold text-neutral-600 underline"
                >
                  {seoExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}
          <p className="mt-4 text-[12px] font-bold text-neutral-400">
            <PoweredBy className="hover:text-neutral-600 hover:underline" />
          </p>
        </footer>
      </main>

      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
        {showTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-neutral-600 shadow-lg ring-1 ring-neutral-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-5 w-5" aria-hidden>
              <path d="M12 19V5m-7 7 7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {theme.sections.whatsapp !== false && profile.phone && (
          <a
            href={waLink(profile.phone)}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat on WhatsApp"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
              <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.11 3.22 5.1 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2.13-1.42.37-.7.37-1.3.26-1.42-.11-.12-.28-.2-.58-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 0 1 9.88 9.89c0 5.45-4.44 9.88-9.89 9.88m8.42-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.9 11.9 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.18-1.24-6.16-3.47-8.41" />
            </svg>
          </a>
        )}
      </div>

      {cartCount > 0 && !checkoutOpen && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-full px-5 py-3.5 text-sm font-extrabold text-white shadow-lg"
          style={{ backgroundColor: primary }}
        >
          <span>{cartCount} item{cartCount > 1 ? "s" : ""} in cart</span>
          <span>{formatRs(cartSubtotal)} - View cart</span>
        </button>
      )}

      {shareMsg && (
        <p className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-2xl bg-neutral-900 px-4 py-2.5 text-center text-[13px] font-bold text-white shadow-lg">
          {shareMsg}
        </p>
      )}

      {cartOpen && (
        <CartPanel
          lines={cart}
          upsells={(() => {
            const inCart = new Set(cart.map((l) => l.item_id));
            const all = categories.flatMap((c) => c.items);
            const byId = new Map(all.map((i) => [i.id, i]));
            // Ranked by real buying behaviour: for every item in the
            // cart, add the co-occurrence counts of its bought-together
            // partners (orders where both items appear). A candidate
            // that pairs with several cart items scores the sum.
            const scores = new Map<number, number>();
            for (const line of cart) {
              if (!line.item_id) continue;
              for (const partner of data.bought_together?.[String(line.item_id)] ?? []) {
                if (inCart.has(partner.id)) continue;
                scores.set(partner.id, (scores.get(partner.id) ?? 0) + partner.count);
              }
            }
            const scored = [...scores.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([id]) => byId.get(id))
              .filter((i): i is Item => !!i);
            // Cold start / fill-up only: when there is no order history
            // yet (or fewer than 6 scored items), badges first, then
            // the rest of the menu, so the rail is never empty.
            const chosen = new Set(scored.map((i) => i.id));
            const ranked = all.filter((i) => !inCart.has(i.id) && !chosen.has(i.id));
            const badged = ranked.filter(
              (i) => i.badges.includes("bestseller") || i.badges.includes("popular"),
            );
            const rest = ranked.filter(
              (i) => !i.badges.includes("bestseller") && !i.badges.includes("popular"),
            );
            return [...scored, ...badged, ...rest].slice(0, 6).map((i) => ({
              id: i.id,
              name: i.name,
              price: i.price,
              photo_url: i.photo_url,
            }));
          })()}
          primary={primary}
          onQty={(key, delta) => changeQty(key, delta)}
          onAddUpsell={(itemId) => {
            const found = categories.flatMap((c) => c.items).find((i) => i.id === itemId);
            if (found) startAdd(found);
          }}
          onCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
          onClose={() => setCartOpen(false)}
        />
      )}

      {sheetItem && (
        <ModifierSheet
          item={sheetItem}
          primary={primary}
          onClose={() => setSheetItem(null)}
          onAdd={(options, qty, note) => addLine(sheetItem, options, qty, note)}
        />
      )}

      {checkoutOpen && (
        <CheckoutPanel
          cart={cart}
          setCart={setCart}
          zones={zones}
          branches={data.branches ?? []}
          hours={hours}
          tax={profile.tax}
          subtotal={cartSubtotal}
          primary={primary}
          restaurantName={profile.name}
          gate={gateSel}
          onClose={() => setCheckoutOpen(false)}
        />
      )}

      {gateOpen && (
        <LocationGate
          profile={profile}
          zones={zones}
          branches={data.branches ?? []}
          primary={primary}
          todayHours={todayHours}
          current={gateSel}
          onSelect={saveGate}
          onSkip={skipGate}
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

/** Badge + discount chips overlaid on a card photo, indolj style: the
 * item's first badge top-left in the brand color, the % OFF chip top-right
 * in red when a compare-at price is set. */
function CardChips({ item, primary }: { item: Item; primary: string }) {
  const off = offPct(item);
  if (!item.badges[0] && !off) return null;
  return (
    <>
      {item.badges[0] && (
        <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm" style={{ backgroundColor: primary }}>
          {item.badges[0]}
        </span>
      )}
      {off > 0 && (
        <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm">
          {off}% off
        </span>
      )}
    </>
  );
}

/** Price with the struck-through compare-at price when the item is on sale. */
function PriceLine({ item, primary }: { item: Item; primary: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-sm font-black" style={{ color: primary }}>{formatRs(item.price)}</span>
      {offPct(item) > 0 && (
        <span className="text-xs font-bold text-neutral-400 line-through">{formatRs(item.compare_at as number)}</span>
      )}
    </p>
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
      <div className="mt-1">
        <PriceLine item={item} primary={primary} />
      </div>
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
  onAdd: (options: CartOption[], qty: number, note: string) => void;
}) {
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

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
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 200))}
          placeholder="Special instructions for this item (optional, e.g. less spicy)"
          rows={2}
          className="mt-4 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none"
        />
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full ring-1 ring-neutral-200">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 font-black">-</button>
            <span className="min-w-5 text-center text-sm font-extrabold">{qty}</span>
            <button onClick={() => setQty(Math.min(50, qty + 1))} className="px-3 py-2 font-black">+</button>
          </div>
          <button
            disabled={!valid}
            onClick={() => onAdd(chosen, qty, note)}
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

/** The location gate: the branded entry modal from the indolj playbook.
 * Asks how the customer wants their food and, for delivery, which area
 * they are in - the choice persists on the device, preselects the
 * checkout zone, and can be changed any time from the header pill.
 * Skipping only dismisses it for the session. */
function LocationGate({
  profile,
  zones,
  branches,
  primary,
  todayHours,
  current,
  onSelect,
  onSkip,
}: {
  profile: StorefrontData["profile"];
  zones: Zone[];
  branches: Branch[];
  primary: string;
  todayHours: StorefrontData["hours"][number] | undefined;
  current: GateSelection | null;
  onSelect: (sel: GateSelection) => void;
  onSkip: () => void;
}) {
  const [type, setType] = useState<"delivery" | "pickup">(
    current?.type ?? "delivery",
  );
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState<number | "">(
    current?.branch_id ?? branches[0]?.id ?? "",
  );
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsMsg, setGpsMsg] = useState<string | null>(null);

  interface AreaRow {
    zoneId: number;
    zoneName: string;
    area: string;
    fee: number;
    min: number;
  }
  const rows = useMemo<AreaRow[]>(() => {
    const out: AreaRow[] = [];
    for (const z of zones) {
      if (z.areas && z.areas.length > 0) {
        for (const a of z.areas) {
          out.push({ zoneId: z.id, zoneName: z.name, area: a, fee: z.fee_pkr, min: z.min_order_pkr });
        }
      } else {
        out.push({ zoneId: z.id, zoneName: z.name, area: z.name, fee: z.fee_pkr, min: z.min_order_pkr });
      }
    }
    return out;
  }, [zones]);
  const q = query.trim().toLowerCase();
  const visible = q
    ? rows.filter((r) => `${r.area} ${r.zoneName}`.toLowerCase().includes(q))
    : rows;
  const multiZone = new Set(rows.map((r) => r.zoneId)).size > 1;

  /** GPS lookup: reverse-geocode the device position (OpenStreetMap
   * Nominatim, no key needed) and fuzzy-match the suburb against the
   * delivery areas. Nothing is stored; a miss just shows a message. */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsMsg("Your device does not support location lookup.");
      return;
    }
    setGpsBusy(true);
    setGpsMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`,
          );
          const body = await res.json();
          const addr = body?.address ?? {};
          const candidates = [
            addr.suburb,
            addr.neighbourhood,
            addr.city_district,
            addr.town,
            addr.city,
          ]
            .filter(Boolean)
            .map((s: string) => s.toLowerCase());
          const match = rows.find((r) =>
            candidates.some(
              (c) =>
                r.area.toLowerCase().includes(c) ||
                c.includes(r.area.toLowerCase()) ||
                r.zoneName.toLowerCase().includes(c),
            ),
          );
          if (match) {
            onSelect({
              type: "delivery",
              zone_id: match.zoneId,
              area: match.area === match.zoneName ? "" : match.area,
            });
          } else {
            setGpsMsg("We could not match your location to a delivery area. Please pick one below.");
          }
        } catch {
          setGpsMsg("Location lookup failed. Please pick your area below.");
        }
        setGpsBusy(false);
      },
      () => {
        setGpsMsg("Location permission was denied. Please pick your area below.");
        setGpsBusy(false);
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center" onClick={onSkip}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 text-white" style={{ backgroundColor: primary }}>
          {profile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/40" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl font-black ring-2 ring-white/40">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-black leading-tight">{profile.name}</p>
            <p className="text-[13px] font-semibold text-white/80">Select your order type</p>
          </div>
          <button
            onClick={onSkip}
            aria-label="Close"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="block">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-2">
            {(["delivery", "pickup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-full py-2.5 text-sm font-extrabold capitalize ring-1 ${type === t ? "text-white" : "bg-white text-neutral-600 ring-neutral-200"}`}
                style={type === t ? { backgroundColor: primary } : undefined}
              >
                {t === "pickup" ? "Pick-Up" : "Delivery"}
              </button>
            ))}
          </div>

          {type === "delivery" ? (
            <>
              {zones.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  This restaurant has not set up delivery areas yet. You can
                  still order for pick-up, or call {profile.phone || "the restaurant"} to ask about delivery.
                </p>
              ) : (
                <>
                  <button
                    onClick={useCurrentLocation}
                    disabled={gpsBusy}
                    className="mt-4 w-full rounded-full py-2.5 text-sm font-extrabold ring-1 ring-neutral-200 disabled:opacity-50"
                  >
                    {gpsBusy ? "Finding your area..." : "Use my current location"}
                  </button>
                  {gpsMsg && (
                    <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-800">
                      {gpsMsg}
                    </p>
                  )}
                  <div className="relative mt-4">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden>
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.8-3.8" strokeLinecap="round" />
                    </svg>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search your area..."
                      className="w-full rounded-full bg-neutral-50 py-2.5 pl-11 pr-4 text-sm font-semibold outline-none ring-1 ring-neutral-200 placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-300"
                    />
                  </div>
                  <div className="mt-3 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                    {visible.map((r) => (
                      <button
                        key={`${r.zoneId}-${r.area}`}
                        onClick={() => onSelect({ type: "delivery", zone_id: r.zoneId, area: r.area === r.zoneName ? "" : r.area })}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-3.5 py-3 text-left ring-1 ring-transparent hover:ring-neutral-300"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-extrabold">{r.area}</span>
                          <span className="block text-[12px] font-semibold text-neutral-400">
                            {multiZone ? `${r.zoneName} - ` : ""}
                            {r.min > 0 ? `Min order ${formatRs(r.min)}` : "No minimum order"}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${r.fee === 0 ? "bg-green-100 text-green-700" : "bg-white text-neutral-600 ring-1 ring-neutral-200"}`}>
                          {r.fee === 0 ? "Free delivery" : formatRs(r.fee)}
                        </span>
                      </button>
                    ))}
                    {visible.length === 0 && (
                      <p className="py-4 text-center text-sm font-semibold text-neutral-400">
                        No delivery areas match "{query}". Try a nearby area name, or order for pick-up.
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          ) : branches.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-extrabold">Which outlet will you pick up from?</p>
              <div className="mt-2 flex flex-col gap-2">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBranchId(b.id)}
                    className={`rounded-2xl px-4 py-3.5 text-left ring-1 ${branchId === b.id ? "bg-neutral-50 ring-neutral-400" : "bg-white ring-neutral-200"}`}
                  >
                    <span className="block text-sm font-extrabold">{b.name}</span>
                    {b.address && (
                      <span className="mt-0.5 block text-[13px] font-semibold text-neutral-500">{b.address}</span>
                    )}
                    <span className="mt-0.5 block text-[13px] font-semibold text-neutral-500">
                      {b.phone ? `Call: ${b.phone} - ` : ""}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.address || b.name)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-extrabold underline"
                      >
                        Get directions
                      </a>
                    </span>
                  </button>
                ))}
              </div>
              {todayHours && (
                <p className="mt-3 text-[13px] font-semibold text-neutral-500">
                  {todayHours.is_closed ? "Closed today" : `Open today ${todayHours.open} - ${todayHours.close}`}
                </p>
              )}
              <button
                onClick={() => onSelect({ type: "pickup", zone_id: null, area: "", branch_id: branchId === "" ? null : branchId })}
                className="mt-3 w-full rounded-full py-3 text-sm font-extrabold text-white"
                style={{ backgroundColor: primary }}
              >
                Order for pick-up
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="rounded-2xl bg-neutral-50 px-4 py-3.5">
                <p className="text-sm font-extrabold">Pick up from</p>
                <p className="mt-0.5 text-sm font-semibold text-neutral-600">
                  {profile.address}
                  {profile.address && profile.city ? ", " : ""}
                  {profile.city}
                </p>
                {todayHours && (
                  <p className="mt-1 text-[13px] font-semibold text-neutral-500">
                    {todayHours.is_closed ? "Closed today" : `Open today ${todayHours.open} - ${todayHours.close}`}
                  </p>
                )}
                {profile.phone && (
                  <p className="text-[13px] font-semibold text-neutral-500">Call: {profile.phone}</p>
                )}
              </div>
              <button
                onClick={() => onSelect({ type: "pickup", zone_id: null, area: "", branch_id: null })}
                className="mt-3 w-full rounded-full py-3 text-sm font-extrabold text-white"
                style={{ backgroundColor: primary }}
              >
                Order for pick-up
              </button>
            </div>
          )}

          <button onClick={onSkip} className="mt-4 block w-full text-center text-sm font-bold text-neutral-500">
            Browse the menu first
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckoutPanel({
  cart,
  setCart,
  zones,
  branches,
  hours,
  tax,
  subtotal,
  primary,
  restaurantName,
  gate,
  onClose,
}: {
  cart: CartLine[];
  setCart: (lines: CartLine[]) => void;
  zones: Zone[];
  branches: Branch[];
  hours: { weekday: number; open: string | null; close: string | null; is_closed: boolean }[];
  tax: TaxRule;
  subtotal: number;
  primary: string;
  restaurantName: string;
  gate: GateSelection | null;
  onClose: () => void;
}) {
  // A restaurant with no delivery zones cannot offer delivery at all:
  // the old panel rendered an empty zone dropdown and a misleading
  // "Free" delivery line. Delivery is hidden until a zone exists.
  const deliveryAvailable = zones.length > 0;
  const [type, setType] = useState<"delivery" | "pickup">(
    gate?.type === "delivery" && deliveryAvailable
      ? "delivery"
      : gate?.type === "pickup"
        ? "pickup"
        : deliveryAvailable
          ? "delivery"
          : "pickup",
  );
  const [zoneId, setZoneId] = useState<number | "">(
    gate?.zone_id ?? zones[0]?.id ?? "",
  );
  const [branchId, setBranchId] = useState<number | "">(
    gate?.branch_id ?? branches[0]?.id ?? "",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(
    gate?.type === "delivery" && gate.area ? `${gate.area}, ` : "",
  );
  const [coupon, setCoupon] = useState("");
  const [payment, setPayment] = useState("cod");
  const [orderNote, setOrderNote] = useState("");
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleDay, setScheduleDay] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const zone = zones.find((z) => z.id === zoneId);
  const branch = branches.find((b) => b.id === branchId);
  const deliveryFee =
    type === "pickup" || !zone
      ? 0
      : zone.free_above_pkr !== null && subtotal >= zone.free_above_pkr
        ? 0
        : zone.fee_pkr;
  const belowMin = type === "delivery" && zone !== undefined && subtotal < zone.min_order_pkr;
  // Tax is computed on the food total, plus the delivery fee when the
  // restaurant taxes it. The server recomputes the same figure (on the
  // discounted total when a coupon applies) and its total wins.
  const taxRate = taxRateFor(tax, payment);
  const taxBase = subtotal + (tax.on_delivery ? deliveryFee : 0);
  const taxAmount = calcTax(taxBase, taxRate);
  const grandTotal = subtotal + deliveryFee + taxAmount;
  const etaMinutes = type === "delivery" ? zone?.eta_minutes ?? null : null;

  // Schedule slots: the next 7 days, hourly within each day's hours.
  const scheduleDays = (() => {
    const out: { value: string; label: string; slots: string[] }[] = [];
    const now = new Date();
    for (let offset = 0; offset < 7; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      const idx = (d.getDay() + 6) % 7;
      const row = hours.find((h) => h.weekday === idx);
      if (!row || row.is_closed || !row.open || !row.close) continue;
      const [oh, om] = row.open.split(":").map(Number);
      const [ch, cm] = row.close.split(":").map(Number);
      const slots: string[] = [];
      for (let h = oh; h < ch || (h === ch && cm > 0); h++) {
        const t = `${String(h).padStart(2, "0")}:00`;
        const slotAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0);
        if (slotAt > now) slots.push(t);
        if (h >= 23) break;
      }
      if (!slots.length) continue;
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const label =
        offset === 0 ? `Today (${DAY_NAMES[idx]})` : offset === 1 ? `Tomorrow (${DAY_NAMES[idx]})` : DAY_NAMES[idx];
      out.push({ value, label, slots });
    }
    return out;
  })();

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
    if (type === "delivery" && !zone) return setError("Please choose a delivery area.");
    if (type === "delivery" && !address.trim()) return setError("Please enter your delivery address.");
    let scheduledFor: string | null = null;
    if (scheduleOn) {
      const day = scheduleDays.find((d) => d.value === (scheduleDay || scheduleDays[0]?.value));
      const time = scheduleTime || day?.slots[0];
      if (!day || !time) return setError("Please choose a date and time for your scheduled order.");
      scheduledFor = new Date(`${day.value}T${time}:00`).toISOString();
    }
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
          branch_id: type === "pickup" && branchId !== "" ? branchId : null,
          items: cart.map((l) =>
            l.deal_id
              ? { deal_id: l.deal_id, qty: l.qty, note: l.note }
              : {
                  item_id: l.item_id,
                  qty: l.qty,
                  modifier_option_ids: l.options.map((o) => o.id),
                  note: l.note,
                },
          ),
          coupon_code: coupon.trim(),
          payment_method: payment,
          customer_note: orderNote.trim(),
          scheduled_for: scheduledFor,
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
                    {line.deal_id != null && (
                      <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: primary }}>
                        Deal
                      </p>
                    )}
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
              {(deliveryAvailable ? (["delivery", "pickup"] as const) : (["pickup"] as const)).map((t) => (
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
            {!deliveryAvailable && (
              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-800">
                Delivery is not set up for this restaurant yet. Pick-up is available.
              </p>
            )}

            <div className="mt-3 flex flex-col gap-2.5">
              {type === "delivery" && (
                <>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold outline-none"
                  >
                    <option value="" disabled>Choose your delivery area</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} - delivery {z.fee_pkr === 0 ? "free" : formatRs(z.fee_pkr)}
                        {z.free_above_pkr ? ` (free above ${formatRs(z.free_above_pkr)})` : ""}
                        {` - about ${z.eta_minutes} min`}
                      </option>
                    ))}
                  </select>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address (house, street, block)" className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none" />
                </>
              )}
              {type === "pickup" && branches.length > 0 && (
                <>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(Number(e.target.value))}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>Pick up from {b.name}</option>
                    ))}
                  </select>
                  {branch?.address && (
                    <p className="text-[13px] font-semibold text-neutral-500">
                      {branch.address}
                      {branch.phone ? ` - ${branch.phone}` : ""}
                      {" - "}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branch.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-extrabold underline"
                      >
                        Get directions
                      </a>
                    </p>
                  )}
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
              <textarea
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value.slice(0, 500))}
                placeholder="Note for the restaurant (optional, e.g. ring the bell twice)"
                rows={2}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none"
              />
              <label className="flex items-center gap-2 text-sm font-bold text-neutral-700">
                <input type="checkbox" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} />
                Schedule for later
              </label>
              {scheduleOn && scheduleDays.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={scheduleDay || scheduleDays[0].value}
                    onChange={(e) => {
                      setScheduleDay(e.target.value);
                      setScheduleTime("");
                    }}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold outline-none"
                  >
                    {scheduleDays.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <select
                    value={scheduleTime || (scheduleDays.find((d) => d.value === (scheduleDay || scheduleDays[0].value))?.slots[0] ?? "")}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm font-semibold outline-none"
                  >
                    {(scheduleDays.find((d) => d.value === (scheduleDay || scheduleDays[0].value))?.slots ?? []).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              {scheduleOn && scheduleDays.length === 0 && (
                <p className="text-[13px] font-semibold text-neutral-500">
                  No open hours in the next 7 days, so scheduling is unavailable.
                </p>
              )}
            </div>

            <div className="mt-4 space-y-1 text-sm font-semibold text-neutral-600">
              <p className="flex justify-between"><span>Subtotal</span><span>{formatRs(subtotal)}</span></p>
              {type === "delivery" && (
                <p className="flex justify-between"><span>Delivery</span><span>{deliveryFee === 0 ? "Free" : formatRs(deliveryFee)}</span></p>
              )}
              {taxAmount > 0 && (
                <p className="flex justify-between"><span>{tax.name} ({taxRate}%)</span><span>{formatRs(taxAmount)}</span></p>
              )}
              {etaMinutes !== null && (
                <p className="flex justify-between"><span>Estimated delivery</span><span>About {etaMinutes} min</span></p>
              )}
              <p className="flex justify-between border-t border-neutral-100 pt-2 text-base font-black text-neutral-900">
                <span>Total</span><span>{formatRs(grandTotal)}</span>
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
              disabled={busy || cart.length === 0 || (type === "delivery" && !zone) || belowMin}
              className="mt-4 w-full rounded-full py-3.5 text-sm font-extrabold text-white disabled:opacity-40"
              style={{ backgroundColor: primary }}
            >
              {busy ? "Placing order..." : `Place order - ${formatRs(grandTotal)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
