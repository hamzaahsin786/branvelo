"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CatalogData,
  Category,
  DinerLocation,
  MenuItem,
} from "@mezban/shared";
import { CartProvider, useCart } from "@/lib/cart";
import { ThemeStyle } from "./ThemeStyle";
import { AwningStripe } from "./AwningStripe";
import { PillHeader } from "./PillHeader";
import { LocationGate } from "./LocationGate";
import { Hero } from "./Hero";
import { CategoryTiles } from "./CategoryTiles";
import { StickyCategoryPills } from "./StickyCategoryPills";
import { SearchBar } from "./SearchBar";
import { PopularItems } from "./PopularItems";
import { CategorySection } from "./CategorySection";
import { CartDrawer } from "./CartDrawer";
import { FeedbackForm } from "./FeedbackForm";
import { Footer } from "./Footer";
import { CartIcon } from "./icons";

function locationStorageKey(slug: string) {
  return `mezban-location-${slug}`;
}

function StorefrontInner({ catalog }: { catalog: CatalogData }) {
  const { tenant, categories, items, zones } = catalog;
  const { addItem, count, setOpen } = useCart();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<DinerLocation | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string | null>(
    categories[0]?.id ?? null
  );

  // restore location; gate on first visit
  useEffect(() => {
    try {
      const raw = localStorage.getItem(locationStorageKey(tenant.slug));
      if (raw) {
        setLocation(JSON.parse(raw) as DinerLocation);
      } else {
        setGateOpen(true);
      }
    } catch {
      setGateOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveLocation = (loc: DinerLocation) => {
    setLocation(loc);
    try {
      localStorage.setItem(locationStorageKey(tenant.slug), JSON.stringify(loc));
    } catch {
      /* ignore */
    }
  };

  // scrollspy
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-cat-section]")
    );
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveCat(e.target.getAttribute("data-cat-section"));
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [categories]);

  const scrollToCategory = (id: string) => {
    setActiveCat(id);
    document
      .getElementById(`cat-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const q = query.trim().toLowerCase();
  const visible: { category: Category; items: MenuItem[] }[] = useMemo(() => {
    return categories.map((c) => ({
      category: c,
      items: items.filter(
        (i) =>
          i.category_id === c.id &&
          (q === "" ||
            i.name.toLowerCase().includes(q) ||
            (i.description ?? "").toLowerCase().includes(q))
      ),
    }));
  }, [categories, items, q]);

  const locationLabel = location
    ? location.type === "pickup"
      ? "Pick-Up"
      : location.zoneName || "Delivery"
    : "Select area";

  return (
    <>
      <ThemeStyle theme={tenant.theme} />
      <AwningStripe />
      <PillHeader
        tenant={tenant}
        locationLabel={locationLabel}
        onLocationOpen={() => setGateOpen(true)}
      />
      <LocationGate
        open={gateOpen}
        zones={zones}
        initial={location}
        onClose={() => setGateOpen(false)}
        onSave={saveLocation}
      />

      <main className="mx-auto max-w-6xl pb-4">
        <Hero tenant={tenant} />
        <CategoryTiles categories={categories} onSelect={scrollToCategory} />
        <div className="px-3">
          <StickyCategoryPills
            categories={categories}
            activeId={activeCat}
            onSelect={scrollToCategory}
          />
        </div>
        <SearchBar value={query} onChange={setQuery} />

        <div id="menu" className="scroll-mt-28">
          {q === "" && <PopularItems items={items} onAdd={addItem} />}
          {visible.map(({ category, items: catItems }) => (
            <CategorySection
              key={category.id}
              category={category}
              items={catItems}
              onAdd={addItem}
            />
          ))}
          {q !== "" && visible.every((v) => v.items.length === 0) && (
            <p className="px-6 py-10 text-center text-sm text-neutral-500">
              No items match “{query}”.
            </p>
          )}
        </div>

        <FeedbackForm />
      </main>

      <Footer tenant={tenant} />

      <CartDrawer
        tenant={tenant}
        zones={zones}
        location={location}
        onLocationOpen={() => setGateOpen(true)}
      />

      {/* floating cart button */}
      {count > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--brand)] px-6 py-3.5 font-bold text-white shadow-xl"
        >
          <CartIcon className="h-5 w-5" />
          View cart · {count}
        </button>
      )}
    </>
  );
}

export function StorefrontClient({ catalog }: { catalog: CatalogData }) {
  return (
    <CartProvider tenantSlug={catalog.tenant.slug}>
      <StorefrontInner catalog={catalog} />
    </CartProvider>
  );
}
