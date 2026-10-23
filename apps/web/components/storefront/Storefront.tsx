"use client";

/**
 * Storefront (v2): renders one restaurant from the Django storefront
 * payload — profile, theme, hours, menu, zones. The theme is data: brand
 * color, font and layout variant come from the tenant's profile (set at
 * signup, editable later in the admin Appearance page).
 *
 * Ordering (cart/checkout) lands in Phase 5; this phase is the catalog.
 */
import { useEffect, useMemo, useState } from "react";
import { slugFromHostname, tenantApiOrigin } from "@/lib/staff-api";

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
interface StorefrontData {
  profile: {
    name: string;
    logo_url: string;
    phone: string;
    address: string;
    city: string;
    announcement: string;
    is_open: boolean;
    theme: Theme;
  };
  hours: { weekday: number; open: string | null; close: string | null; is_closed: boolean }[];
  categories: Category[];
  zones: { id: number; name: string; fee_pkr: number; min_order_pkr: number }[];
}

const FONT_STACKS: Record<string, string> = {
  nunito: "'Nunito', ui-rounded, system-ui, sans-serif",
  poppins: "'Poppins', system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
};
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatRs(n: number): string {
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

export function Storefront() {
  const [data, setData] = useState<StorefrontData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${tenantApiOrigin()}/api/storefront/`);
        if (res.status === 404) {
          setState("missing");
          return;
        }
        if (!res.ok) throw new Error("bad response");
        setData((await res.json()) as StorefrontData);
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, []);

  const featured = useMemo(() => {
    if (!data) return [];
    return data.categories
      .flatMap((c) => c.items)
      .filter((i) => i.badges.includes("bestseller") || i.badges.includes("popular"));
  }, [data]);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFF]">
        <p className="text-sm font-semibold text-neutral-400">Loading menu…</p>
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
  const today = (new Date().getDay() + 6) % 7; // JS Sun=0 -> our Mon=0
  const todayHours = hours.find((h) => h.weekday === today);

  return (
    <div
      className="min-h-screen bg-[#FAFAFF] text-neutral-900"
      style={{ fontFamily: FONT_STACKS[theme.font] || FONT_STACKS.nunito }}
    >
      {theme.sections.announcement && profile.announcement && (
        <div
          className="px-4 py-2 text-center text-[13px] font-bold text-white"
          style={{ backgroundColor: primary }}
        >
          {profile.announcement}
        </div>
      )}

      <header className="border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
          {profile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo_url}
              alt={profile.name}
              className="h-12 w-12 rounded-2xl object-cover"
            />
          ) : (
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-white"
              style={{ backgroundColor: primary }}
            >
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black">{profile.name}</h1>
            <p className="text-[13px] font-semibold text-neutral-500">
              {profile.city}
              {todayHours && !todayHours.is_closed
                ? ` · Open today ${todayHours.open}–${todayHours.close}`
                : todayHours
                  ? " · Closed today"
                  : ""}
            </p>
          </div>
          <span
            className={`ml-auto shrink-0 rounded-full px-3 py-1 text-[12px] font-extrabold ${
              profile.is_open
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {profile.is_open ? "Open" : "Closed"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-16">
        {!profile.is_open && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            This restaurant is not taking orders right now. You can still
            browse the menu.
          </p>
        )}

        {theme.sections.featured && featured.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-black">Featured</h2>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {featured.map((item) => (
                <div
                  key={item.id}
                  className="w-44 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-100"
                >
                  {item.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photo_url}
                      alt={item.name}
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-24 items-center justify-center text-2xl font-black text-white"
                      style={{ backgroundColor: primary }}
                    >
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div className="p-3">
                    <p className="truncate text-sm font-extrabold">{item.name}</p>
                    <p className="text-[13px] font-bold" style={{ color: primary }}>
                      {formatRs(item.price)}
                    </p>
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

        {categories.map((cat) => (
          <section key={cat.id} className="mt-8">
            <h2 className="text-base font-black">{cat.name}</h2>
            {cat.tagline && (
              <p className="text-[13px] font-semibold text-neutral-500">
                {cat.tagline}
              </p>
            )}
            <div
              className={
                theme.layout === "grid"
                  ? "mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"
                  : "mt-3 flex flex-col gap-3"
              }
            >
              {cat.items.map((item) =>
                theme.layout === "grid" ? (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-100"
                  >
                    {item.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="h-28 w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-28 items-center justify-center text-3xl font-black text-white"
                        style={{ backgroundColor: primary }}
                      >
                        {item.name.charAt(0)}
                      </div>
                    )}
                    <div className="p-3">
                      <ItemText item={item} primary={primary} />
                    </div>
                  </article>
                ) : (
                  <article
                    key={item.id}
                    className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-neutral-100"
                  >
                    <div className="min-w-0 flex-1">
                      <ItemText item={item} primary={primary} />
                    </div>
                    {theme.layout === "classic" && item.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photo_url}
                        alt={item.name}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    )}
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
            {profile.phone && (
              <p className="text-sm font-semibold text-neutral-600">
                Call: {profile.phone}
              </p>
            )}
            {hours.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                {hours.map((h) => (
                  <p
                    key={h.weekday}
                    className={`text-[13px] font-semibold ${
                      h.weekday === today
                        ? "text-neutral-900"
                        : "text-neutral-500"
                    }`}
                  >
                    {DAY_NAMES[h.weekday]}:{" "}
                    {h.is_closed ? "Closed" : `${h.open}–${h.close}`}
                  </p>
                ))}
              </div>
            )}
            {zones.length > 0 && (
              <p className="mt-3 text-[13px] font-semibold text-neutral-500">
                Delivery:{" "}
                {zones
                  .map(
                    (z) =>
                      `${z.name} (${z.fee_pkr === 0 ? "free" : formatRs(z.fee_pkr)}` +
                      `${z.min_order_pkr ? `, min ${formatRs(z.min_order_pkr)}` : ""})`,
                  )
                  .join(" · ")}
              </p>
            )}
          </section>
        )}

        <footer className="mt-10 text-center text-[12px] font-bold text-neutral-400">
          Powered by Branvelo
        </footer>
      </main>
    </div>
  );
}

function ItemText({ item, primary }: { item: Item; primary: string }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-extrabold">{item.name}</p>
        {item.badges[0] && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white"
            style={{ backgroundColor: primary }}
          >
            {item.badges[0]}
          </span>
        )}
      </div>
      {item.description && (
        <p className="mt-0.5 line-clamp-2 text-[13px] font-medium text-neutral-500">
          {item.description}
        </p>
      )}
      <p className="mt-1 text-sm font-black" style={{ color: primary }}>
        {formatRs(item.price)}
      </p>
      {item.modifier_groups.length > 0 && (
        <p className="mt-0.5 text-[12px] font-semibold text-neutral-400">
          {item.modifier_groups.map((g) => g.name).join(" · ")} available
        </p>
      )}
    </>
  );
}
