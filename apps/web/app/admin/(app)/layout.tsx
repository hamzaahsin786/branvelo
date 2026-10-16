import { requireAdminPage } from "@/lib/admin-server";
import { TenantProvider } from "@/lib/tenant-context";
import { AdminShell } from "@/components/admin/AdminShell";

/** Admin gate: session + API role check (owner/manager of this tenant). */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { slug, me } = await requireAdminPage();
  return (
    <TenantProvider slug={slug}>
      <AdminShell me={me}>{children}</AdminShell>
    </TenantProvider>
  );
}
