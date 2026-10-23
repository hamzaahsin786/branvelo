# Branvelo Pilot Kit - Usama Burgers

Prepared 2026-10-16. Use after the deploy is live (Supabase + Render + Vercel all green).

## 1. Pre-pilot technical checklist

Run through once, in order. Every item is from DEPLOY.md / the seed.

- [ ] Supabase: all 4 migrations run in order - `0001_schema`, `0002_seed_usama`,
      `0003_security`, `0004_menu_photos` (each reports success)
- [ ] Owner account created in Supabase Auth + row in `public.users`
      (role `owner`, tenant `usama-burgers`)
- [ ] Render: `GET /health` returns `{"ok":true}`; `WEB_ORIGIN` = Vercel URL (not `temp`)
- [ ] Vercel: root directory `apps/web`; env vars `NEXT_PUBLIC_API_URL`,
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `DEFAULT_TENANT_SLUG=usama-burgers`
- [ ] Site loads: Usama Burgers branding, photos, full 37-item menu
- [ ] Test order: place an order with your own name + phone, pay-on-delivery;
      it appears in `/admin` with the new-order sound; advance it
      placed -> preparing -> ready -> delivered and watch the tracking page update
- [ ] Hours check: site shows "Open" between 12:00 PM and 4:30 AM, "Closed" outside
- [ ] Send the Render API URL to Lux -> keep-warm cron gets installed

## 2. The economics (for the pitch)

- foodpanda charges partner restaurants **25-35% commission per order**
  (2026 guides; foodpanda's own Pakistan FAQ confirms the commission model
  without publishing the exact rate).
- Example: 40 orders/day × Rs 500 avg = Rs 20,000/day revenue ->
  **Rs 5,000-7,000/day** goes to foodpanda ≈ **Rs 150,000-210,000/month**.
- Branvelo: flat monthly fee, **0% commission**. Every rupee above the flat fee
  stays with the restaurant. (indolj's published model for comparison:
  Rs 4,999/month + 1% of sales per branch.)
- Usama already has its own riders and takes phone orders - no fleet needed,
  no behaviour change, just a branded ordering link instead of a phone number.

## 3. Owner pitch (60 seconds, works in Urdu)

"Assalam-o-Alaikum, I'm Hamza - I build ordering websites for restaurants.
Right now foodpanda takes 25-35 rupees of every 100 you earn through them.
I made you your own website - same style as Kababjees' - where customers
order directly from you: no commission on any order, cash on delivery,
and you get every order instantly on your phone. Your menu, your prices,
your customer numbers - you control all of it, and you can change any
price or item yourself in seconds. I'd like to run it free for you for
[30 days] so you can see the orders coming in. If it doesn't earn its
keep, we switch it off, no cost. Can I show it to you - it takes 5 minutes?"

## 4. Pilot terms - options (his call)

| Option | Terms | Upside | Downside |
|---|---|---|---|
| A. Free 30-day pilot | Rs 0 for 30 days, then Rs 2,999-4,999/mo | Easiest yes; real order data to sell with | No commitment; may ghost at day 30 |
| B. Paid pilot | Rs 1,999 for first month, then standard | Filters for seriousness; owner has skin in the game | Harder yes from a cold approach |
| C. Commission-free + setup fee | One-time Rs 9,999 setup, Rs 1,999/mo | Matches "no commission" story; cash up front | Setup fee can scare a budget shop |

Recommendation: **A for Usama** (first pilot = proof, not revenue). Get a
written OK on WhatsApp for the monthly fee that kicks in after day 30,
so the conversion conversation isn't awkward.

## 5. What you need from the owner (15-minute call)

1. Permission to use their name, logo, and menu on the site
2. Their WhatsApp number for order alerts
3. Confirmation of delivery areas + fees (seed has Johar Town Rs 150 /
   Nearby Rs 250 - confirm or adjust)
4. Real dish photos later (AI photos are placeholders; swapping takes seconds
   in the admin)

## 6. Success criteria for the pilot

- 10+ real customer orders through the site in 30 days
- Owner checks the admin dashboard without help at least once
- At least one menu/price change made by the owner (not by you)
- Day-30 conversation: convert to paid or learn why not
