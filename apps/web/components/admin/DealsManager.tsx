"use client";

import { useCallback, useEffect, useState } from "react";
import { formatRs } from "@branvelo/shared";
import { staffFetch, uploadStaffPhoto } from "@/lib/staff-api";

export interface Deal {
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

interface DealForm {
  id: number | null;
  title: string;
  description: string;
  contents: string;
  price: string;
  compare_at: string;
  photo_url: string;
  is_active: boolean;
  sort: string;
}

const EMPTY_FORM: DealForm = {
  id: null,
  title: "",
  description: "",
  contents: "",
  price: "",
  compare_at: "",
  photo_url: "",
  is_active: true,
  sort: "0",
};

const inputCls =
  "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900";
const labelCls = "text-sm font-semibold";

/** Deals manager (v2): priced bundles shown in the storefront Deals
 * section. A deal is a flat price for a set of items; the contents text
 * is what the customer reads on the card, and checkout re-prices every
 * deal from the server copy, so edits here never change placed orders. */
export function DealsManager() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await staffFetch("/api/staff/catalog/deals");
      if (!res.ok) throw new Error("load failed");
      setDeals((await res.json()) as Deal[]);
    } catch {
      setError("Could not load deals. Check your connection, or sign in again.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form) return;
    setError(null);
    const price = Math.round(Number(form.price) || 0);
    if (!form.title.trim()) return setError("Give the deal a title.");
    if (price <= 0) return setError("Set a deal price above zero.");
    const compare = form.compare_at.trim()
      ? Math.round(Number(form.compare_at) || 0)
      : null;
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      contents: form.contents,
      price_pkr: price,
      compare_at_pkr: compare && compare > price ? compare : null,
      photo_url: form.photo_url.trim(),
      is_active: form.is_active,
      sort: Math.round(Number(form.sort) || 0),
    };
    setBusy(true);
    try {
      const res = await staffFetch(
        form.id
          ? `/api/staff/catalog/deals/${form.id}`
          : "/api/staff/catalog/deals",
        {
          method: form.id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error("save failed");
      setForm(null);
      await load();
    } catch {
      setError("Could not save the deal. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (deal: Deal) => {
    if (!window.confirm(`Delete the deal "${deal.title}"?`)) return;
    setError(null);
    try {
      const res = await staffFetch(`/api/staff/catalog/deals/${deal.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      await load();
    } catch {
      setError("Could not delete the deal. Please try again.");
    }
  };

  const handlePhoto = async (file: File | null) => {
    if (!file || !form) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadStaffPhoto(file);
      setForm({ ...form, photo_url: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (deals === null && !error) {
    return <p className="text-sm font-semibold text-neutral-400">Loading deals...</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="max-w-md text-sm font-semibold text-neutral-500">
          A deal is one flat price for a bundle, like 2 zingers, fries and
          drinks. Active deals appear in the Deals section on your
          storefront and customers order them like any item.
        </p>
        {!form && (
          <button
            onClick={() => setForm(EMPTY_FORM)}
            className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-bold text-white"
          >
            New deal
          </button>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {form && (
        <div className="mb-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
            {form.id ? "Edit deal" : "New deal"}
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Deal title (e.g. Usama Special Deal)"
              className={inputCls}
            />
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Short line under the title (optional)"
              className={inputCls}
            />
            <div>
              <span className={labelCls}>What is included</span>
              <textarea
                value={form.contents}
                onChange={(e) => setForm({ ...form, contents: e.target.value })}
                placeholder={"One item per line, e.g.\nZinger Burger\nChicken Shawarma\nLoaded Fries"}
                rows={4}
                className={`${inputCls} mt-1`}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm">
                <span className={labelCls}>Deal price (Rs)</span>
                <input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  inputMode="numeric"
                  placeholder="999"
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="text-sm">
                <span className={labelCls}>Full price (Rs, optional)</span>
                <input
                  value={form.compare_at}
                  onChange={(e) => setForm({ ...form, compare_at: e.target.value })}
                  inputMode="numeric"
                  placeholder="1299"
                  className={`${inputCls} mt-1`}
                />
              </label>
              <label className="text-sm">
                <span className={labelCls}>Sort order</span>
                <input
                  value={form.sort}
                  onChange={(e) => setForm({ ...form, sort: e.target.value })}
                  inputMode="numeric"
                  className={`${inputCls} mt-1`}
                />
              </label>
            </div>
            <div>
              <span className={labelCls}>Photo</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  placeholder="Photo URL (or upload)"
                  className={inputCls}
                />
                <label className="shrink-0 cursor-pointer rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-200">
                  {uploading ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
                  />
                </label>
                {form.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.photo_url}
                    alt=""
                    className="h-10 w-14 shrink-0 rounded-xl object-cover ring-1 ring-neutral-200"
                  />
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              Active (shown on the storefront)
            </label>
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save deal"}
              </button>
              <button
                onClick={() => setForm(null)}
                className="rounded-full bg-neutral-100 px-5 py-2.5 text-sm font-bold text-neutral-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deals && deals.length === 0 && !form && (
        <p className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-neutral-400 ring-1 ring-neutral-100">
          No deals yet. Create your first deal and it appears on the
          storefront right away.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {(deals ?? []).map((deal) => (
          <div
            key={deal.id}
            className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-neutral-100"
          >
            {deal.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={deal.photo_url}
                alt=""
                className="h-14 w-20 shrink-0 rounded-xl object-cover ring-1 ring-neutral-200"
              />
            ) : (
              <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xl font-black text-white">
                {deal.title.charAt(0)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">
                {deal.title}
                {!deal.is_active && (
                  <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-black text-neutral-500">
                    Hidden
                  </span>
                )}
              </p>
              <p className="truncate text-[12px] font-semibold text-neutral-400">
                {(deal.contents || "").split("\n").filter(Boolean).join(", ") ||
                  deal.description ||
                  "No contents listed"}
              </p>
              <p className="text-[13px] font-bold text-neutral-700">
                {formatRs(deal.price_pkr)}
                {deal.compare_at_pkr != null && deal.compare_at_pkr > deal.price_pkr && (
                  <span className="ml-1.5 font-semibold text-neutral-400 line-through">
                    {formatRs(deal.compare_at_pkr)}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() =>
                setForm({
                  id: deal.id,
                  title: deal.title,
                  description: deal.description,
                  contents: deal.contents,
                  price: String(deal.price_pkr),
                  compare_at: deal.compare_at_pkr ? String(deal.compare_at_pkr) : "",
                  photo_url: deal.photo_url,
                  is_active: deal.is_active,
                  sort: String(deal.sort),
                })
              }
              className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700"
            >
              Edit
            </button>
            <button
              onClick={() => remove(deal)}
              className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
