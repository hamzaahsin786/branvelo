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

## Notes

- Your code edits on your machine reflect live inside the containers
  (volumes), for both `server/` and `apps/web/`.
- The API container runs migrations automatically on every start.
- `.env` is optional; defaults work. Copy `.env.example` to `.env` only
  to override values (e.g. filling the Supabase keys so the v1 storefront
  is fully functional locally).
- Browser calls from the website reach the API at `localhost:8000`
  (your machine), which is why NEXT_PUBLIC_API_URL points there.
