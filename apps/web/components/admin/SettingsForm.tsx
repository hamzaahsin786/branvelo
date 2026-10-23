"use client";

import { useState } from "react";
import { formatRs } from "@branvelo/shared";
import { uploadStaffPhoto, useStaffApi } from "@/lib/staff-api";

export interface Theme {
  primary: string;
  accent: string;
  font: string;
  layout: string;
  sections: { announcement: boolean; featured: boolean; about: boolean };
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
  phone: string;
  address: string;
  city: string;
  announcement: string;
  is_open: boolean;
  theme: Theme;
  hours: HoursRow[];
}

export interface Zone {
  id: number;
  name: string;
  areas: string[];
  fee_pkr: number;
  min_order_pkr: number;
  free_above_pkr: number | null;
  is_active: boolean;
}

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
  layout: "classic",
  sections: { announcement: true, featured: true, about: true },
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
  const [coverUrl, setCoverUrl] = useState(initialProfile.cover_url ?? "");
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  async function handleUpload(kind: "logo" | "cover", file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(kind);
    try {
      const url = await uploadStaffPhoto(file);
      if (kind === "logo") setLogoUrl(url);
      else setCoverUrl(url);
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
  });

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
        cover_url: coverUrl.trim(),
      },
      "Restaurant details saved.",
    );

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
              Cover photo (storefront banner)
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="Cover image URL (or upload) - a wide food photo works best"
                className={inputCls}
              />
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
            {coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt=""
                className="mt-2 h-28 w-full rounded-xl object-cover ring-1 ring-neutral-200"
              />
            )}
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
        <div className="mt-3 flex flex-col gap-2">
          {(
            [
              ["announcement", "Announcement bar"],
              ["featured", "Featured items section"],
              ["about", "About section"],
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
                })
              }
              className="rounded-full px-4 py-2.5 text-sm font-bold text-neutral-500"
            >
              Cancel
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
