# Mezban — Security Model

Last reviewed: 2026-10-16 (post-Phase-1 hardening audit).

## Architecture in one paragraph

Three trust zones: **browser** (untrusted), **Fastify API** (validates everything,
holds the Supabase service-role key), **Supabase Postgres** (Row Level Security as the
last line of defense). The Next.js frontend never talks to Postgres directly except
for Auth (login) and Realtime subscriptions, both with the anon key under RLS.

## What protects what

| Layer | Control |
|---|---|
| Tenancy | Every tenant row carries `tenant_id`. The API resolves `x-tenant-slug` → tenant and scopes **every** query by it. RLS re-enforces the same scoping at the DB. Spoofing another tenant's slug only ever yields that tenant's *public* catalogue; admin routes additionally bind the JWT to a staff row of the resolved tenant, so cross-tenant admin access is impossible. |
| Admin auth | `Authorization: Bearer <Supabase JWT>` → `auth.getUser()` server-side → `users` row must exist, be `active`, belong to the resolved tenant, and have role `owner`/`manager`. No self-registration path: staff rows are created by an existing owner via SQL/API only (no public INSERT policy on `users`). |
| Writes | All writes go through the API with Zod schemas (`packages/shared`). Prices, fees, and coupon math are re-read/recomputed from the DB — client totals are never trusted. Menu `photo_url` must be an `https://` URL (stored-XSS defense). |
| Public reads | Catalogue (menu, zones, coupons) readable by anyone for **active** tenants only. Orders are never publicly readable: tracking uses an unguessable 64-bit token, and the tracking endpoint omits phone/address. |
| Rate limits (API) | `POST /api/orders` 20/min/IP · `POST /api/feedback` 10/min/IP · `/api/admin/*` 60/min/IP · `/health` unlimited (keep-warm). Per-instance memory store — a soft guard; move to Redis/Upstash if abuse appears. |
| HTTP hardening (API) | `@fastify/helmet` defaults (HSTS, no-sniff, frame deny, ...), CORS reflects only `WEB_ORIGIN` (no wildcard, no cookie credentials), 1 MB JSON body cap, generic 500 messages (details stay in server logs), request-id on every log line, no PII in logs. |
| HTTP hardening (web) | CSP (`'self'` + API origin + `*.supabase.co`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `strict-origin-when-cross-origin` referrer, HSTS (HTTPS only). |
| Realtime | Order-status broadcast channels are `order:<64-bit hex token>`; the `realtime.messages` listen policy is permissive but channels are unguessable. Admin live order feed uses `postgres_changes` under RLS (staff JWT). Tracking page falls back to 15 s polling. |
| Secrets | Service-role key lives only in the API's env (Render). The browser bundle contains only `NEXT_PUBLIC_SUPABASE_URL` + anon key (public by design). `.env.example` files contain zero real secrets; `.env*` is git-ignored. |
| Storage | `menu-photos` bucket is public-read; writes require a staff JWT **and** a `<tenant_id>/` path prefix, so one restaurant cannot touch another's photos. |
| Functions | `next_order_no()`, `claim_coupon_use()`, `release_coupon_use()` are `SECURITY DEFINER` with `EXECUTE` revoked from `anon`/`authenticated` — only the service role (the API) can call them. |

## What is intentionally public

Restaurant catalogue (menu, prices, zones, active coupons), business contact info,
order tracking by unguessable token. Everything else requires a staff JWT.

## Known limitations / accepted risks

- **Dependency CVEs needing a major bump**: Next.js 14.2.x and Fastify 4.29.x are on
  their latest 14/4 patches; several advisories are fixed only in Next 15 / Fastify 5.
  Remediation = planned major upgrade (out of scope for Phase 1).
- **Rate limiting is per-instance** (Render may run 1 instance on free tier, so this is
  currently effective; add Redis if instances scale or abuse is seen).
- **Coupon `max_uses`** is race-safe on the counter; in a pathological race two orders
  could both validate before either claims — the claim guard keeps the counter exact
  and the loser gets a clean 400.
- **Realtime broadcast listen policy** is `using (true)`; secrecy rests on the
  unguessable channel token (64-bit). Do not put PII in broadcast payloads (only
  `{status, order_no}` is sent).
- **Render free tier sleeps**; a keep-warm cron pings `/health`. If the API is down,
  checkout fails closed (no order is created).

## Reporting a vulnerability

Do not open a public issue. Email the repository owner directly with:
what you found, steps to reproduce, and the impact you see. Please give us a
reasonable window to fix before any disclosure.
