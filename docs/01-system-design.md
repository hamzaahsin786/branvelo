# Branvelo — System Design v1

> Renamed 2026-10-21 from Mezban to Branvelo for global sale.
> Status: design approved as the build blueprint. Last updated 2026-10-16.

## 1. Vision

A multi-tenant SaaS platform that gives **every restaurant its own Kababjees-style
ordering website** — branded, with menu, cart, checkout and order tracking — plus an
**admin dashboard** to run it, so restaurants take direct orders without paying
marketplace commissions.

Pakistan-first: cash-on-delivery default, JazzCash/Easypaisa support, Urdu/English,
03xx phone numbers, late-night hours (past midnight), Rs pricing.

## 2. Goals / non-goals

**Goals**
- One codebase serves unlimited restaurants; each gets a distinct branded site.
- A non-technical owner can manage menu, prices, hours and orders from a phone.
- Orders flow in real time to the restaurant (dashboard alert + WhatsApp).
- Zero hosting cost on free tiers (same playbook as ClinicSaaS).
- Pilot-ready for Usama Burgers (all data already gathered in `research/`).

**Non-goals (for now)**
- We do not replace foodpanda; we are the restaurant's *direct* channel alongside it.
- No native iOS/Android apps in early phases (PWA instead).
- No payment-gateway integration until Phase 5 (COD + manual wallets first).

## 3. Actors

| Actor | What they do |
|---|---|
| Diner | Browses the restaurant's site, orders (delivery/pickup), tracks order, gives feedback |
| Owner/Admin | Manages menu, prices, hours, zones, promos; confirms/prepares orders; views reports |
| Staff (Manager, Cashier, Kitchen, Rider) | Role-scoped access: POS billing, KDS tickets, deliveries |
| Platform super-admin (us) | Onboards tenants, manages subscriptions/plans, global settings |

## 4. Product modules (the full system)

### M1 — Storefront (customer website, per tenant)
Kababjees-inspired, reskinned per restaurant brand:
- Awning-stripe top border, floating pill header (location + phone | logo | cart + menu)
- Location gate (delivery/pickup, area select), hero carousel, category tiles
- Sticky category pills with scrollspy, search bar, "Popular items"
- Category sections with illustrated banners + rhyming taglines
- Product cards: photo, badges (bestseller/new/popular), description, price, add button
- Cart drawer, checkout (name, phone, address, notes, payment: COD/JazzCash/Easypaisa)
- Order tracking page (live status), feedback/complaint form, footer with hours/map
- SEO: per-item pages, sitemap, Open Graph; Urdu toggle

### M2 — Ordering engine
- Cart with modifiers (extra cheese, spice level…), deal/combo pricing
- Delivery zones with per-zone fees + free-delivery thresholds; min order value
- Order state machine: `placed → confirmed → preparing → ready → dispatched → delivered`,
  with `cancelled` / `refunded` branches; full status history per order
