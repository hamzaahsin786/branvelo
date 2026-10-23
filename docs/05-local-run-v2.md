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

## Notes

- Your code edits on your machine reflect live inside the containers
  (volumes), for both `server/` and `apps/web/`.
- The API container runs migrations automatically on every start.
- `.env` is optional; defaults work. Copy `.env.example` to `.env` only
  to override values (e.g. filling the Supabase keys so the v1 storefront
  is fully functional locally).
- Browser calls from the website reach the API at `localhost:8000`
  (your machine), which is why NEXT_PUBLIC_API_URL points there.
