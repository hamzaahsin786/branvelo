/**
 * @mezban/shared — types
 * Single source of truth for domain types, imported by apps/web and apps/api.
 */

export interface Theme {
  primary: string;
  dark?: string;
  accent?: string;
  ink?: string;
  muted?: string;
}

export interface DayHours {
  open: string; // "HH:MM" 24h
  close: string; // "HH:MM" 24h — close <= open means past midnight (next day)
}

export interface HoursJson {
  timezone?: string;
  days: Record<string, DayHours>; // mon..sun
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  theme: Theme;
  phone: string | null;
  email: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  hours: HoursJson;
  announcement: string | null;
  status: string;
  tax_percent: number;
}

/** Public catalogue payload: everything the storefront needs in one call. */
export interface CatalogData {
  tenant: Tenant;
  categories: Category[];
  items: MenuItem[];
  zones: DeliveryZone[];
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  name_ur: string | null;
  tagline: string | null;
  icon: string | null;
  sort: number;
  active: boolean;
}

export type Badge = "bestseller" | "new" | "popular";

export interface MenuItem {
  id: string;
  tenant_id: string;
  category_id: string;
  name: string;
  name_ur: string | null;
  description: string | null;
  price: number; // PKR, no decimals
  photo_url: string | null;
  badges: string[];
  sort: number;
  available: boolean;
  prep_minutes: number | null;
}

export interface DeliveryZone {
  id: string;
  tenant_id: string;
  name: string;
  areas: string[];
  fee: number;
  min_order: number;
  free_above: number | null;
  active: boolean;
  sort: number;
}

export interface Coupon {
  id: string;
  code: string;
  type: "flat" | "percent";
  value: number;
  min_order: number;
  max_uses: number | null;
  uses: number;
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export type OrderType = "delivery" | "pickup";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "ready"
  | "dispatched"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentMethod = "cod" | "jazzcash" | "easypaisa";

export interface OrderItemSnapshot {
  menu_item_id: string | null;
  name: string;
  unit_price: number;
  qty: number;
  line_total: number;
}

/** Public-safe order shape (tracking page, API responses). */
export interface OrderPublic {
  id: string;
  order_no: number;
  tracking_token: string;
  customer_name: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItemSnapshot[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total: number;
  created_at: string;
  scheduled_for: string | null;
}

/** Full order row (admin only). */
export interface OrderRow extends OrderPublic {
  tenant_id: string;
  branch_id: string | null;
  customer_id: string | null;
  customer_phone: string;
  customer_address: string | null;
  zone_id: string | null;
  coupon_code: string | null;
  payment_method: PaymentMethod;
  payment_ref: string | null;
  notes: string | null;
  source: string;
  updated_at: string;
}

export interface OrderStatusHistoryRow {
  id: string;
  from_status: string | null;
  to_status: string;
  actor: string | null;
  note: string | null;
  created_at: string;
}

export interface FeedbackRow {
  id: string;
  type: "complaint" | "praise" | "suggestion";
  name: string | null;
  phone: string | null;
  message: string;
  status: string;
  created_at: string;
}

export type StaffRole = "owner" | "manager" | "cashier" | "kitchen" | "rider";

export interface TenantUser {
  id: string;
  tenant_id: string;
  role: StaffRole;
  name: string | null;
  phone: string | null;
  active: boolean;
}

/** Diner's chosen fulfilment (client state, localStorage). */
export interface DinerLocation {
  type: OrderType;
  zoneId: string | null;
  zoneName: string | null;
}
