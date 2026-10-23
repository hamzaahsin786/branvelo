# 06 - Hardening & Operations (v2, Phase 7)

## Tenant isolation: how it is enforced, and the proof

- One Postgres database; the platform control layer lives in `public`,
  every restaurant in its own schema. `django-tenants` resolves the
  tenant from the request Host (a row in the `domains` table) and sets
  the schema for the whole request. There is no `tenant_id` to forget:
  a query in the wrong schema simply finds nothing.
- Staff tokens are issued and stored **inside** the tenant schema, so a
  token from restaurant A presented at restaurant B returns 401 by
  construction (covered by a test, below).
- Order ids are UUIDs; the public tracking endpoint treats the UUID as
  the capability, exactly like the v1 tracking links.
- Automated proof: `server/tenants_app/tests_isolation.py`
  (storefront separation, cross-tenant token rejection, order
  invisibility both public and staff-side, duplicate-slug rejection,
  fresh-tenant emptiness). Run:
  `python manage.py test tenants_app.tests_isolation`
  Note: the suite documents a django-tenants quirk - its
  `TenantTestCase.setUpClass` never calls `TestCase.setUpClass`, so
  `setUpTestData` silently never runs; all fixture work lives in
  `setUpClass` there.

## Abuse limits (DRF throttles, settings.REST_FRAMEWORK)

| Scope | Rate | Surface |
|---|---|---|
| signup | 10/hour/IP | POST /api/platform/signup |
| slug_check | 60/min/IP | GET /api/platform/slug-check |
| staff_login | 30/hour/IP | POST /api/staff/login, POST /api/staff/exchange |
| platform_login | 20/hour/IP | POST /api/platform/login |
| order_place | 30/hour/IP | POST /api/orders/ |
| feedback | 20/hour/IP | POST /api/feedback |

## Validation review (Phase 7 pass)

- Checkout recomputes **every** price from the database (items,
  modifier deltas, zone fees/thresholds, coupon rules + usage caps).
  Client-sent totals are never read.
- Modifier selections are validated against the item's own groups
  (item-level + category-level), including required groups and
  min/max counts.
- Coupon `used_count` increments atomically with the order insert.
- Menu photo uploads: extension allow-list (jpg/png/webp/gif), 5 MB
  cap, UUID filenames, stored under MEDIA_ROOT.
- The order state machine is enforced server-side per role
  (ordering/services.TRANSITIONS); the admin UI merely mirrors it.
- Signup: slug grammar + reserved list + global uniqueness on slug and
  owner email; theme input passes through the bounded-token cleaner
  (`tenants_app.api._clean_theme`) - the same function the v1 importer
  uses, so there is exactly one cleaning implementation.
- Production settings block (DEBUG=0): SSL redirect behind the proxy
  header, secure cookies, HSTS, nosniff, X-Frame-Options DENY.

## Backups

`scripts/backup.sh [schema]` and `scripts/restore.sh <dump> [db]`
(pg_dump custom format; full database or one tenant schema).

    docker compose exec db /app/scripts/backup.sh            # full
    docker compose exec db /app/scripts/backup.sh spice_route # one tenant

Verified in Phase 7: a per-schema dump of a live tenant restored into
a scratch database reproduced its orders, profile and menu exactly.
Restore into a scratch database first when in doubt; `pg_restore
--clean --if-exists` makes re-restores safe.

## Notifications dispatch

New-order dashboard notifications are written by the ordering flow and
drained by:

    python manage.py dispatch_notifications

Run it on a timer on the server (cron/systemd, every minute is fine).
External channels (WhatsApp/SMS/email) plug into that command behind
provider credentials; until then those rows stay queued and counted,
while dashboard rows are marked sent (they are visible in the admin
instantly). Customer messaging today is the WhatsApp deep link on each
order in the admin board (prefilled with order number and status).

## v1 migration

`python manage.py import_v1_tenant --dir <export> --slug <slug>
[--create --owner-email ... --owner-password ...]`
imports profile/theme/hours, categories, items, zones and coupons from
a Supabase JSON export (field mapping per docs in the command). The
tenant's catalog is wiped first, so re-runs are safe. Historical v1
orders are not imported; the v1 database stays the archive of record.
Archiving the v1 code (apps/api, packages/shared, supabase/) to a
legacy branch happens with the Phase 5-7 batch push, with Muhammad's
approval.
