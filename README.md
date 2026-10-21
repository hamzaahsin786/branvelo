# Branvelo

Multi-tenant restaurant ordering SaaS — every restaurant gets its own branded,
Kababjees-style ordering website, plus an admin dashboard to run it. Pakistan-first:
COD default, JazzCash/Easypaisa, 03xx phones, past-midnight hours, Rs pricing.

Full system design: `docs/01-system-design.md` · Phased plan: `docs/02-implementation-plan.md`

## Architecture (split stack)

```
Diner:   subdomain/path ─▶ Next.js middleware (resolve tenant) ─▶ themed storefront (Vercel)
           cart (localStorage) ─▶ checkout ─▶ POST {API}/orders (Fastify on Render)
                                                      ─▶ Supabase Postgres + Realtime broadcast
           └▶ /track/:token ◀── Realtime status updates ◀── admin changes status

Restaurant: /admin ─▶ Supabase Auth (JWT) ─▶ dashboard (Vercel)
           ◀── Realtime new-order alert ──▶ confirm via API ──▶ status push to diner
```

- **Frontend never touches Postgres directly** — only Supabase Auth (admin login) and
  Realtime subscriptions. All business data goes through the API.
- **Contracts** (`packages/shared`): TypeScript types + Zod schemas imported by both
  stacks — web and API can never disagree on the API shape.
- **Tenancy**: `x-tenant-slug` header (middleware sets it; clients send it explicitly).
  The API resolves it to a tenant and scopes **every** query by `tenant_id`; RLS
  enforces the same at the DB layer.

## Repo layout

```
mezban/
  apps/web/          Next.js 14 frontend (storefront + /admin) → Vercel
  apps/api/          Fastify REST API → Render
  packages/shared/   Types + Zod schemas + PK formatting helpers (both apps import it)
  supabase/
    migrations/      0001_schema.sql (tables + RLS), 0002_seed_usama.sql
  docs/              system design, implementation plan, research
```

## Setup

### 1. Supabase project
1. Create a project at supabase.com (free tier).
2. SQL Editor → run `supabase/migrations/0001_schema.sql`, then `0002_seed_usama.sql`.
3. Note the project URL, anon key, and service-role key.

### 2. Environment
```bash
cp apps/api/.env.example apps/api/.env        # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT, WEB_ORIGIN
cp apps/web/.env.example apps/web/.env.local  # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Install + build
```bash
npm install                 # workspace root: installs web + api + shared
npm run build -w packages/shared
```

### 4. Run locally
```bash
npm run dev -w apps/api     # Fastify on :3001
npm run dev -w apps/web     # Next.js on :3000
```
Open http://localhost:3000 (default tenant `usama-burgers`).
Subdomain test: http://usama-burgers.localhost:3000 → same tenant via `/t/<slug>` path too.

### 5. Create the admin user
1. Supabase Dashboard → Authentication → Users → **Add user** (email + password). Copy the UID.
2. SQL Editor → run:
```sql
insert into public.users (id, tenant_id, role, name)
values (
  '<AUTH_USER_UID>',
  (select id from public.tenants where slug = 'usama-burgers'),
  'owner',
  'Owner Name'
);
```
3. Open http://localhost:3000/admin and sign in.

## API reference (Fastify)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | keep-warm ping |
| GET | `/api/catalog` | — | public storefront payload (tenant, categories, items, zones) |
| POST | `/api/orders` | — (rate-limited) | checkout; prices re-read from DB |
| GET | `/api/orders/:id` | — | public tracking (token or UUID) |
| POST | `/api/feedback` | — (rate-limited) | feedback / complaints |
| GET | `/api/admin/me` | Bearer JWT + owner/manager | session check |
| GET | `/api/admin/orders` | Bearer JWT + owner/manager | order list |
| GET/PATCH | `/api/admin/orders/:id`, `…/status` | Bearer JWT + owner/manager | detail + state machine |
| GET/POST/PATCH/DELETE | `/api/admin/menu/categories`, `/api/admin/menu/items` | Bearer JWT + owner/manager | menu CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/zones` | Bearer JWT + owner/manager | delivery zones |
| GET/PUT | `/api/admin/settings` | Bearer JWT + owner/manager | brand, hours, contact |

Every `/api/*` (except `/health`) requires the `x-tenant-slug` header.

## Deploy (Rs 0/month)

- **Web → Vercel**: import `apps/web`, set the four `NEXT_PUBLIC_*` env vars (+ `API_URL`
  pointing at the API). Root directory: `apps/web`.
- **API → Render**: new Web Service from `apps/api` (`npm install && npm run build`,
  start `npm start`), set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEB_ORIGIN`
  (your Vercel URL). Free tier sleeps after ~15 min idle → ping `/health` every
  10 min with a free cron (e.g. cron-job.org) to keep it warm. Move to an always-on
  host once real restaurants depend on it — the code doesn't change.
- **Data → Supabase** free tier.

## What's next

Phase 1 exit criteria (a real order: diner → dashboard → status → tracking, on the phone),
then Phase 2 per `docs/02-implementation-plan.md`: coupons engine, WhatsApp
notifications, feedback workflow, analytics, custom domains.

## Conventions

- `npm run typecheck` at the root typechecks all three packages (strict, no `any`).
- Prices are integers (Rs, no decimals). Hours support past-midnight (`close <= open`).
- Phone numbers normalize to `+92…`; display as `03…`.
