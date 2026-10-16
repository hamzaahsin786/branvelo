# Design Reference — Kababjees Fried Chicken site (built by indolj)

Studied live 2026-10-16. Layout patterns to reuse for Usama Burgers (reskinned to its own brand, not copied pixel-for-pixel).

## Visual style
- Light theme (white/off-white), brand red dominant (~#E01F26 / #EE202E), charcoal text (#111–#1A1A1A), light gray card backgrounds (#F3F4F6), gold/yellow accents (#FFC400) for badges
- Playful cartoon/fast-food typography: chunky rounded headings, condensed tall cartoon sans for product names, small gray sans prices
- Heavy use of illustrated cartoon food art + mascot; product photos on light gray backgrounds; generous rounding (16–32px radii)
- Signature detail: red-and-white striped awning scallop border at the very top edge

## Structure (top to bottom)
1. Sticky header = floating rounded-full pill bar: LEFT "Change Location" + phone; CENTER logo; RIGHT complaint card + cart button (red count badge) + "Menu" button (opens right-side drawer)
2. Location gate modal on entry: Delivery/Pick-Up toggle, city grid with line-art landmark icons, area dropdown, "Use Current Location", red "Select" button
3. Hero: full-width dark photographic banner with rounded corners, carousel; "SECURE PAYMENTS" trust chip; app store badges
4. Category icon row: horizontal scrollable illustrated tiles with labels
5. Sticky category filter pills (scrollspy): white pills red outline, active = filled red
6. Search bar: large rounded-full "Search Items..." input
7. "POPULAR ITEMS" section + 4-column product card grid
8. Menu category sections, each with custom illustrated cartoon banner (headline + rhyming tagline) + 4-column cards
9. App download banner: solid red panel, "ORDER FASTER. EAT SOONER.", phone mockup, mascot
10. About/SEO block with "Show More"
11. Footer: contact col, follow col (Facebook/Instagram), help col; illustrated food strip; solid red bottom bar ("POWERED BY INDOLIJ | PRIVACY POLICY | FAQS")
12. Floating: bottom-left red circular search, bottom-right red back-to-top

## Product cards
- White cards, thin red outline, rounded ~16px; product photo top on gray; badges overlap top-left (gold starbursts "BEST SELLER"/"NEW ARRIVAL", yellow "POPULAR" pills)
- Body: product name (condensed black uppercase), one-line gray description; footer row: price left ("RS. 1560" / "FROM RS. 920"), red circular "+" add-to-cart right
- Homepage IS the menu (no separate menu page); sticky pill bar acts as anchor navigation

## Features
- Location-gated ordering flow (delivery vs pickup)
- Cart with red count badge
- Menu drawer: complaint, locations, blogs, bank discounts; "Powered By indolij" footer
- Complaint/feedback: external multi-step portal (voice vs message feedback, city tiles, branch select)
- Hero: hotline + payment trust chips (Visa/Mastercard)

## Reskin notes for Usama Burgers
- Replace red with Usama's brand colors from signage (green + yellow) or keep a bold single brand color
- Keep: awning strip, pill header, location gate, sticky scrollspy pills, cartoon banners per category, product cards with "+" buttons, app-download-style CTA (here: WhatsApp/phone ordering instead of app), complaint/feedback section, illustrated footer strip
- Usama's actual order channels: phone (0339 5249000), foodpanda deep link, WhatsApp — no custom app, so swap "app download" banner for "order now" channels
