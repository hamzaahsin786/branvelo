import type { DeliveryZone } from "@branvelo/shared";
import { adminApiGet } from "@/lib/admin-server";
import { SettingsForm } from "@/components/admin/SettingsForm";

interface Settings {
  theme: { primary?: string; dark?: string; accent?: string };
  announcement: string | null;
  phone: string | null;
  address: string | null;
  hours: { timezone?: string; days?: Record<string, { open: string; close: string }> };
  tax_percent: number;
}

export default async function AdminSettingsPage() {
  const [settings, zones] = await Promise.all([
    adminApiGet<Settings>("/api/admin/settings"),
    adminApiGet<DeliveryZone[]>("/api/admin/zones"),
  ]);
  return <SettingsForm initialSettings={settings} initialZones={zones} />;
}
