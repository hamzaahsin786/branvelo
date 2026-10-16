import type { Category, MenuItem } from "@mezban/shared";
import { adminApiGet } from "@/lib/admin-server";
import { MenuManager } from "@/components/admin/MenuManager";

export default async function AdminMenuPage() {
  const [categories, items] = await Promise.all([
    adminApiGet<Category[]>("/api/admin/menu/categories"),
    adminApiGet<MenuItem[]>("/api/admin/menu/items"),
  ]);
  return <MenuManager initialCategories={categories} initialItems={items} />;
}
