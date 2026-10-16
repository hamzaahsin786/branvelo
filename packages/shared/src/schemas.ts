/**
 * @mezban/shared — Zod validation schemas.
 * Used by the Fastify API for every write; the Next.js frontend may reuse
 * them for client-side pre-validation. One definition, both stacks.
 */
import { z } from "zod";

const orderLineSchema = z.object({
  menu_item_id: z.string().uuid(),
  qty: z.number().int().min(1).max(20),
});

export const OrderCreateSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  customer_phone: z.string().trim().min(10).max(20),
  type: z.enum(["delivery", "pickup"]),
  customer_address: z.string().trim().max(300).optional().default(""),
  zone_id: z.string().uuid().optional(),
  coupon_code: z.string().trim().max(24).optional(),
  payment_method: z.enum(["cod", "jazzcash", "easypaisa"]),
  payment_ref: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
  scheduled_for: z.string().datetime({ offset: true }).optional(),
  items: z.array(orderLineSchema).min(1).max(30),
});

export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;

export const FeedbackSchema = z.object({
  type: z.enum(["complaint", "praise", "suggestion"]),
  name: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(20).optional().default(""),
  order_no: z.number().int().positive().optional(),
  message: z.string().trim().min(10).max(2000),
});

export type FeedbackInput = z.infer<typeof FeedbackSchema>;

export const OrderStatusUpdateSchema = z.object({
  status: z.enum([
    "confirmed",
    "preparing",
    "ready",
    "dispatched",
    "delivered",
    "cancelled",
    "refunded",
  ]),
  note: z.string().trim().max(300).optional().default(""),
});

export type OrderStatusUpdateInput = z.infer<typeof OrderStatusUpdateSchema>;

export const CategoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  name_ur: z.string().trim().max(80).optional().default(""),
  tagline: z.string().trim().max(140).optional().default(""),
  icon: z.string().trim().max(16).optional().default(""),
  sort: z.number().int().min(0).max(999).optional().default(0),
  active: z.boolean().optional().default(true),
});

export const CategoryUpdateSchema = CategoryCreateSchema.partial();

export const MenuItemCreateSchema = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  name_ur: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(400).optional().default(""),
  price: z.number().int().min(0).max(1000000),
  // https-only: blocks javascript:/data: URLs (stored-XSS defense in depth).
  // Admins are trusted staff, but a compromised account shouldn't get script exec.
  photo_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), {
      message: "Photo must be an https URL",
    })
    .optional()
    .default(""),
  badges: z
    .array(z.enum(["bestseller", "new", "popular"]))
    .optional()
    .default([]),
  sort: z.number().int().min(0).max(999).optional().default(0),
  available: z.boolean().optional().default(true),
  prep_minutes: z.number().int().min(0).max(600).nullable().optional(),
});

export const MenuItemUpdateSchema = MenuItemCreateSchema.partial();

export const ZoneCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  areas: z
    .array(z.string().trim().min(1).max(80))
    .max(50)
    .optional()
    .default([]),
  fee: z.number().int().min(0).max(100000),
  min_order: z.number().int().min(0).max(1000000),
  free_above: z.number().int().min(0).max(1000000).nullable().optional(),
  active: z.boolean().optional().default(true),
  sort: z.number().int().min(0).max(999).optional().default(0),
});

export const ZoneUpdateSchema = ZoneCreateSchema.partial();

export const SettingsUpdateSchema = z.object({
  announcement: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  tax_percent: z.number().min(0).max(100).nullable().optional(),
  theme: z
    .object({
      primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      dark: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
    .optional(),
  hours: z
    .object({
      timezone: z.string().max(64).optional(),
      days: z.record(z.object({ open: z.string(), close: z.string() })),
    })
    .optional(),
});

export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>;
