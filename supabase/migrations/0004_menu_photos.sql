-- 0004_menu_photos.sql - starter dish photos for the Usama Burgers pilot.
-- These are AI-generated placeholder photos committed in apps/web/public/menu/.
-- Replace with real dish photography anytime via the admin menu manager (photo_url),
-- or upload to the menu-photos Supabase Storage bucket and paste the URL.
-- Idempotent: safe to re-run.

do $$
declare v_tenant uuid;
begin
  select id into v_tenant from tenants where slug = 'usama-burgers';
  if v_tenant is null then
    raise notice 'tenant usama-burgers not found, skipping photo seed';
    return;
  end if;

  update menu_items set photo_url = '/menu/shami-burger.jpg'
    where tenant_id = v_tenant and name in
    ('Shami Burger','Shami Lapata Burger','Double Anda Shami','Round Shami Burger');

  update menu_items set photo_url = '/menu/zinger-burger.jpg'
    where tenant_id = v_tenant and name = 'Zinger Burger';

  update menu_items set photo_url = '/menu/chicken-burger.jpg'
    where tenant_id = v_tenant and name in ('Chicken Burger','Patty Burger');

  update menu_items set photo_url = '/menu/grilled-chicken-burger.jpg'
    where tenant_id = v_tenant and name in
    ('Grilled Chi. Burger','Grilled Cocktail Burger','Grilled Patty Burger','Crispy Chicken Burger');

  update menu_items set photo_url = '/menu/beef-burger.jpg'
    where tenant_id = v_tenant and name = 'Grilled Beef Burger';

  update menu_items set photo_url = '/menu/tikka-burger.jpg'
    where tenant_id = v_tenant and name in ('Tikka Burger','Smocky Burger');

  update menu_items set photo_url = '/menu/hot-wings.jpg'
    where tenant_id = v_tenant and name = 'Crispy Hot Wings';

  update menu_items set photo_url = '/menu/chicken-sandwich.jpg'
    where tenant_id = v_tenant and name in ('Chicken Sandwich','Grilled Sandwich');

  update menu_items set photo_url = '/menu/club-sandwich.jpg'
    where tenant_id = v_tenant and name in ('Club Sandwich','Grilled Club Sandwich');

  update menu_items set photo_url = '/menu/shami-sandwich.jpg'
    where tenant_id = v_tenant and name = 'Shami Sandwich';

  update menu_items set photo_url = '/menu/zinger-sandwich.jpg'
    where tenant_id = v_tenant and name = 'Zinger Sandwich';

  update menu_items set photo_url = '/menu/chicken-shawarma.jpg'
    where tenant_id = v_tenant and name = 'Chicken Shawarma';

  update menu_items set photo_url = '/menu/zinger-shawarma.jpg'
    where tenant_id = v_tenant and name = 'Zinger Shawarma';

  update menu_items set photo_url = '/menu/shawarma-platter.jpg'
    where tenant_id = v_tenant and name in
    ('Grilled Shawarma','Chi. Shawarma Plater','Grilled Plater');

  update menu_items set photo_url = '/menu/bbq-wrap.jpg'
    where tenant_id = v_tenant and name in
    ('Grilled BarBQ Wrap','Grilled Usama Special Wrap');

  update menu_items set photo_url = '/menu/paratha-roll.jpg'
    where tenant_id = v_tenant and name in
    ('Bar BQ Paratha Roll','Grilled Chicken Paratha Roll','Chicken Paratha Roll','Zinger Paratha Roll');

  update menu_items set photo_url = '/menu/fries.jpg'
    where tenant_id = v_tenant and name in ('Plain Fries','BarBQ Fries');

  update menu_items set photo_url = '/menu/masala-fries.jpg'
    where tenant_id = v_tenant and name = 'Masala Fries';

  update menu_items set photo_url = '/menu/loaded-fries.jpg'
    where tenant_id = v_tenant and name in ('Loaded Fries','Garlic Mayo Fries');
end $$;
