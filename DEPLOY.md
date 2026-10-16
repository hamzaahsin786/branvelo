# Mezban — Deploy Guide (Phase 1)

Target: **Supabase** (database) + **Render** (Fastify API) + **Vercel** (Next.js web). All free tiers. Total cost: Rs 0.

## 0. GitHub repo (do this first)

The code must be in a repo before Render/Vercel can deploy it.

1. Go to https://github.com/new → Repository name: `mezban` → **Private** → do NOT tick "Add a README" → Create repository.
2. Grant the Muse GitHub App access: open the "Select repositories" link Lux sent in chat → choose your account → select **Only select repositories** → pick `mezban` → Install.
3. Tell Lux "repo is ready" — he pushes the code.

## 1. Supabase (database + auth)

1. https://supabase.com/dashboard → New project → name `mezban`, set a strong DB password, region closest to you (e.g. Singapore).
2. Wait for provisioning → left menu **SQL Editor** → New query → paste the FULL contents of `supabase/migrations/0001_schema.sql` → Run. Then `0002_seed_usama.sql` → Run. Then `0003_security.sql` → Run (security lockdown). Then `0004_menu_photos.sql` → Run (starter dish photos). All four must report success. If you already ran 0001–0003, just run 0004 now.
3. **Project Settings → API**: copy the Project URL and the `service_role` key (keep secret!) and the `anon` key.
4. Create the owner login: **Authentication → Users → Add user → Create new user** (email + password, tick "Auto Confirm user"). Copy the UID.
5. **SQL Editor** → run:
   ```sql
   insert into public.users (id, tenant_id, role, name)
   values ('<PASTE_UID>', (select id from public.tenants where slug='usama-burgers'), 'owner', 'Owner');
   ```

## 2. Render (API)

1. https://dashboard.render.com → New → **Blueprint** → connect the `mezban` repo → it reads `render.yaml` → Apply.
2. When it asks for env vars, fill in:
   - `SUPABASE_URL` → from step 1.3
   - `SUPABASE_SERVICE_ROLE_KEY` → from step 1.3 (secret)
   - `WEB_ORIGIN` → leave blank for now; set it after step 3 (your Vercel URL, no trailing slash)
3. Deploy. Note the API URL, e.g. `https://mezban-api.onrender.com`. Check `https://<api>/health` returns ok.

## 3. Vercel (web)

1. https://vercel.com/new → Import the `mezban` repo → **Root Directory: `apps/web`** → Framework: Next.js (auto).
2. Environment variables:
   - `NEXT_PUBLIC_API_URL` → your Render API URL (no trailing slash)
   - `NEXT_PUBLIC_SUPABASE_URL` → from step 1.3
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → from step 1.3
   - `DEFAULT_TENANT_SLUG` → `usama-burgers`
3. Deploy. Note the URL, e.g. `https://mezban-web.vercel.app`.
4. Back in **Render → mezban-api → Environment**: set `WEB_ORIGIN` to the Vercel URL → Save (auto-redeploys).

## 4. Keep-warm cron (keeps the free Render API awake)

Free Render sleeps after ~15 min idle. Tell Lux your API URL and he sets a cron that pings `https://<api>/health` every 10 minutes — or do it yourself free at https://cron-job.org (create account → Create cronjob → URL = `https://<api>/health` → every 10 minutes).

## 5. Smoke test

1. Open the Vercel URL → Usama Burgers storefront loads with the menu.
2. Add items → checkout with a test name/phone → order appears in `/admin` (log in with the owner user) with a sound alert.
3. Advance the order status → the tracking page updates live.

## Env var reference

| Where | Var | Value |
|---|---|---|
| Render | `SUPABASE_URL` | Supabase project URL |
| Render | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role (secret) |
| Render | `WEB_ORIGIN` | Vercel URL, no trailing slash |
| Vercel | `NEXT_PUBLIC_API_URL` | Render API URL, no trailing slash |
| Vercel | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| Vercel | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| Vercel | `DEFAULT_TENANT_SLUG` | `usama-burgers` |
