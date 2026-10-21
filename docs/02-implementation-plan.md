# Branvelo — Implementation Plan (phased)

> Broad phases, each shippable on its own. Phase 1 is the build target right now.
> Stack: Next.js 14 + TypeScript + Tailwind frontend (Vercel) · Fastify + TypeScript API (Render) · shared contracts in packages/shared · Supabase (Postgres/Auth/Realtime/Storage).
> Full system design: `01-system-design.md`.

## Phase 0 — Foundation ✅ (this session)
- System design + phased plan written
- Monorepo scaffolded, docs organized (Drive), code on GitHub
- Tooling: env templates, CI (typecheck/lint/build), README

## Phase 1 — MVP: platform + first live tenant (build now)
**Goal:** one codebase serves branded restaurant sites; Usama Burgers live and taking real test orders.

Scope:
- Monorepo `apps/web` (storefront + `/admin`), `supabase/` migrations, `docs/`
- DB schema (all §8 core tables) + RLS + seed: Usama Burgers tenant, 7 categories, 37 items, zones, hours
- Tenant resolution middleware (subdomain → path → default) + per-tenant theming (CSS variables)
- Storefront: awning header, pill nav, location gate, hero, category tiles, sticky scrollspy pills, search, popular items, category sections, product cards + badges, cart drawer, checkout (COD/JazzCash/Easypaisa), order tracking page, feedback form, footer
- Admin: Supabase Auth login, role gate, live order feed (Realtime + sound), order detail + status changes, menu manager (categories/items CRUD, photos, availability), brand settings, hours/zones/fees settings
- Deploy: Vercel + Supabase; `usama` tenant live

Exit criteria: a real order flows diner → dashboard → status updates → tracking page, on the phone.

## Phase 2 — Ordering depth
- Coupons/combos engine, delivery zones + fees + free-above thresholds, scheduled orders
- Notifications: WhatsApp new-order ping to restaurant, status updates to diner (WhatsApp/SMS), email receipts
- Feedback/complaint workflow (open → resolved), basic analytics (sales, top items, peak hours)
- Custom domains per restaurant, SEO polish (item pages, sitemap)

Exit: second restaurant onboarded in under a day using only the platform admin.

## Phase 3 — In-store (POS-lite + KDS)
- POS: counter billing, cash/card/wallet tender, discounts, receipt printing, day close
- KDS: live kitchen tickets, bump/recall, prep timers, lateness colors
- Staff roles + PIN login, table management (basic)

Exit: a restaurant runs a full dinner rush on POS + KDS.

## Phase 4 — Growth
- Loyalty: points/cashback, wallet; promo campaigns
- Fleet-lite: rider roster, assignment, COD log, customer tracking link
- Menu boards: TV renderer URL; kiosk mode for tablets
- Multi-branch: branch switcher, branch hours/fees; platform billing (plans, manual JazzCash invoicing)

Exit: a 3-branch restaurant runs all branches from one dashboard.

## Phase 5 — Scale (later)
- Payment gateway (cards/wallets online), PWA polish → native apps decision
- White-label/reseller, theme marketplace, public API

---
*Rule: no phase starts until the previous one's exit criteria are met on a real restaurant.*
