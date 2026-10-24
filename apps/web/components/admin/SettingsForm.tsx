"use client";

import { useEffect, useState } from "react";
import { formatRs } from "@branvelo/shared";
import { uploadStaffPhoto, useStaffApi } from "@/lib/staff-api";

export interface Theme {
  primary: string;
  accent: string;
  font: string;
  layout: string;
  cat_nav: string;
  sections: {
    announcement: boolean;
    featured: boolean;
    deals: boolean;
    about: boolean;
    whatsapp: boolean;
    location_gate: boolean;
  };
}

export interface HoursRow {
  weekday: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface ProfilePayload {
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
  hours: HoursRow[];
  tax_country?: string;
  tax_rate_percent?: number | null;
  tax_digital_rate_percent?: number | null;
  tax_name?: string;
  tax_on_delivery?: boolean;
  seo_text?: string;
}

export interface Zone {
  id: number;
  name: string;
  areas: string[];
  fee_pkr: number;
  min_order_pkr: number;
  free_above_pkr: number | null;
  eta_minutes: number;
  is_active: boolean;
}

export interface BranchRow {
  id: number;
  name: string;
  address: string;
  phone: string;
  sort: number;
  is_active: boolean;
}

const TAX_COUNTRIES = [
  ["PK", "Pakistan (GST)"],
  ["IN", "India (GST)"],
  ["AE", "UAE (VAT)"],
  ["SA", "Saudi Arabia (VAT)"],
  ["GB", "United Kingdom (VAT)"],
  ["US", "United States (sales tax)"],
  ["CA", "Canada (GST)"],
  ["AU", "Australia (GST)"],
  ["DE", "Germany (VAT)"],
  ["BD", "Bangladesh (VAT)"],
  ["EG", "Egypt (VAT)"],
  ["NG", "Nigeria (VAT)"],
  ["KE", "Kenya (VAT)"],
  ["ZA", "South Africa (VAT)"],
  ["LK", "Sri Lanka (VAT)"],
  ["OM", "Oman (VAT)"],
  ["BH", "Bahrain (VAT)"],
  ["JO", "Jordan (GST)"],
] as const;

interface Props {
  initialProfile: ProfilePayload;
  initialZones: Zone[];
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_THEME: Theme = {
  primary: "#2C24A3",
  accent: "#F59E0B",
  font: "nunito",
  layout: "grid",
  cat_nav: "pills",
  sections: {
    announcement: true,
    featured: true,
    deals: true,
    about: true,
    whatsapp: true,
    location_gate: true,
  },
};

function normalizeTheme(raw: Partial<Theme> | undefined): Theme {
  return {
    ...DEFAULT_THEME,
    ...(raw ?? {}),
    sections: { ...DEFAULT_THEME.sections, ...(raw?.sections ?? {}) },
  };
}

function normalizeHours(rows: HoursRow[] | undefined): HoursRow[] {
  const byDay = new Map((rows ?? []).map((r) => [r.weekday, r]));
  return WEEKDAYS.map((_, weekday) =>
    byDay.get(weekday) ?? {
      weekday,
      open_time: "11:00",
      close_time: "23:00",
      is_closed: false,
    },
  );
}

const inputCls =
  "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900";
const sectionTitle =
  "text-sm font-extrabold uppercase tracking-wide text-neutral-400";
const saveBtn =
  "w-full rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white disabled:opacity-50";

/** Restaurant profile, appearance, opening hours and delivery zones (v2). */
export function SettingsForm({ initialProfile, initialZones }: Props) {
  const api = useStaffApi();
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Restaurant
  const [name, setName] = useState(initialProfile.name);
  const [phone, setPhone] = useState(initialProfile.phone);
  const [address, setAddress] = useState(initialProfile.address);
  const [city, setCity] = useState(initialProfile.city);
  const [announcement, setAnnouncement] = useState(initialProfile.announcement);
  const [isOpen, setIsOpen] = useState(initialProfile.is_open);
  const [logoUrl, setLogoUrl] = useState(initialProfile.logo_url);
  const [coverSlides, setCoverSlides] = useState<string[]>(
    initialProfile.cover_photos && initialProfile.cover_photos.length > 0
      ? [...initialProfile.cover_photos]
      : initialProfile.cover_url
        ? [initialProfile.cover_url]
        : [],
  );
  const [coverInput, setCoverInput] = useState("");
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  function addCoverSlide(url: string) {
    const value = url.trim();
    if (!value) return;
    setCoverSlides((prev) =>
      prev.includes(value) || prev.length >= 6 ? prev : [...prev, value],
    );
  }

  function moveCoverSlide(idx: number, dir: -1 | 1) {
    setCoverSlides((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleUpload(kind: "logo" | "cover", file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(kind);
    try {
      const url = await uploadStaffPhoto(file);
      if (kind === "logo") setLogoUrl(url);
      else addCoverSlide(url);
      flash("Photo uploaded. Press Save restaurant to publish it.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Photo upload failed");
    } finally {
      setUploading(null);
    }
  }

  // Appearance
  const [theme, setTheme] = useState<Theme>(normalizeTheme(initialProfile.theme));

  // Hours
  const [hours, setHours] = useState<HoursRow[]>(
    normalizeHours(initialProfile.hours),
  );

  // Zones
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [zoneForm, setZoneForm] = useState({
    id: "",
    name: "",
    areas: "",
    fee: "",
    min_order: "",
    free_above: "",
    eta: "45",
  });

  // Tax + SEO
  const [taxCountry, setTaxCountry] = useState(initialProfile.tax_country ?? "PK");
  const [taxRate, setTaxRate] = useState(
    initialProfile.tax_rate_percent != null ? String(initialProfile.tax_rate_percent) : "",
  );
  const [taxDigitalRate, setTaxDigitalRate] = useState(
    initialProfile.tax_digital_rate_percent != null ? String(initialProfile.tax_digital_rate_percent) : "",
  );
  const [taxName, setTaxName] = useState(initialProfile.tax_name ?? "");
  const [taxOnDelivery, setTaxOnDelivery] = useState(initialProfile.tax_on_delivery ?? true);
  const [seoText, setSeoText] = useState(initialProfile.seo_text ?? "");

  // Branches
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [branchForm, setBranchForm] = useState({ id: "", name: "", address: "", phone: "" });

  useEffect(() => {
    (async () => {
      try {
        const res = await api("/api/staff/catalog/branches");
        const data = await res.json().catch(() => []);
        if (res.ok && Array.isArray(data)) setBranches(data as BranchRow[]);
      } catch { /* branches stay empty; the section explains itself */ }
      setBranchesLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(note: string) {
    setSavedNote(note);
    setTimeout(() => setSavedNote(null), 3000);
  }

  async function patchProfile(body: Record<string, unknown>, note: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await api("/api/staff/catalog/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Could not save");
      }
      flash(note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const saveRestaurant = () =>
    patchProfile(
      {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        announcement: announcement.trim(),
        is_open: isOpen,
        logo_url: logoUrl.trim(),
        cover_url: coverSlides[0] ?? "",
        cover_photos: coverSlides,
        seo_text: seoText.trim(),
      },
      "Restaurant details saved.",
    );

  const saveTax = () =>
    patchProfile(
      {
        tax_country: taxCountry,
        tax_rate_percent: taxRate === "" ? null : Math.max(0, Math.min(100, Number(taxRate) || 0)),
        tax_digital_rate_percent:
          taxDigitalRate === "" ? null : Math.max(0, Math.min(100, Number(taxDigitalRate) || 0)),
        tax_name: taxName.trim(),
        tax_on_delivery: taxOnDelivery,
      },
      "Tax settings saved.",
    );

  const saveBranch = async () => {
    setError(null);
    const payload = {
      name: branchForm.name.trim(),
      address: branchForm.address.trim(),
      phone: branchForm.phone.trim(),
      is_active: true,
    };
    if (payload.name.length < 2) {
      setError("Branch needs a name");
      return;
    }
    setBusy(true);
    try {
      const res = branchForm.id
        ? await api(`/api/staff/catalog/branches/${branchForm.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api("/api/staff/catalog/branches", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "Could not save branch");
      const saved = data as BranchRow;
      setBranches((bs) =>
        branchForm.id ? bs.map((b) => (b.id === saved.id ? saved : b)) : [...bs, saved],
      );
      setBranchForm({ id: "", name: "", address: "", phone: "" });
      flash("Branch saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Branch save failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteBranch = async (id: number) => {
    if (!confirm("Delete this branch?")) return;
    setError(null);
    try {
      const res = await api(`/api/staff/catalog/branches/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete branch");
      setBranches((bs) => bs.filter((b) => b.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const saveAppearance = () => patchProfile({ theme }, "Appearance saved.");

  const saveHours = () => patchProfile({ hours }, "Opening hours saved.");

  const saveZone = async () => {
    setError(null);
    const payload = {
      name: zoneForm.name.trim(),
      areas: zoneForm.areas
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      fee_pkr: Math.max(0, Math.round(Number(zoneForm.fee) || 0)),
      min_order_pkr: Math.max(0, Math.round(Number(zoneForm.min_order) || 0)),
      free_above_pkr: zoneForm.free_above
        ? Math.max(0, Math.round(Number(zoneForm.free_above)))
        : null,
      eta_minutes: Math.max(5, Math.min(240, Math.round(Number(zoneForm.eta) || 45))),
      is_active: true,
    };
    if (payload.name.length < 2) {
      setError("Zone needs a name");
      return;
    }
    setBusy(true);
    try {
      const res = zoneForm.id
        ? await api(`/api/staff/catalog/zones/${zoneForm.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await api("/api/staff/catalog/zones", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.detail || "Could not save zone");
      }
      const savedZone = data as Zone;
      setZones((zs) =>
        zoneForm.id
          ? zs.map((z) => (z.id === savedZone.id ? savedZone : z))
          : [...zs, savedZone],
      );
      setZoneForm({
        id: "",
        name: "",
        areas: "",
        fee: "",
        min_order: "",
        free_above: "",
        eta: "45",
      });
      flash("Zone saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zone save failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteZone = async (id: number) => {
    if (!confirm("Delete this zone?")) return;
    setError(null);
    try {
      const res = await api(`/api/staff/catalog/zones/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not delete zone");
      setZones((zs) => zs.filter((z) => z.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const setHour = (weekday: number, patch: Partial<HoursRow>) =>
    setHours((rows) =>
      rows.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)),
    );

  return (
    <div>
      <h1 className="text-xl font-extrabold">Settings</h1>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {savedNote && (
        <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          {savedNote}
        </p>
      )}

      {/* restaurant */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className={sectionTitle}>Restaurant</h2>
        <div className="mt-3 flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Restaurant name"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className={inputCls}
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className={inputCls}
            />
          </div>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className={inputCls}
          />
          <input
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Announcement banner (e.g. Open till 4:30 AM)"
            className={inputCls}
          />
          <div>
            <span className="text-sm font-semibold">Logo</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Logo image URL (or upload)"
                className={inputCls}
              />
              <label className="shrink-0 cursor-pointer rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-200">
                {uploading === "logo" ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) =>
                    handleUpload("logo", e.target.files?.[0] ?? null)
                  }
                />
              </label>
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-neutral-200"
                />
              )}
            </div>
          </div>
          <div>
            <span className="text-sm font-semibold">
              Cover photos (storefront banner carousel)
            </span>
            <p className="mt-0.5 text-xs text-neutral-500">
              Add up to 6 wide food photos. They rotate on the storefront
              banner; the first one is the main cover.
            </p>
            {coverSlides.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {coverSlides.map((src, i) => (
                  <div key={`${src}-${i}`} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="h-20 w-full rounded-xl object-cover ring-1 ring-neutral-200"
                    />
                    {i === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white">
                        Cover
                      </span>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                      <button
                        type="button"
                        aria-label="Move photo earlier"
                        disabled={i === 0}
                        onClick={() => moveCoverSlide(i, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-30"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3" aria-hidden>
                          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Move photo later"
                        disabled={i === coverSlides.length - 1}
                        onClick={() => moveCoverSlide(i, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-30"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3" aria-hidden>
                          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() =>
                          setCoverSlides((prev) =>
                            prev.filter((_, j) => j !== i),
                          )
                        }
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3" aria-hidden>
                          <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <input
                value={coverInput}
                onChange={(e) => setCoverInput(e.target.value)}
                placeholder="Cover image URL - wide food photos work best"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => {
                  addCoverSlide(coverInput);
                  setCoverInput("");
                }}
                className="shrink-0 rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-200"
              >
                Add
              </button>
              <label className="shrink-0 cursor-pointer rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-200">
                {uploading === "cover" ? "Uploading..." : "Upload"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) =>
                    handleUpload("cover", e.target.files?.[0] ?? null)
                  }
                />
              </label>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={isOpen}
              onChange={(e) => setIsOpen(e.target.checked)}
              className="h-4 w-4"
            />
            Accepting orders (turn off to pause the storefront)
          </label>
          <textarea
            value={seoText}
            onChange={(e) => setSeoText(e.target.value)}
            placeholder="Footer marketing text (optional, shown under the storefront footer)"
            rows={3}
            className={inputCls}
          />
          <button onClick={saveRestaurant} disabled={busy} className={saveBtn}>
            Save restaurant
          </button>
        </div>
      </section>

      {/* appearance */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className={sectionTitle}>Appearance</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(
            [
              ["Primary", "primary"],
              ["Accent", "accent"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="text-sm">
              <span className="font-semibold">{label}</span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={theme[key]}
                  onChange={(e) =>
                    setTheme((t) => ({ ...t, [key]: e.target.value }))
                  }
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <span className="text-xs text-neutral-500">{theme[key]}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="font-semibold">Font</span>
            <select
              value={theme.font}
              onChange={(e) =>
                setTheme((t) => ({ ...t, font: e.target.value }))
              }
              className={`${inputCls} mt-1`}
            >
              <option value="nunito">Nunito</option>
              <option value="poppins">Poppins</option>
              <option value="inter">Inter</option>
              <option value="playfair">Playfair Display (serif, premium)</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-semibold">Layout</span>
            <select
              value={theme.layout}
              onChange={(e) =>
                setTheme((t) => ({ ...t, layout: e.target.value }))
              }
              className={`${inputCls} mt-1`}
            >
              <option value="classic">Classic</option>
              <option value="grid">Grid</option>
              <option value="minimal">Minimal</option>
            </select>
          </label>
        </div>
        <div className="mt-3">
          <label className="text-sm">
            <span className="font-semibold">Category navigation</span>
            <select
              value={theme.cat_nav}
              onChange={(e) =>
                setTheme((t) => ({ ...t, cat_nav: e.target.value }))
              }
              className={`${inputCls} mt-1`}
            >
              <option value="pills">Pills</option>
              <option value="tiles">Image tiles (uses category photos)</option>
            </select>
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            Tip: add a photo to each category in the Menu Manager and the
            tiles look like the big chains' menus.
          </p>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {(
            [
              ["announcement", "Announcement bar"],
              ["featured", "Featured items section"],
              ["deals", "Deals section"],
              ["about", "About section"],
              ["whatsapp", "WhatsApp chat button"],
              ["location_gate", "Location gate (ask order type and area first)"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <input
                type="checkbox"
                checked={theme.sections[key]}
                onChange={(e) =>
                  setTheme((t) => ({
                    ...t,
                    sections: { ...t.sections, [key]: e.target.checked },
                  }))
                }
                className="h-4 w-4"
              />
              {label}
            </label>
          ))}
        </div>
        <button
          onClick={saveAppearance}
          disabled={busy}
          className={`${saveBtn} mt-4`}
        >
          Save appearance
        </button>
      </section>

      {/* hours */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className={sectionTitle}>Opening hours</h2>
        <p className="mt-1 text-xs text-neutral-500">
          A close time earlier than the open time means you close after
          midnight (e.g. open 11:00, close 04:30).
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {hours.map((row) => (
            <div key={row.weekday} className="flex items-center gap-2">
              <span className="w-24 text-sm font-semibold">
                {WEEKDAYS[row.weekday]}
              </span>
              <input
                type="time"
                value={row.open_time}
                disabled={row.is_closed}
                onChange={(e) =>
                  setHour(row.weekday, { open_time: e.target.value })
                }
                className="rounded-xl border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 disabled:opacity-40"
              />
              <span className="text-neutral-400">-</span>
              <input
                type="time"
                value={row.close_time}
                disabled={row.is_closed}
                onChange={(e) =>
                  setHour(row.weekday, { close_time: e.target.value })
                }
                className="rounded-xl border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-900 disabled:opacity-40"
              />
              <label className="ml-2 flex items-center gap-1.5 text-sm font-semibold text-neutral-500">
                <input
                  type="checkbox"
                  checked={row.is_closed}
                  onChange={(e) =>
                    setHour(row.weekday, { is_closed: e.target.checked })
                  }
                  className="h-4 w-4"
                />
                Closed
              </label>
            </div>
          ))}
        </div>
        <button
          onClick={saveHours}
          disabled={busy}
          className={`${saveBtn} mt-4`}
        >
          Save hours
        </button>
      </section>

      {/* zones */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className={sectionTitle}>Delivery zones</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {zones.map((z) => (
            <li
              key={z.id}
              className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-bold">{z.name}</span>
                <span className="ml-2 text-xs text-neutral-500">
                  {formatRs(z.fee_pkr)} fee - min {formatRs(z.min_order_pkr)}
                  {z.free_above_pkr != null &&
                    ` - free above ${formatRs(z.free_above_pkr)}`}
                </span>
              </div>
              <span className="flex gap-1">
                <button
                  onClick={() =>
                    setZoneForm({
                      id: String(z.id),
                      name: z.name,
                      areas: z.areas.join(", "),
                      fee: String(z.fee_pkr),
                      min_order: String(z.min_order_pkr),
                      free_above:
                        z.free_above_pkr != null
                          ? String(z.free_above_pkr)
                          : "",
                      eta: String(z.eta_minutes ?? 45),
                    })
                  }
                  className="rounded-full px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteZone(z.id)}
                  className="rounded-full px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            value={zoneForm.name}
            onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
            placeholder="Zone name"
            className={inputCls}
          />
          <input
            value={zoneForm.areas}
            onChange={(e) =>
              setZoneForm({ ...zoneForm, areas: e.target.value })
            }
            placeholder="Areas (comma separated)"
            className={inputCls}
          />
          <input
            value={zoneForm.fee}
            onChange={(e) =>
              setZoneForm({ ...zoneForm, fee: e.target.value.replace(/\D/g, "") })
            }
            placeholder="Fee (Rs)"
            inputMode="numeric"
            className={inputCls}
          />
          <input
            value={zoneForm.min_order}
            onChange={(e) =>
              setZoneForm({
                ...zoneForm,
                min_order: e.target.value.replace(/\D/g, ""),
              })
            }
            placeholder="Min order (Rs)"
            inputMode="numeric"
            className={inputCls}
          />
          <input
            value={zoneForm.free_above}
            onChange={(e) =>
              setZoneForm({
                ...zoneForm,
                free_above: e.target.value.replace(/\D/g, ""),
              })
            }
            placeholder="Free above (Rs, optional)"
            inputMode="numeric"
            className={`${inputCls} col-span-2`}
          />
          <input
            value={zoneForm.eta}
            onChange={(e) =>
              setZoneForm({
                ...zoneForm,
                eta: e.target.value.replace(/\D/g, ""),
              })
            }
            placeholder="Delivery time (minutes, e.g. 45)"
            inputMode="numeric"
            className={inputCls}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={saveZone}
            disabled={busy}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {zoneForm.id ? "Save zone" : "Add zone"}
          </button>
          {zoneForm.id && (
            <button
              onClick={() =>
                setZoneForm({
                  id: "",
                  name: "",
                  areas: "",
                  fee: "",
                  min_order: "",
                  free_above: "",
                  eta: "45",
                })
              }
              className="rounded-full px-4 py-2.5 text-sm font-bold text-neutral-500"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      {/* branches */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className={sectionTitle}>Branches (pickup)</h2>
        <p className="mt-2 text-[13px] font-semibold text-neutral-500">
          Extra outlets customers can pick up from. Delivery stays zone-based.
          With no branches, pick-up uses the main restaurant address.
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {branches.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-bold">{b.name}</span>
                {b.address && (
                  <span className="ml-2 text-xs text-neutral-500">{b.address}</span>
                )}
              </div>
              <span className="flex gap-1">
                <button
                  onClick={() =>
                    setBranchForm({
                      id: String(b.id),
                      name: b.name,
                      address: b.address,
                      phone: b.phone,
                    })
                  }
                  className="rounded-full px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteBranch(b.id)}
                  className="rounded-full px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            value={branchForm.name}
            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
            placeholder="Branch name"
            className={inputCls}
          />
          <input
            value={branchForm.phone}
            onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
            placeholder="Branch phone (optional)"
            className={inputCls}
          />
          <input
            value={branchForm.address}
            onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
            placeholder="Branch address"
            className={`${inputCls} col-span-2`}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={saveBranch}
            disabled={busy}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {branchForm.id ? "Save branch" : "Add branch"}
          </button>
          {branchForm.id && (
            <button
              onClick={() => setBranchForm({ id: "", name: "", address: "", phone: "" })}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-neutral-500"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      {/* tax */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className={sectionTitle}>Tax</h2>
        <p className="mt-2 text-[13px] font-semibold text-neutral-500">
          The country picks the default rate; the rate fields override it.
          Pakistan is special: cash and digital payments are taxed
          differently (Punjab 16% cash / 8% digital; Sindh 15% cash / 8%
          digital), so both rates are set here. Rates are added on top of
          menu prices and shown as their own line at checkout. Confirm
          your exact rate with your tax adviser.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            value={taxCountry}
            onChange={(e) => setTaxCountry(e.target.value)}
            className={inputCls}
          >
            {TAX_COUNTRIES.map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <input
            value={taxName}
            onChange={(e) => setTaxName(e.target.value)}
            placeholder="Tax label (e.g. GST, VAT - blank for default)"
            className={inputCls}
          />
          <input
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Standard rate % (blank for country default)"
            inputMode="decimal"
            className={inputCls}
          />
          <input
            value={taxDigitalRate}
            onChange={(e) => setTaxDigitalRate(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Digital-payment rate % (Pakistan only, blank for default)"
            inputMode="decimal"
            className={inputCls}
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={taxOnDelivery}
            onChange={(e) => setTaxOnDelivery(e.target.checked)}
            className="h-4 w-4"
          />
          Charge tax on the delivery fee too
        </label>
        <button onClick={saveTax} disabled={busy} className={`${saveBtn} mt-3`}>
          Save tax settings
        </button>
      </section>
    </div>
  );
}
