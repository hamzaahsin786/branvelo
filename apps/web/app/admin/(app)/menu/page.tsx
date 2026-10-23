"use client";

import { useEffect, useState } from "react";
import type { Category, MenuItem } from "@branvelo/shared";
import { staffFetch } from "@/lib/staff-api";
import { MenuManager } from "@/components/admin/MenuManager";

/** Menu manager page (v2): loads the tenant's catalog from the Django
 * staff API, then hands it to the (rewired) MenuManager component. */
export default function AdminMenuPage() {
  const [data, setData] = useState<{
    categories: Category[];
    items: MenuItem[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cats, items] = await Promise.all([
          staffFetch("/api/staff/catalog/categories"),
          staffFetch("/api/staff/catalog/items"),
        ]);
        if (!cats.ok || !items.ok) throw new Error("load failed");
        setData({
          categories: (await cats.json()) as Category[],
          items: (await items.json()) as MenuItem[],
        });
      } catch {
        setError(
          "Could not load the menu. Check your connection, or sign in again.",
        );
      }
    })();
  }, []);

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
        {error}
      </p>
    );
  }
  if (!data) {
    return <p className="text-sm font-semibold text-neutral-400">Loading menu…</p>;
  }
  return (
    <MenuManager initialCategories={data.categories} initialItems={data.items} />
  );
}
