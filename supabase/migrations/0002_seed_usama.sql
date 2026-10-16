-- Mezban Phase 1 - seed: Usama Burgers (first tenant)
-- Data verbatim from docs/research/restaurant-data.md (Google Maps listing, 2026-10-16).
-- Prices in PKR, no decimals. Hours cross midnight (12:00 -> 04:30 next day).

do $$
declare
  v_tenant   uuid;
  v_branch   uuid;
  v_cat_app  uuid;
  v_cat_bur  uuid;
  v_cat_grl  uuid;
  v_cat_san  uuid;
  v_cat_shw  uuid;
  v_cat_prt  uuid;
  v_cat_fri  uuid;
begin
  -- ── tenant ──────────────────────────────────────────────────────────────
  insert into tenants (slug, name, logo_url, theme, phone, email, address,
                       latitude, longitude, hours, announcement, status, plan, tax_percent)
  values (
    'usama-burgers',
    'Usama Burgers',
    null,
    '{
      "primary": "#15803d",
      "dark": "#14532d",
      "accent": "#FFC400",
      "ink": "#1a1a1a",
      "muted": "#f3f4f6"
    }'::jsonb,
    '+92 339 5249000',
    null,
    'H-3, Arqam Estate, Block H-3, Phase 2, Johar Town, Lahore, Pakistan',
    31.4711264,
    74.2598131,
    '{
      "timezone": "Asia/Karachi",
      "days": {
        "mon": {"open": "12:00", "close": "04:30"},
        "tue": {"open": "12:00", "close": "04:30"},
        "wed": {"open": "12:00", "close": "04:30"},
        "thu": {"open": "12:00", "close": "04:30"},
        "fri": {"open": "12:00", "close": "04:30"},
        "sat": {"open": "12:00", "close": "04:30"},
        "sun": {"open": "12:00", "close": "04:30"}
      }
    }'::jsonb,
    'Open till 4:30 AM. Lahore''s favourite late-night burgers',
    'active',
    'starter',
    0
  )
  on conflict (slug) do update set
    name = excluded.name, theme = excluded.theme, phone = excluded.phone,
    address = excluded.address, hours = excluded.hours,
    announcement = excluded.announcement, status = 'active'
  returning id into v_tenant;

  -- ── default branch ──────────────────────────────────────────────────────
  insert into branches (tenant_id, name, address, phone, is_default, active)
  values (v_tenant, 'Johar Town', 'H-3, Arqam Estate, Block H-3, Phase 2, Johar Town, Lahore',
          '+92 339 5249000', true, true)
  on conflict do nothing
  returning id into v_branch;

  if v_branch is null then
    select id into v_branch from branches where tenant_id = v_tenant and is_default = true limit 1;
  end if;

  -- ── categories (7) ──────────────────────────────────────────────────────
  insert into categories (tenant_id, name, tagline, sort, active) values
    (v_tenant, 'Appetizers',               'Crispy starters, fiery flavour!',          1, true),
    (v_tenant, 'Burgers',                  'Desi classics, legendary taste!',          2, true),
    (v_tenant, 'Crunch and Grilled Burgers','Grilled to perfection, crunch in every bite!', 3, true),
    (v_tenant, 'Sandwiches and Panini',    'Toasted, loaded, loved!',                 4, true),
    (v_tenant, 'Shawarma and Wrap',        'Wraps that rule every craving!',          5, true),
    (v_tenant, 'Paratha Roll',             'Flaky parathas, juicy fillings!',         6, true),
    (v_tenant, 'Fries',                    'Golden, crispy, irresistible!',           7, true)
  on conflict do nothing;

  select id into v_cat_app from categories where tenant_id = v_tenant and name = 'Appetizers';
  select id into v_cat_bur from categories where tenant_id = v_tenant and name = 'Burgers';
  select id into v_cat_grl from categories where tenant_id = v_tenant and name = 'Crunch and Grilled Burgers';
  select id into v_cat_san from categories where tenant_id = v_tenant and name = 'Sandwiches and Panini';
  select id into v_cat_shw from categories where tenant_id = v_tenant and name = 'Shawarma and Wrap';
  select id into v_cat_prt from categories where tenant_id = v_tenant and name = 'Paratha Roll';
  select id into v_cat_fri from categories where tenant_id = v_tenant and name = 'Fries';

  -- ── menu items (37, exact names + prices) ───────────────────────────────
  -- idempotent: skipped entirely when the tenant already has items
  if not exists (select 1 from menu_items where tenant_id = v_tenant) then
  -- Appetizers
  insert into menu_items (tenant_id, category_id, name, description, price, badges, sort, available) values
    (v_tenant, v_cat_app, 'Crispy Hot Wings', 'Crispy fried chicken wings, spicy and savory', 500, '{}', 1, true);

  -- Burgers
  insert into menu_items (tenant_id, category_id, name, description, price, badges, sort, available) values
    (v_tenant, v_cat_bur, 'Shami Burger',        'Pan-fried lentil patty in bun', 200, '{popular}',   1, true),
    (v_tenant, v_cat_bur, 'Shami Lapata Burger','Lentil patty with egg',          300, '{}',          2, true),
    (v_tenant, v_cat_bur, 'Double Anda Shami',  'Egg and lentil patty',           250, '{}',          3, true),
    (v_tenant, v_cat_bur, 'Round Shami Burger', 'Round shami patty in a soft bun',250, '{}',          4, true),
    (v_tenant, v_cat_bur, 'Chicken Burger',     'Juicy chicken patty',            400, '{}',          5, true),
    (v_tenant, v_cat_bur, 'Zinger Burger',      'Crispy fried chicken',           450, '{bestseller}',6, true),
    (v_tenant, v_cat_bur, 'Patty Burger',       'Pan-fried patty',                400, '{}',          7, true);

  -- Crunch and Grilled Burgers
  insert into menu_items (tenant_id, category_id, name, description, price, badges, sort, available) values
    (v_tenant, v_cat_grl, 'Grilled Chi. Burger',    'Grilled chicken burger',              600, '{}', 1, true),
    (v_tenant, v_cat_grl, 'Grilled Cocktail Burger','Grilled cocktail-style burger',       700, '{}', 2, true),
    (v_tenant, v_cat_grl, 'Grilled Beef Burger',    'Grilled beef patty burger',           600, '{}', 3, true),
    (v_tenant, v_cat_grl, 'Tikka Burger',           'Grilled marinated chicken, spicy',    500, '{}', 4, true),
    (v_tenant, v_cat_grl, 'Smocky Burger',          'Smoky flavoured burger',              500, '{}', 5, true),
    (v_tenant, v_cat_grl, 'Grilled Patty Burger',   'Grilled pan-fried patty burger',      550, '{}', 6, true),
    (v_tenant, v_cat_grl, 'Crispy Chicken Burger',  'Crispy fried chicken fillet burger',  600, '{}', 7, true);

  -- Sandwiches and Panini
  insert into menu_items (tenant_id, category_id, name, description, price, badges, sort, available) values
    (v_tenant, v_cat_san, 'Shami Sandwich',       'Toasted, lentil-meat patty', 270, '{}', 1, true),
    (v_tenant, v_cat_san, 'Chicken Sandwich',     'Chicken filling sandwich',   500, '{}', 2, true),
    (v_tenant, v_cat_san, 'Club Sandwich',        'Chicken and egg layered',    600, '{}', 3, true),
    (v_tenant, v_cat_san, 'Zinger Sandwich',      'Crispy zinger sandwich',     600, '{}', 4, true),
    (v_tenant, v_cat_san, 'Grilled Club Sandwich','Grilled chicken and egg club',650,'{}', 5, true),
    (v_tenant, v_cat_san, 'Grilled Sandwich',     'Grilled sandwich',           650, '{}', 6, true);

  -- Shawarma and Wrap
  insert into menu_items (tenant_id, category_id, name, description, price, badges, sort, available) values
    (v_tenant, v_cat_shw, 'Chicken Shawarma',        'Classic chicken shawarma',      300, '{bestseller}', 1, true),
    (v_tenant, v_cat_shw, 'Zinger Shawarma',         'Crispy zinger shawarma',        400, '{}',            2, true),
    (v_tenant, v_cat_shw, 'Grilled Shawarma',        'Grilled chicken shawarma',      500, '{}',            3, true),
    (v_tenant, v_cat_shw, 'Chi. Shawarma Plater',    'Large chicken shawarma platter',750, '{}',            4, true),
    (v_tenant, v_cat_shw, 'Grilled Plater',          'Grilled platter',               800, '{}',            5, true),
    (v_tenant, v_cat_shw, 'Grilled BarBQ Wrap',      'Grilled BBQ wrap',              750, '{}',            6, true),
    (v_tenant, v_cat_shw, 'Grilled Usama Special Wrap','Usama special grilled wrap',  800, '{}',            7, true);

  -- Paratha Roll
  insert into menu_items (tenant_id, category_id, name, description, price, badges, sort, available) values
    (v_tenant, v_cat_prt, 'Bar BQ Paratha Roll',        'BBQ filling in flaky paratha',      680, '{}', 1, true),
    (v_tenant, v_cat_prt, 'Grilled Chicken Paratha Roll','Grilled chicken paratha roll',     550, '{}', 2, true),
    (v_tenant, v_cat_prt, 'Chicken Paratha Roll',       'Chicken paratha roll',               480, '{}', 3, true),
    (v_tenant, v_cat_prt, 'Zinger Paratha Roll',        'Crispy zinger paratha roll',         550, '{}', 4, true);

  -- Fries
  insert into menu_items (tenant_id, category_id, name, description, price, badges, sort, available) values
    (v_tenant, v_cat_fri, 'Plain Fries',      'Classic salted fries', 300, '{}',        1, true),
    (v_tenant, v_cat_fri, 'Masala Fries',     'Spicy masala fries',   350, '{}',        2, true),
    (v_tenant, v_cat_fri, 'Loaded Fries',     'Fries with melted cheese', 500, '{popular}', 3, true),
    (v_tenant, v_cat_fri, 'Garlic Mayo Fries','Fries with garlic mayo',350,'{}',        4, true),
    (v_tenant, v_cat_fri, 'BarBQ Fries',      'Fries with BBQ sauce', 350, '{}',        5, true);
  end if;

  -- ── delivery zones (2) ──────────────────────────────────────────────────
  if not exists (select 1 from delivery_zones where tenant_id = v_tenant) then
  insert into delivery_zones (tenant_id, name, areas, fee, min_order, free_above, active, sort) values
    (v_tenant, 'Johar Town',   '{Johar Town}',   150, 300, 1500, true, 1),
    (v_tenant, 'Nearby Areas', '{Nearby Areas}', 250, 500, 2000, true, 2)
  on conflict do nothing;
  end if;

  -- ── coupon ──────────────────────────────────────────────────────────────
  insert into coupons (tenant_id, code, type, value, min_order, max_uses, active) values
    (v_tenant, 'WELCOME10', 'percent', 10, 500, 100, true)
  on conflict (tenant_id, code) do nothing;

  raise notice 'Seeded tenant usama-burgers: %', v_tenant;
end $$;
