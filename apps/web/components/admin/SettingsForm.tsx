"use client";

import { useState } from "react";
import type { DeliveryZone } from "@mezban/shared";
import { formatRs, hoursSummary } from "@mezban/shared";
import { useAuthedApi } from "@/lib/use-authed-api";

interface Settings {
  theme: { primary?: string; dark?: string; accent?: string };
  announcement: string | null;
  phone: string | null;
  address: string | null;
  hours: { timezone?: string; days?: Record<string, { open: string; close: string }> };
  tax_percent: number;
}

interface Props {
  initialSettings: Settings;
  initialZones: DeliveryZone[];
}

/** Brand + hours + delivery zone settings. */
export function SettingsForm({ initialSettings, initialZones }: Props) {
  const api = useAuthedApi();
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [zones, setZones] = useState<DeliveryZone[]>(initialZones);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [primary, setPrimary] = useState(initialSettings.theme.primary || "#15803d");
  const [accent, setAccent] = useState(initialSettings.theme.accent || "#FFC400");
  const [dark, setDark] = useState(initialSettings.theme.dark || "#14532d");
  const [announcement, setAnnouncement] = useState(initialSettings.announcement ?? "");
  const [phone, setPhone] = useState(initialSettings.phone ?? "");
  const [address, setAddress] = useState(initialSettings.address ?? "");
  const [hoursText, setHoursText] = useState(
    JSON.stringify(initialSettings.hours?.days ?? {}, null, 2)
  );

  const [zoneForm, setZoneForm] = useState({
    id: "",
    name: "",
    areas: "",
    fee: "",
    min_order: "",
    free_above: "",
  });

  const saveBrand = async () => {
    setError(null);
    setSaved(false);
    try {
      const res = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          theme: { primary, accent, dark },
          announcement: announcement || null,
          phone: phone || null,
          address: address || null,
        }),
      });
      if (!res.ok) throw new Error("Could not save");
      const updated = (await res.json()) as Settings;
      setSettings((s) => ({ ...s, ...updated }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveHours = async () => {
    setError(null);
    setSaved(false);
    let days: Record<string, { open: string; close: string }>;
    try {
      days = JSON.parse(hoursText) as Record<string, { open: string; close: string }>;
      for (const [day, h] of Object.entries(days)) {
        if (!/^\d{2}:\d{2}$/.test(h.open) || !/^\d{2}:\d{2}$/.test(h.close)) {
          throw new Error(`Bad time format on ${day}: use "HH:MM"`);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid hours JSON");
      return;
    }
    try {
      const res = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ hours: { days } }),
      });
      if (!res.ok) throw new Error("Could not save hours");
      const updated = (await res.json()) as Settings;
      setSettings((s) => ({ ...s, hours: updated.hours }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const saveZone = async () => {
    setError(null);
    const payload = {
      name: zoneForm.name.trim(),
      areas: zoneForm.areas.split(",").map((a) => a.trim()).filter(Boolean),
      fee: Math.max(0, Math.round(Number(zoneForm.fee) || 0)),
      min_order: Math.max(0, Math.round(Number(zoneForm.min_order) || 0)),
      free_above: zoneForm.free_above ? Math.max(0, Math.round(Number(zoneForm.free_above))) : null,
      active: true,
      sort: zones.length,
    };
    if (payload.name.length < 2) {
      setError("Zone needs a name");
      return;
    }
    try {
      const res = zoneForm.id
        ? await api(`/api/admin/zones/${zoneForm.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await api("/api/admin/zones", { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Could not save zone");
      const savedZone = (await res.json()) as DeliveryZone;
      setZones((zs) =>
        zoneForm.id ? zs.map((z) => (z.id === savedZone.id ? savedZone : z)) : [...zs, savedZone]
      );
      setZoneForm({ id: "", name: "", areas: "", fee: "", min_order: "", free_above: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zone save failed");
    }
  };

  const deleteZone = async (id: string) => {
    if (!confirm("Delete this zone?")) return;
    try {
      const res = await api(`/api/admin/zones/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete zone");
      setZones((zs) => zs.filter((z) => z.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const inputCls =
    "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900";

  return (
    <div>
      <h1 className="text-xl font-extrabold">Settings</h1>
      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {saved && (
        <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          Saved.
        </p>
      )}

      {/* brand */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
          Brand
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            ["Primary", primary, setPrimary],
            ["Accent", accent, setAccent],
            ["Dark", dark, setDark],
          ].map(([label, value, set]) => (
            <label key={label as string} className="text-sm">
              <span className="font-semibold">{label as string}</span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={value as string}
                  onChange={(e) => (set as (v: string) => void)(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border"
                />
                <span className="text-xs text-neutral-500">{value as string}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <input
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Announcement banner (e.g. Open till 4:30 AM)"
            className={inputCls}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className={inputCls}
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            className={inputCls}
          />
          <button
            onClick={saveBrand}
            className="rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white"
          >
            Save brand
          </button>
        </div>
      </section>

      {/* hours */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
          Opening hours
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Current: {hoursSummary({ days: settings.hours.days ?? {} })} · close ≤ open means past
          midnight (e.g. 04:30 = next day).
        </p>
        <textarea
          value={hoursText}
          onChange={(e) => setHoursText(e.target.value)}
          rows={10}
          spellCheck={false}
          className={`${inputCls} mt-3 font-mono text-xs`}
        />
        <button
          onClick={saveHours}
          className="mt-3 w-full rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white"
        >
          Save hours
        </button>
      </section>

      {/* zones */}
      <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-neutral-100">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-400">
          Delivery zones
        </h2>
        <ul className="mt-2 flex flex-col gap-2">
          {zones.map((z) => (
            <li
              key={z.id}
              className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-bold">{z.name}</span>
                <span className="ml-2 text-xs text-neutral-500">
                  {formatRs(z.fee)} fee · min {formatRs(z.min_order)}
                  {z.free_above != null && ` · free above ${formatRs(z.free_above)}`}
                </span>
              </div>
              <span className="flex gap-1">
                <button
                  onClick={() =>
                    setZoneForm({
                      id: z.id,
                      name: z.name,
                      areas: z.areas.join(", "),
                      fee: String(z.fee),
                      min_order: String(z.min_order),
                      free_above: z.free_above != null ? String(z.free_above) : "",
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
            onChange={(e) => setZoneForm({ ...zoneForm, areas: e.target.value })}
            placeholder="Areas (comma separated)"
            className={inputCls}
          />
          <input
            value={zoneForm.fee}
            onChange={(e) => setZoneForm({ ...zoneForm, fee: e.target.value.replace(/\D/g, "") })}
            placeholder="Fee (Rs)"
            inputMode="numeric"
            className={inputCls}
          />
          <input
            value={zoneForm.min_order}
            onChange={(e) => setZoneForm({ ...zoneForm, min_order: e.target.value.replace(/\D/g, "") })}
            placeholder="Min order (Rs)"
            inputMode="numeric"
            className={inputCls}
          />
          <input
            value={zoneForm.free_above}
            onChange={(e) => setZoneForm({ ...zoneForm, free_above: e.target.value.replace(/\D/g, "") })}
            placeholder="Free above (Rs, optional)"
            inputMode="numeric"
            className={`${inputCls} col-span-2`}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={saveZone}
            className="flex-1 rounded-full bg-neutral-900 py-2.5 text-sm font-bold text-white"
          >
            {zoneForm.id ? "Save zone" : "Add zone"}
          </button>
          {zoneForm.id && (
            <button
              onClick={() =>
                setZoneForm({ id: "", name: "", areas: "", fee: "", min_order: "", free_above: "" })
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
