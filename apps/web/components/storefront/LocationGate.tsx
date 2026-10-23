"use client";

import { useState } from "react";
import type { DeliveryZone, DinerLocation } from "@branvelo/shared";
import { formatRs } from "@branvelo/shared";
import { XIcon } from "./icons";

interface Props {
  open: boolean;
  zones: DeliveryZone[];
  initial: DinerLocation | null;
  onClose: () => void;
  onSave: (loc: DinerLocation) => void;
}

/** Delivery/pickup gate - Kababjees-style entry modal, reskinned. */
export function LocationGate({ open, zones, initial, onClose, onSave }: Props) {
  const [type, setType] = useState<"delivery" | "pickup">(
    initial?.type ?? "delivery"
  );
  const [zoneId, setZoneId] = useState<string>(initial?.zoneId ?? "");

  if (!open) return null;

  const zone = zones.find((z) => z.id === zoneId);

  const save = () => {
    if (type === "delivery" && !zoneId) return;
    onSave({
      type,
      zoneId: type === "delivery" ? zoneId : null,
      zoneName: type === "delivery" ? zone?.name ?? null : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-neutral-100"
        >
          <XIcon className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-extrabold">Select your order type</h2>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-neutral-100 p-1">
          {(["delivery", "pickup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full py-2.5 text-sm font-bold capitalize transition ${
                type === t
                  ? "bg-[var(--brand)] text-white shadow"
                  : "text-neutral-500"
              }`}
            >
              {t === "delivery" ? "Delivery" : "Pick-Up"}
            </button>
          ))}
        </div>

        {type === "delivery" && (
          <div className="mt-4">
            <label className="text-sm font-semibold">Choose your area</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm"
            >
              <option value="">Select area...</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}: {formatRs(z.fee)} delivery
                </option>
              ))}
            </select>
            {zone && (
              <p className="mt-2 text-xs text-neutral-500">
                Min order {formatRs(zone.min_order)}
                {zone.free_above != null &&
                  ` - Free delivery above ${formatRs(zone.free_above)}`}
              </p>
            )}
          </div>
        )}

        <button
          onClick={save}
          disabled={type === "delivery" && !zoneId}
          className="mt-6 w-full rounded-full bg-[var(--brand)] py-3.5 font-bold text-white disabled:opacity-40"
        >
          Select
        </button>
      </div>
    </div>
  );
}
