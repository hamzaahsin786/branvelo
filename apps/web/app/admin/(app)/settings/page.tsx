"use client";

import { useEffect, useState } from "react";
import {
  SettingsForm,
  type ProfilePayload,
  type Zone,
} from "@/components/admin/SettingsForm";
import { useStaffApi } from "@/lib/staff-api";

/** Settings (v2): loads the restaurant profile + delivery zones from the
 * Django staff API. The (app) layout has already gated on a staff token. */
export default function AdminSettingsPage() {
  const api = useStaffApi();
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, zRes] = await Promise.all([
          api("/api/staff/catalog/profile"),
          api("/api/staff/catalog/zones"),
        ]);
        if (!pRes.ok || !zRes.ok) throw new Error("load failed");
        setProfile((await pRes.json()) as ProfilePayload);
        setZones((await zRes.json()) as Zone[]);
      } catch {
        setError("Could not load settings. Please refresh the page.");
      }
    })();
  }, [api]);

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
    );
  }
  if (!profile || !zones) {
    return (
      <p className="text-sm font-semibold text-neutral-400">Loading...</p>
    );
  }
  return <SettingsForm initialProfile={profile} initialZones={zones} />;
}