- Scheduled orders (order now, deliver at 8 PM), prep-time estimates
- Stock/availability flags (86'd items), daypart menus (breakfast/lunch)

### M3 — Admin dashboard (restaurant owner)
- Live order feed (new-order sound + badge), order detail, one-tap status changes
- Menu manager: categories, items, modifiers, prices, photos, availability, sorting
- Brand studio: logo, colors, banners, announcements
- Settings: hours (incl. past-midnight), zones/fees, taxes, payment methods, printers
- Staff & roles, customer list, coupon manager

### M4 — POS-lite (counter billing, Phase 3)
- Quick tender: cash / card / wallet; split bills; discounts; printable receipts; day close

### M5 — KDS (kitchen display, Phase 3)
- Live tickets fired by category, bump/recall, prep timers, color-coded lateness

### M6 — Promotions & loyalty (Phase 2/4)
- Coupons (flat/%, min order, usage caps), combos/deals, loyalty points & cashback

### M7 — Notifications (Phase 2)
- Restaurant: Realtime dashboard alert + WhatsApp message on new order
- Diner: order-status updates via WhatsApp/SMS; email receipts (Resend)

### M8 — Fleet-lite (Phase 4)
- Rider roster, order assignment (manual → auto), rider status, COD collection log,
  customer live tracking link

### M9 — Analytics & reports (Phase 2+)
- Sales by day/item/hour, top items, peak hours, repeat customers, export CSV

### M10 — Platform admin (super-admin)
- Tenant onboarding (subdomain, brand kit, seed menu), subscriptions & plan limits,
  global announcements, support inbox

### M11 — Menu boards & kiosk (Phase 4/5)
- TV menu-board renderer (URL on a smart TV), self-order kiosk mode

## 5. Multi-tenancy model

- **One database, `tenant_id` on every tenant row.** App layer always scopes by tenant;
  Supabase Row Level Security enforces it at the DB too.
- **Tenant resolution** (middleware): subdomain `usama.branvelo.com` → path `/t/usama-burgers`
  → fallback default tenant (dev). Custom domains later via Vercel.
- **Theming**: per-tenant brand tokens (primary/accent colors, logo, fonts, banner art)
  stored in DB → emitted as CSS variables. One codebase, unlimited skins.
- **Storage**: one bucket, per-tenant prefixes (`tenants/<slug>/menu/...`).
- **Sub-tenant scope**: branches (multi-branch in Phase 4) hang off the tenant.

## 6. Tech stack — the decision

| Layer | Choice | Why (for us) |
|---|---|---|
| Frontend (storefront + admin UI) | **Next.js 14 App Router, TypeScript, Tailwind CSS** | One deploy serves all tenant sites; Muhammad knows React/TS; Vercel free tier |
| Backend API | **Fastify + TypeScript (REST)** | Separate service; same language as frontend → shared types & Zod schemas via `packages/shared`; fast, TS-first |
| Shared contracts | **`packages/shared`** (types + Zod validation schemas) | Single source of truth for API contracts, imported by both stacks |
| Database / Auth / Realtime / Storage | **Supabase** (Postgres + Auth + Realtime + Storage) | Already proven on ClinicSaaS; free tier fits; Realtime gives us live order alerts + KDS with zero socket servers |
| Realtime transport | Supabase Realtime channels per tenant (direct from frontend) | New-order pings, KDS tickets, tracking updates — no need to proxy through the API |
| API hosting | **Render free tier + keep-warm ping** (free cron every ~10 min) | Rs 0; Render sleeps when idle (30–60s cold start) so we ping it awake; move to an always-on host once real restaurants depend on it |
| Notifications v1 | WhatsApp `wa.me` deep links + in-dashboard alerts | Zero-cost; Cloud API / SMS providers in Phase 2 |
| PWA | Next.js PWA plugin | Installable storefront + admin-lite; native apps deferred |
| Repo / CI | GitHub monorepo + GitHub Actions (typecheck, lint, build) | Matches existing workflow |
| Hosting cost | Vercel (web) + Render (API) + Supabase (data) | **Rs 0/month** |

*Indolj recon note: their marketing site is WordPress/PHP; `api.indolj.pk` is a parked
cPanel page; their app stack isn't fingerprintable from outside. We chose on merit —
see `research/indolj-tech-recon.md`.*

**Cold-start note (honest tradeoff of the split):** a free Render API sleeps after ~15 min
idle; the first request then takes 30–60s. Mitigation for Phase 1: a free external cron
(e.g. cron-job.org) pings `/health` every 10 minutes to keep it warm. When live restaurants
depend on it, the API moves to an always-on host (paid tier or cheap VPS) — the code
doesn't change, only where it runs.

## 7. Architecture & key flows

```
Diner:  subdomain/path ──▶ middleware (resolve tenant) ──▶ themed storefront (Vercel, SSR/ISR)
            │ cart (localStorage) ──▶ checkout ──▶ POST {API}/orders (Fastify on Render)
            │                                     ──▶ Postgres + Realtime broadcast
            └─▶ tracking page ◀── Realtime status updates ◀── admin changes status

Restaurant: /t/:slug/admin ──▶ Supabase Auth (role) ──▶ dashboard (Vercel)
            ◀── Realtime new-order alert (+WhatsApp) ──▶ confirm/prepare via API ──▶ status push
```

- **Reads**: storefront menu pages heavily cached per tenant (ISR; invalidated on menu
  edits). The frontend never talks to Postgres directly (except Auth + Realtime
  subscriptions).
- **Writes**: always through the Fastify API, validated with the Zod schemas from
  `packages/shared`, tenant-scoped, RLS-enforced. Admin writes require a Supabase Auth
  JWT, which the API verifies before checking the role.
- **Media**: upload via admin → API → Supabase Storage → CDN URL stored on the menu item.
- **Contracts**: request/response TypeScript types + Zod schemas live in
  `packages/shared`, imported by both `apps/web` and `apps/api` — the two stacks can
  never disagree on the API shape.

## 8. Data model (core tables)

- `tenants` — slug, name, logo_url, theme (jsonb: colors/fonts), contact, address, geo,
  hours (jsonb, supports past-midnight), status, plan
- `branches` — tenant_id, name, address, phone, hours override, delivery zones link
- `users` — id (auth.users), tenant_id, role (owner/manager/cashier/kitchen/rider), name, phone
- `categories` — tenant_id, name, name_ur, icon, sort, banner_art, active
- `menu_items` — tenant_id, category_id, name, name_ur, description, price, photo_url,
  badges (bestseller/new/popular), sort, available, prep_minutes
- `modifiers` / `modifier_options` — e.g. "Add cheese +Rs 150", spice levels
- `delivery_zones` — tenant_id, name, areas (text[]), fee, min_order, free_above
- `coupons` — tenant_id, code, type (flat/%), value, min_order, caps, validity
- `customers` — tenant_id, name, phone (unique per tenant), address book (jsonb)
- `orders` — tenant_id, branch_id, order_no (per-tenant sequence), customer info snapshot,
  type (delivery/pickup), items snapshot (jsonb) + totals, zone, fee, discount,
  payment_method, status, scheduled_for, source (web/pos/kiosk), timestamps
- `order_items` — order_id, item snapshot, modifiers, qty, line total
- `order_status_history` — order_id, from→to, actor, timestamp
- `feedback` — tenant_id, order_id?, type (complaint/praise), message, status
- `notifications` — tenant_id, channel, payload, status
- `subscriptions` — tenant_id, plan, billing snapshot (manual in early phases)
- `audit_log` — actor, action, entity, diff, timestamp

## 9. Order lifecycle & checkout rules

- Checkout requires: name, valid PK mobile (`03xx-xxxxxxx`), order type; address required
  for delivery and must fall in a delivery zone.
- Pricing: items + modifiers − coupon + zone fee (+ tax if enabled) = total.
- COD is default; JazzCash/Easypaisa = "pay on confirmation" with manual verification
  (screenshot/note field) until gateway phase.
- Status transitions are role-gated (kitchen can't mark delivered; rider/cashier can).

## 10. Security

- RLS on all tenant tables (`tenant_id = current tenant` via JWT claims); service key
  only on the server.
- Zod validation on every write endpoint; rate-limit checkout + feedback (per IP/phone).
- No PII in logs; secrets only in env; uploads type/size-checked.
- Admin sessions via Supabase Auth; short-lived, role-checked server-side on every request.

## 11. Pakistan specifics (built-in, not bolted on)

- COD-first checkout; JazzCash/Easypaisa as manual methods with reference field
- PK phone validation + normalization (03xx → +92)
- Urdu toggle (RTL-ready strings table, same pattern as ClinicSaaS bilingual UI)
- Hours crossing midnight (Usama: 12 PM – 4:30 AM) as first-class data
- Rs formatting (`Rs 1,250`); no decimals

## 12. What we're deliberately NOT building yet

Fleet auto-dispatch, kiosk hardware, TV menu-board hardware control, native apps,
payment gateway, white-label resale, multi-language beyond EN/UR.

---
*Companion docs: `02-implementation-plan.md` (phases), `research/` (indolj + Usama data).*
