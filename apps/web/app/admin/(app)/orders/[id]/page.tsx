import { notFound } from "next/navigation";
import type { OrderRow, OrderStatusHistoryRow } from "@mezban/shared";
import { adminApiGet } from "@/lib/admin-server";
import { OrderDetail } from "@/components/admin/OrderDetail";

export default async function AdminOrderPage({
  params,
}: {
  params: { id: string };
}) {
  let data: { order: OrderRow; history: OrderStatusHistoryRow[] };
  try {
    data = await adminApiGet(`/api/admin/orders/${params.id}`);
  } catch {
    notFound();
  }
  return <OrderDetail order={data.order} history={data.history} />;
}
