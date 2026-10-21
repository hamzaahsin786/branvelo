# Branvelo v2 — Database Design

One PostgreSQL database. Two layers:
- `public` schema: the platform control layer (SHARED_APPS).
- One schema per restaurant: the tenant layer (TENANT_APPS), created automatically
  at signup by django-tenants.

Tenant resolution: the request subdomain (e.g. `usama.branvelo.com`, locally
`usama.localhost`) maps to a row in `public.tenants`; django-tenants middleware
sets the PostgreSQL `search_path` to that tenant's schema for the whole request.

---

## 1. Public schema (control layer)

### tenants — the control table
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| schema_name | varchar(63) unique | postgres schema, e.g. `usama_burgers`; immutable after creation |
| name | varchar(120) | restaurant display name |
| slug | varchar(63) unique | subdomain label, e.g. `usama` |
| owner_name | varchar(120) | |
| owner_email | citext unique | login identity for the owner account |
| owner_phone | varchar(20) | PK format, normalized +92 |
| city | varchar(80) | |
| plan_id | fk -> plans | |
| status | varchar(16) | `trial` / `active` / `suspended` / `closed` |
| trial_ends_at | timestamptz null | |
| created_at / updated_at | timestamptz | |

### domains
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| tenant_id | fk -> tenants, cascade | |
| domain | varchar(253) unique | `usama.branvelo.com` or a custom domain |
| is_primary | boolean | one primary per tenant |

### plans
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| code | varchar(32) unique | `starter`, `growth` |
| name | varchar(60) | |
| price_monthly_pkr | integer | 0 = custom |
| max_branches | integer | v1 of the product: 1 |
| is_active | boolean | |

### subscriptions
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| tenant_id | fk -> tenants | |
| plan_id | fk -> plans | |
| status | varchar(16) | `trialing` / `active` / `past_due` / `cancelled` |
| current_period_start / end | date | |
| created_at / updated_at | timestamptz | |

### platform_users
Django's auth user, restricted to the public schema: Branvelo staff and
super-admins (Django Admin access). Restaurant staff are NOT here; they live
in the tenant schema.

### platform_audit_log
| column | type | notes |
|---|---|---|
| id | bigint pk | |
| actor | varchar(120) | staff email or `system` |
| action | varchar(80) | `tenant.created`, `tenant.suspended`, ... |
| tenant_id | uuid null | |
| detail | jsonb | |
| created_at | timestamptz | |

---

## 2. Tenant schema (per restaurant; template for every tenant)

### staff_users (extends Django auth user inside tenant schema)
| column | type | notes |
|---|---|---|
| id | bigint pk (auth user) | |
| role | varchar(16) | `owner` / `manager` / `cashier` / `kitchen` / `rider` |
| phone | varchar(20) | |
| is_active_staff | boolean | soft-disable without deleting the login |

### restaurant_profile (single row per tenant)
name, logo_url, phone, address, city, currency (default `PKR`),
announcement text, is_open flag (manual override), theme jsonb
(colors, fonts — same shape as v1 so the storefront theming ports directly).

### opening_hours
| column | type | notes |
|---|---|---|
| weekday | smallint 0-6 | one row per day |
| open_time / close_time | time | close <= open means past midnight |
| is_closed | boolean | |

### categories
id, name, name_ur, icon, banner_url, sort, is_active.

### menu_items
id, category fk, name, name_ur, description, price_pkr (integer, no decimals),
photo_url, badges (array of `bestseller` / `new` / `popular`), sort,
is_available, prep_minutes.

### modifier_groups / modifier_options
group: id, item fk (or category fk), name (e.g. "Extras"), required, min_select, max_select.
option: id, group fk, name, price_delta_pkr, sort, is_available.

### delivery_zones
id, name, areas (text array), fee_pkr, min_order_pkr, free_above_pkr, is_active.

### coupons
id, code (unique per tenant), type (`flat` / `percent`), value, min_order_pkr,
max_uses null, used_count, valid_from, valid_to, is_active.

### customers
id, phone (unique per tenant), name, addresses jsonb, created_at, last_order_at.

### orders
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| order_no | integer | per-tenant sequence, unique per tenant |
| customer_id | fk null | snapshot fields kept regardless |
| customer_name / phone / address | varchar / text | snapshot at checkout |
| type | varchar(10) | `delivery` / `pickup` |
| items | jsonb | line snapshots (name, qty, modifiers, prices) |
| subtotal_pkr / delivery_fee_pkr / discount_pkr / total_pkr | integer | |
| coupon_code | varchar null | |
| payment_method | varchar(16) | `cod` / `jazzcash` / `easypaisa` |
| status | varchar(16) | state machine below |
| scheduled_for | timestamptz null | |
| source | varchar(10) | `web` / `pos` / `kiosk` |
| created_at / updated_at | timestamptz | |

Order status state machine (same as v1):
`placed -> confirmed -> preparing -> ready -> dispatched -> delivered`,
with `cancelled` reachable from any pre-delivery state.
Transitions are role-gated (kitchen cannot mark delivered, etc.).

### order_status_history
id, order fk, from_status, to_status, actor (staff id or `customer`/`system`),
created_at.

### feedback
id, order fk null, type (`complaint` / `praise` / `suggestion`), message,
status (`new` / `seen` / `resolved`), created_at.

### notifications
id, channel (`dashboard` / `whatsapp` / `sms` / `email`), payload jsonb,
status (`queued` / `sent` / `failed`), created_at, sent_at null.
Written by the ordering flow; sent by a background worker (Phase 6).

---

## 3. Django app split

SHARED_APPS (public schema only):
- `tenants_app` (tenants, domains, plans, subscriptions, audit)
- `django.contrib.auth` core + platform admin (django.contrib.admin, etc.)

TENANT_APPS (every tenant schema):
- `accounts` (staff users + roles)
- `catalog` (profile, hours, categories, items, modifiers, zones, coupons)
- `ordering` (customers, orders, history, feedback, notifications)

INSTALLED_APPS = SHARED_APPS + TENANT_APPS (django-tenants merges correctly).

## 4. Provisioning flow (signup, Phase 3)

1. POST signup (public schema): validate, create `tenants` row + primary `domains` row.
2. django-tenants creates the schema and runs all TENANT_APPS migrations into it.
3. Seed: restaurant_profile row, default opening hours, owner staff_user (owner role).
4. Owner sets a password via the emailed/returned activation link and lands in
   the setup wizard.
All four steps in one transaction where possible; schema creation is idempotent
and retried on failure, never half-announced.

## 5. Isolation and safety rules

- Tenant code paths never name a schema explicitly; the middleware owns it.
- No raw SQL with schema names outside provisioning and backup tooling.
- Automated isolation test (Phase 5): an order created under tenant A must be
  invisible to tenant B's API token at every endpoint.
- Backups: nightly full-database dump + per-schema dumps on demand
  (`pg_dump -n <schema>`), scripted in Phase 7.

## 6. Migration from v1 (Phase 7)

Supabase tables map 1:1 to the tenant-schema tables above (same field names kept
where v1 already had them). One-off import command:
`manage.py import_v1_tenant --slug usama-burgers --source <export dir>`.
