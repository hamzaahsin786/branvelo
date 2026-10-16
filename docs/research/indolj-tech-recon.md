# Indolj tech-stack recon (2026-10-16)

Goal: figure out what indolj is built on, to inform our own stack choice.

## What we probed
- `indolj.pk` marketing site: WordPress fingerprints (`wp-content` × 9 in HTML), PHP-style
  `.php` URLs, behind Cloudflare. → Marketing site is WordPress/PHP. (Their blog is active;
  latest post dated Sept 2026.)
- `api.indolj.pk`: returns a **cPanel default parked page** (`/cgi-sys/defaultwebpage.cgi`) —
  the subdomain is registered but serves nothing. No API tech to fingerprint.
- `app.indolj.pk`, `dashboard.indolj.pk`, `portal.indolj.pk`: do not resolve.
- `kababjeesfriedchicken.com` (live indolj-powered restaurant site): behind Cloudflare with
  bot protection — direct curl gets HTTP 520 with no body, so no framework fingerprints
  (`__NEXT_DATA__`, `wp-content`, etc.) could be extracted. It is a JS-heavy SPA (their
  marketing brags iOS/Android apps too).

## Honest conclusion
Indolj's exact application stack **cannot be determined from the outside**. Best inference:
a custom backend (PHP/Laravel or Node are the common choices for PK SaaS shops) serving a
JS frontend, with WordPress only for the marketing site.

## Implication
No reason to copy an unknown stack. We choose on merit for OUR constraints:
zero budget, Muhammad's existing skills (TypeScript/React, Node, Python, Supabase),
free-tier hosting that must not sleep during order-taking, and Pakistan-first requirements
(COD, JazzCash/Easypaisa, Urdu, 03xx phones, late-night hours). Decision documented in
`../01-system-design.md` §6.
