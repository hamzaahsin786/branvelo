"use client";

import { useMemo, useState } from "react";
import type { Category, MenuItem } from "@branvelo/shared";
import { formatRs } from "@branvelo/shared";
import { useStaffApi } from "@/lib/staff-api";

interface Props {
  initialCategories: Category[];
  initialItems: MenuItem[];
}

interface ItemForm {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  price: string;
  photo_url: string;
  badges: string[];
  sort: string;
  available: boolean;
}

const EMPTY_ITEM: ItemForm = {
  category_id: "",
  name: "",
  description: "",
  price: "",
  photo_url: "",
  badges: [],
  sort: "0",
  available: true,
};

const BADGE_OPTIONS = ["bestseller", "new", "popular"];

/** Menu manager: categories CRUD + items table with edit drawer. */
export function MenuManager({ initialCategories, initialItems }: Props) {
  const api = useStaffApi();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [error, setError] = useState<string | null>(null);

  const [catName, setCatName] = useState("");
  const [catTagline, setCatTagline] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [drawer, setDrawer] = useState<null | ItemForm>(null);

  const itemsByCat = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const arr = map.get(item.category_id);
      if (arr) arr.push(item);
      else map.set(item.category_id, [item]);
    }
    map.forEach((arr) => arr.sort((a, b) => a.sort - b.sort));
    return map;
  }, [items]);

  const fail = (e: unknown, fallback: string) => {
    setError(e instanceof Error ? e.message : fallback);
    setTimeout(() => setError(null), 4000);
  };

  // ── categories ──
  const saveCategory = async () => {
    if (catName.trim().length < 2) return;
    try {
      if (editingCat) {
        const res = await api(`/api/staff/catalog/categories/${editingCat.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: catName.trim(), tagline: catTagline.trim() }),
        });
        if (!res.ok) throw new Error("Could not save category");
        const updated = (await res.json()) as Category;
        setCategories((cs) => cs.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const res = await api("/api/staff/catalog/categories", {
          method: "POST",
          body: JSON.stringify({
            name: catName.trim(),
            tagline: catTagline.trim(),
            sort: categories.length,
          }),
        });
        if (!res.ok) throw new Error("Could not create category");
        const created = (await res.json()) as Category;
        setCategories((cs) => [...cs, created]);
      }
      setCatName("");
      setCatTagline("");
      setEditingCat(null);
    } catch (e) {
      fail(e, "Category save failed");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await api(`/api/staff/catalog/categories/${id}`, { method: "DELETE" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not delete category");
      setCategories((cs) => cs.filter((c) => c.id !== id));
    } catch (e) {
      fail(e, "Delete failed");
    }
  };

  // ── items ──
  const openNewItem = (categoryId: string) =>
    setDrawer({ ...EMPTY_ITEM, category_id: categoryId });

  const openEditItem = (item: MenuItem) =>
    setDrawer({
      id: item.id,
      category_id: item.category_id,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      photo_url: item.photo_url ?? "",
      badges: item.badges,
      sort: String(item.sort),
      available: item.available,
    });

  const saveItem = async () => {
    if (!drawer || drawer.name.trim().length < 2) return;
    const payload = {
      category_id: drawer.category_id,
      name: drawer.name.trim(),
      description: drawer.description.trim(),
      price: Math.max(0, Math.round(Number(drawer.price) || 0)),
      photo_url: drawer.photo_url.trim(),
      badges: drawer.badges,
      sort: Math.max(0, Math.round(Number(drawer.sort) || 0)),
      available: drawer.available,
    };
    try {
      if (drawer.id) {
        const res = await api(`/api/staff/catalog/items/${drawer.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Could not save item");
        const updated = (await res.json()) as MenuItem;
        setItems((is) => is.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const res = await api("/api/staff/catalog/items", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Could not create item");
        const created = (await res.json()) as MenuItem;
        setItems((is) => [...is, created]);
      }
      setDrawer(null);
    } catch (e) {
      fail(e, "Item save failed");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    try {
      const res = await api(`/api/staff/catalog/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete item");
      setItems((is) => is.filter((i) => i.id !== id));
    } catch (e) {
      fail(e, "Delete failed");
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
    try {
      const res = await api(`/api/staff/catalog/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ available: !item.available }),
      });
      if (!res.ok) throw new Error("Could not update item");
      const updated = (await res.json()) as MenuItem;
      setItems((is) => is.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      fail(e, "Update failed");
    }
  };

  const inputCls =
    "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900";

  return (
    <div>
      <h1 className="text-xl font-extrabold">Menu</h1>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {/* categories */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
          Categories
        </h2>
        <ul className="mt-2 flex flex-col gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2"
            >
              <span className="text-sm font-bold">{c.name}</span>
              <span className="flex gap-1">
                <button
                  onClick={() => {
                    setEditingCat(c);
                    setCatName(c.name);
                    setCatTagline(c.tagline ?? "");
                  }}
                  className="rounded-full px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteCategory(c.id)}
                  className="rounded-full px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder={editingCat ? "Category name" : "New category name"}
            className={inputCls}
          />
          <input
            value={catTagline}
            onChange={(e) => setCatTagline(e.target.value)}
            placeholder="Tagline (optional)"
            className={inputCls}
          />
          <button
            onClick={saveCategory}
            className="shrink-0 rounded-full bg-neutral-900 px-5 py-2 text-sm font-bold text-white"
          >
            {editingCat ? "Save" : "Add"}
          </button>
          {editingCat && (
            <button
              onClick={() => {
                setEditingCat(null);
                setCatName("");
                setCatTagline("");
              }}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-bold text-neutral-500"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      {/* items */}
      {categories.map((c) => (
        <section
          key={c.id}
          className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">{c.name}</h2>
            <button
              onClick={() => openNewItem(c.id)}
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white"
            >
              + Add item
            </button>
          </div>
          <ul className="mt-2 flex flex-col gap-2">
            {(itemsByCat.get(c.id) ?? []).map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                  item.available ? "bg-neutral-50" : "bg-neutral-100 opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {item.name}
                    {!item.available && (
                      <span className="ml-2 rounded-full bg-neutral-300 px-2 py-0.5 text-[10px] uppercase">
                        off
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">{formatRs(item.price)}</p>
                </div>
                <span className="flex shrink-0 gap-1">
                  <button
                    onClick={() => toggleAvailable(item)}
                    className="rounded-full px-3 py-1 text-xs font-bold text-neutral-600 hover:bg-neutral-200"
                  >
                    {item.available ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => openEditItem(item)}
                    className="rounded-full px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="rounded-full px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
            {(itemsByCat.get(c.id) ?? []).length === 0 && (
              <p className="py-2 text-center text-xs text-neutral-400">
                No items yet.
              </p>
            )}
          </ul>
        </section>
      ))}

      {/* edit drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawer(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
            <h3 className="text-lg font-extrabold">
              {drawer.id ? "Edit item" : "New item"}
            </h3>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm">
                <span className="font-semibold">Category</span>
                <select
                  value={drawer.category_id}
                  onChange={(e) => setDrawer({ ...drawer, category_id: e.target.value })}
                  className={`${inputCls} mt-1`}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <input
                value={drawer.name}
                onChange={(e) => setDrawer({ ...drawer, name: e.target.value })}
                placeholder="Item name"
                className={inputCls}
              />
              <textarea
                value={drawer.description}
                onChange={(e) => setDrawer({ ...drawer, description: e.target.value })}
                placeholder="Description"
                rows={2}
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="font-semibold">Price (Rs)</span>
                  <input
                    value={drawer.price}
                    onChange={(e) => setDrawer({ ...drawer, price: e.target.value.replace(/\D/g, "") })}
                    inputMode="numeric"
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <label className="text-sm">
                  <span className="font-semibold">Sort order</span>
                  <input
                    value={drawer.sort}
                    onChange={(e) => setDrawer({ ...drawer, sort: e.target.value.replace(/\D/g, "") })}
                    inputMode="numeric"
                    className={`${inputCls} mt-1`}
                  />
                </label>
              </div>
              <input
                value={drawer.photo_url}
                onChange={(e) => setDrawer({ ...drawer, photo_url: e.target.value })}
                placeholder="Photo URL (optional)"
                className={inputCls}
              />
              <div>
                <p className="text-sm font-semibold">Badges</p>
                <div className="mt-1 flex gap-2">
                  {BADGE_OPTIONS.map((b) => (
                    <label key={b} className="flex items-center gap-1 text-sm capitalize">
                      <input
                        type="checkbox"
                        checked={drawer.badges.includes(b)}
                        onChange={(e) =>
                          setDrawer({
                            ...drawer,
                            badges: e.target.checked
                              ? [...drawer.badges, b]
                              : drawer.badges.filter((x) => x !== b),
                          })
                        }
                      />
                      {b}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={drawer.available}
                  onChange={(e) => setDrawer({ ...drawer, available: e.target.checked })}
                />
                Available for ordering
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDrawer(null)}
                className="rounded-full border border-neutral-200 px-5 py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                className="flex-1 rounded-full bg-neutral-900 py-3 text-sm font-bold text-white"
              >
                Save item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
