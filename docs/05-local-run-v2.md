# Branvelo v2 — Run It Locally (Phase 0)

Prerequisites: Git + Docker Desktop installed. Nothing else (no Python,
no Node, no PostgreSQL on your machine — all inside containers).

## First run

```bash
git pull
docker compose up --build
```

Wait for all four services to settle (first build takes a few minutes;
later starts take seconds).

## What you should see

| Check | URL / command | Expected |
|---|---|---|
| API health | http://localhost:8000/health | `{"ok": true, "service": "branvelo-api", "checks": {"database": "ok", "redis": "ok"}}` |
| Django admin | http://localhost:8000/admin/ | Django login page (no user yet; Phase 2 creates one) |
| Website | http://localhost:3000 | The current v1 storefront boots (it still reads the live Supabase data until Phase 4/5 rewiring) |
| Database | localhost:5432 | PostgreSQL 16, db `branvelo` |
| Redis | localhost:6379 | Running |

## Daily use

```bash
docker compose up        # start (code changes hot-reload)
docker compose down      # stop (database data is kept in a volume)
docker compose down -v   # stop and WIPE the local database
docker compose logs -f api   # watch Django logs
docker compose logs -f web   # watch Next.js logs
```

## Phase 2: tenancy + platform admin

The api container now boots in three steps: `migrate_schemas` (public
schema + every tenant schema), `bootstrap_platform` (idempotent: public
tenant, `localhost` domains, the `starter` plan at Rs 2,499/mo placeholder,
and a superuser if `PLATFORM_ADMIN_EMAIL`/`PLATFORM_ADMIN_PASSWORD` are
set in `.env`), then the dev server.

- Platform super-admin: http://localhost:8000/admin — tenants, domains,
  plans, subscriptions and the audit log. This is where you run the
  platform from.
- Create a test restaurant (its own schema is created automatically):
  ```bash
  docker compose exec api python manage.py provision_tenant \
    --slug test-cafe --name "Test Cafe" \
    --owner-name "Test Owner" --owner-email owner@example.com
  ```
  Then browse http://test-cafe.localhost:8000/health — a 200 means the
  subdomain resolved to that tenant's schema. An unknown subdomain
  returns 404 by design.
- Wipe everything and re-prove from zero: `docker compose down -v` then
  `docker compose up --build`.

## Phase 3: public signup

The marketing site's signup form (`/platform/signup`) is live: a restaurant
picks its web address (checked live against `GET /api/platform/slug-check`),
fills its details, chooses brand color / layout / font and storefront
sections, and `POST /api/platform/signup` creates everything in one go:
tenant + schema, subdomain, 14-day trial subscription, the restaurant
profile with their theme, default opening hours (11:00-23:00 daily), and
the owner staff account (login = signup email + chosen password).

Try it: `docker compose up`, open http://localhost:3000/platform/signup,
sign up as e.g. `spice-route`, then check the platform admin — the tenant
is there — and http://spice-route.localhost:8000/health answers from the
new tenant's schema. (At deployment, `branvelo.com` and `www` get domain
rows pointing at the public tenant so this same API serves production.)

## Phase 4: catalog + storefront

Staff side (per tenant, token auth):
- Sign in at http://<slug>.localhost:3000/admin/login with the owner email
  + password chosen at signup. The browser stores a per-tenant API token.
- Menu manager at /admin/menu: categories and items CRUD against the
  Django staff API (`/api/staff/catalog/...`). Modifier groups/options,
  delivery zones and coupons are in the same API (UI lands with later
  phases). Menu photos: `POST /api/staff/catalog/upload-photo` (multipart,
  field `file`, max 5 MB) returns a hosted URL.
- Roles: owner/manager can write; other staff roles are read-only.

Customer side:
- http://<slug>.localhost:3000 shows the restaurant's real storefront:
  profile, announcement, hours, zones, and the live menu, rendered in the
  theme chosen at signup (color, font, layout variant, sections).
- Data comes from `GET /api/storefront/` on the tenant's own subdomain —
  the browser calls the API on the same hostname (port 8000), which is
  how the tenant is resolved. Ordering/cart arrives in Phase 5.
- Unknown subdomain -> "not on Branvelo yet" page; the platform site
  stays at http://localhost:3000/platform.

## Phase 5: ordering + realtime

Customers can now order end to end:
- On the storefront, items with options (size, extras) open a selection
  sheet that enforces the restaurant's required/min/max rules; the cart
  bar opens checkout (delivery zone or pickup, name/phone/address,
  coupon, cash on delivery / JazzCash / EasyPaisa).
- The server recomputes every price — client totals are never trusted —
  and returns the order number. The success screen links to a live
  tracking page (/track/<order-id>) that updates over websockets as the
  kitchen moves the order (placed -> confirmed -> preparing -> ready ->
  dispatched -> delivered), with the full item/total breakdown.
- Admin: the Orders board (the /admin home) lists the day's orders
  live (green "Live" badge when the websocket is connected; it polls as
  a fallback), with role-correct action buttons — e.g. kitchen staff
  can prepare but never cancel; cancellation closes once dispatched.
- Wrong moves are rejected by the API's state machine with a plain
  reason, which the board shows.

## Phase 6: notifications, feedback, reports

- New orders also write a dashboard notification (queue drained by
  `python manage.py dispatch_notifications`; see docs/06) and can fire
  a browser notification — click "Enable alerts" on the Orders board
  once per browser.
- Each order's detail has a "WhatsApp customer" button: a wa.me deep
  link to the customer's number with the order status prefilled.
- Customers can send praise/suggestions/complaints from the storefront
  feedback block; staff triage them on the Reports page.
- Reports (/admin/reports): orders, revenue, average order for any
  date range; sales by day, busiest hours, top items — with CSV
  downloads for days and items. Cancelled orders are excluded.

## Phase 7: migration, isolation tests, backups

- Import a v1 restaurant: export its Supabase tables as JSON into one
  folder, then
  `docker compose exec api python manage.py import_v1_tenant --dir <folder> --slug <slug> --create --owner-email <email> --owner-password <pw>`
  (drop --create if the tenant already exists). Details in docs/06.
- Tenant isolation is covered by an automated suite:
  `docker compose exec api python manage.py test tenants_app.tests_isolation`
- Backups: `scripts/backup.sh [schema]` / `scripts/restore.sh` —
  see docs/06-hardening-and-ops.md for the full operations notes,
  throttle table and the Phase 7 validation review.

## Notes

- Your code edits on your machine reflect live inside the containers
  (volumes), for both `server/` and `apps/web/`.
- The API container runs migrations automatically on every start.
- `.env` is optional; defaults work. Copy `.env.example` to `.env` only
  to override values (e.g. filling the Supabase keys so the v1 storefront
  is fully functional locally).
- Browser calls from the website reach the API at `localhost:8000`
  (your machine), which is why NEXT_PUBLIC_API_URL points there.
