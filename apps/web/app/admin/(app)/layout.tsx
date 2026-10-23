"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminMe } from "@/lib/admin-server";
import { getStaffToken, staffFetch } from "@/lib/staff-api";
import { TenantProvider } from "@/lib/tenant-context";
import { AdminShell } from "@/components/admin/AdminShell";

/** Admin gate (v2): a staff token must exist and /api/staff/me must
 * confirm this account is staff of the tenant in the current subdomain. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [me, setMe] = useState<AdminMe | null>(null);

  useEffect(() => {
    if (!getStaffToken()) {
      router.replace("/admin/login");
      return;
    }
    staffFetch("/api/staff/me")
      .then(async (res) => {
        if (!res.ok) throw new Error("unauthorized");
        const data = await res.json();
        setMe({
          user: { id: "", name: data.user.name, role: data.user.role },
          tenant: {
            id: "",
            slug: data.tenant.slug,
            name: data.tenant.name,
            logo_url: null,
          },
        });
      })
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm font-semibold text-neutral-400">Loading…</p>
      </div>
    );
  }
  return (
    <TenantProvider slug={me.tenant.slug}>
      <AdminShell me={me}>{children}</AdminShell>
    </TenantProvider>
  );
}
