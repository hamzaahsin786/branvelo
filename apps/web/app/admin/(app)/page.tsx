import type { OrderRow } from "@mezban/shared";
import { adminApiGet, requireAdminPage } from "@/lib/admin-server";
import { OrderFeed } from "@/components/admin/OrderFeed";

/** Admin dashboard: live order feed. */
export default async function AdminDashboard() {
  const { me } = await requireAdminPage();
  const orders = await adminApiGet<OrderRow[]>("/api/admin/orders?limit=50");
  return <OrderFeed initialOrders={orders} tenantId={me.tenant.id} />;
}
