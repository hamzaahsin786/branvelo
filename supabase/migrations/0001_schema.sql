-- Mezban Phase 1 — core schema
-- Multi-tenant: every tenant row carries tenant_id. RLS enforces scoping.
-- Run in Supabase SQL editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ─── Tenants ────────────────────────────────────────────────────────────────
create table tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  logo_url      text,
  theme         jsonb not null default '{}'::jsonb,   -- {primary, accent, dark, ink, muted, fonts...}
  phone         text,
  email         text,
  address       text,
  latitude      double precision,
  longitude     double precision,
  hours         jsonb not null default '{}'::jsonb,   -- {timezone, days:{mon:{open:"12:00",close:"04:30"},...}} (close<=open = past midnight)
  announcement  text,
  status        text not null default 'active' check (status in ('active','paused','suspended')),
  plan          text not null default 'starter',
  tax_percent   numeric(5,2) not null default 0,
  created_at    timestamptz not null default now()
);

-- ─── Branches ───────────────────────────────────────────────────────────────
create table branches (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  address     text,
  phone       text,
  hours       jsonb not null default '{}'::jsonb,
  is_default  boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, name)
);

-- ─── Users (staff; id = auth.users.id) ──────────────────────────────────────
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  role        text not null check (role in ('owner','manager','cashier','kitchen','rider')),
  name        text,
  phone       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Menu ───────────────────────────────────────────────────────────────────
create table categories (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name      text not null,
  name_ur   text,
  tagline   text,
  icon      text,
  sort      integer not null default 0,
  active    boolean not null default true,
  unique (tenant_id, name)
);

create table menu_items (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  category_id  uuid not null references categories(id) on delete restrict,
  name         text not null,
  name_ur      text,
  description  text,
  price        integer not null check (price >= 0),   -- PKR, no decimals
  photo_url    text,
  badges       text[] not null default '{}',          -- bestseller | new | popular
  sort         integer not null default 0,
  available    boolean not null default true,
  prep_minutes integer
);

create table modifiers (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name      text not null,                             -- e.g. "Add cheese"
  required  boolean not null default false,
  multi     boolean not null default false,            -- allow multiple options
  sort      integer not null default 0
);

create table modifier_options (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  modifier_id uuid not null references modifiers(id) on delete cascade,
  name        text not null,
  price       integer not null default 0,
  sort        integer not null default 0
);

-- ─── Delivery zones ─────────────────────────────────────────────────────────
create table delivery_zones (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  name       text not null,
  areas      text[] not null default '{}',
  fee        integer not null default 0,              -- PKR
  min_order  integer not null default 0,              -- PKR
  free_above integer,                                 -- PKR; null = no free delivery
  active     boolean not null default true,
  sort       integer not null default 0
);

-- ─── Coupons ────────────────────────────────────────────────────────────────
create table coupons (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  code        text not null,
  type        text not null check (type in ('flat','percent')),
  value       integer not null check (value >= 0),    -- flat Rs, or percent
  min_order   integer not null default 0,
  max_uses    integer,
  uses        integer not null default 0,
  active      boolean not null default true,
  valid_from  timestamptz,
  valid_until timestamptz,
  created_at  timestamptz not null default now(),
  unique (tenant_id, code)
);

-- ─── Customers ──────────────────────────────────────────────────────────────
create table customers (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  name         text,
  phone        text not null,                          -- +92 normalized
  address      text,
  address_book jsonb not null default '[]'::jsonb,
  total_orders integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (tenant_id, phone)
);

-- ─── Orders ─────────────────────────────────────────────────────────────────
create table orders (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  branch_id       uuid references branches(id) on delete set null,
  order_no        integer not null,                    -- per-tenant sequence
  tracking_token  text not null unique,                -- public tracking id
  customer_id     uuid references customers(id) on delete set null,
  customer_name   text not null,
  customer_phone  text not null,
  customer_address text,
  type            text not null check (type in ('delivery','pickup')),
  status          text not null default 'placed'
                    check (status in ('placed','confirmed','preparing','ready','dispatched','delivered','cancelled','refunded')),
  items           jsonb not null default '[]'::jsonb,  -- snapshot [{menu_item_id,name,unit_price,qty,line_total}]
  subtotal        integer not null default 0,
  discount        integer not null default 0,
  delivery_fee    integer not null default 0,
  tax             integer not null default 0,
  total           integer not null default 0,
  zone_id         uuid references delivery_zones(id) on delete set null,
  coupon_code     text,
  payment_method  text not null check (payment_method in ('cod','jazzcash','easypaisa')),
  payment_ref     text,
  scheduled_for   timestamptz,
  notes           text,
  source          text not null default 'web',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, order_no)
);

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  name         text not null,
  unit_price   integer not null,
  qty          integer not null check (qty > 0),
  modifiers    jsonb not null default '[]'::jsonb,
  line_total   integer not null
);

create table order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor       text,                                    -- owner | system | diner
  note        text,
  created_at  timestamptz not null default now()
);

-- ─── Feedback / complaints ──────────────────────────────────────────────────
create table feedback (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  order_id   uuid references orders(id) on delete set null,
  type       text not null check (type in ('complaint','praise','suggestion')),
  name       text,
  phone      text,
  message    text not null,
  status     text not null default 'open' check (status in ('open','in_review','resolved')),
  created_at timestamptz not null default now()
);

-- ─── Per-tenant order number sequence ───────────────────────────────────────
create table tenant_order_sequences (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  last_no   integer not null default 0
);

create or replace function next_order_no(p_tenant_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_no integer;
begin
  insert into tenant_order_sequences (tenant_id, last_no)
  values (p_tenant_id, 1)
  on conflict (tenant_id)
  do update set last_no = tenant_order_sequences.last_no + 1
  returning last_no into v_no;
  return v_no;
end;
$$;

-- ─── updated_at trigger ─────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index categories_tenant_idx      on categories (tenant_id, sort);
create index menu_items_tenant_idx      on menu_items (tenant_id, category_id, sort);
create index modifiers_tenant_idx       on modifiers (tenant_id);
create index modifier_options_mod_idx   on modifier_options (modifier_id);
create index delivery_zones_tenant_idx  on delivery_zones (tenant_id, sort);
create index coupons_tenant_code_idx    on coupons (tenant_id, code);
create index customers_tenant_phone_idx on customers (tenant_id, phone);
create index orders_tenant_created_idx  on orders (tenant_id, created_at desc);
create index orders_tenant_status_idx   on orders (tenant_id, status);
create index order_items_order_idx      on order_items (order_id);
create index order_status_hist_order_idx on order_status_history (order_id, created_at);
create index feedback_tenant_idx        on feedback (tenant_id, created_at desc);
create index users_tenant_idx           on users (tenant_id);

-- ─── Row Level Security ─────────────────────────────────────────────────────
alter table tenants                  enable row level security;
alter table branches                 enable row level security;
alter table users                    enable row level security;
alter table categories               enable row level security;
alter table menu_items               enable row level security;
alter table modifiers                enable row level security;
alter table modifier_options         enable row level security;
alter table delivery_zones           enable row level security;
alter table coupons                  enable row level security;
alter table customers                enable row level security;
alter table orders                   enable row level security;
alter table order_items              enable row level security;
alter table order_status_history     enable row level security;
alter table feedback                 enable row level security;
alter table tenant_order_sequences   enable row level security;

-- helpers: who is calling, and which tenant do they belong to
create or replace function public.my_tenant_id()
returns uuid language sql security definer stable as $$
  select tenant_id from public.users where id = auth.uid() and active = true;
$$;

create or replace function public.my_role()
returns text language sql security definer stable as $$
  select role from public.users where id = auth.uid() and active = true;
$$;

-- Public storefront reads: active tenant's catalogue (anon + authenticated)
create policy tenants_public_read on tenants
  for select to anon, authenticated using (status = 'active');

create policy branches_public_read on branches
  for select to anon, authenticated
  using (active = true and exists (select 1 from tenants t where t.id = tenant_id and t.status = 'active'));

create policy categories_public_read on categories
  for select to anon, authenticated
  using (exists (select 1 from tenants t where t.id = tenant_id and t.status = 'active'));

create policy menu_items_public_read on menu_items
  for select to anon, authenticated
  using (exists (select 1 from tenants t where t.id = tenant_id and t.status = 'active'));

create policy modifiers_public_read on modifiers
  for select to anon, authenticated
  using (exists (select 1 from tenants t where t.id = tenant_id and t.status = 'active'));

create policy modifier_options_public_read on modifier_options
  for select to anon, authenticated
  using (exists (select 1 from tenants t where t.id = tenant_id and t.status = 'active'));

create policy zones_public_read on delivery_zones
  for select to anon, authenticated
  using (exists (select 1 from tenants t where t.id = tenant_id and t.status = 'active'));

create policy coupons_public_read on coupons
  for select to anon, authenticated
  using (active = true
         and (valid_until is null or valid_until > now())
         and exists (select 1 from tenants t where t.id = tenant_id and t.status = 'active'));

-- Feedback: anyone may submit for an active tenant (API rate-limits)
create policy feedback_public_insert on feedback
  for insert to anon, authenticated
  with check (exists (select 1 from tenants t where t.id = tenant_id and t.status = 'active'));

-- Staff reads: everything scoped to their tenant (writes go through the API/service role)
create policy users_self_read on users
  for select to authenticated using (id = auth.uid());

create policy tenant_staff_read on categories
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy tenant_staff_read_items on menu_items
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy tenant_staff_read_modifiers on modifiers
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy tenant_staff_read_modopts on modifier_options
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy tenant_staff_read_zones on delivery_zones
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy tenant_staff_read_coupons on coupons
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy tenant_staff_read_branches on branches
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy tenant_staff_read_tenant on tenants
  for select to authenticated using (id = public.my_tenant_id());

create policy staff_orders_read on orders
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy staff_order_items_read on order_items
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy staff_order_history_read on order_status_history
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy staff_feedback_read on feedback
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy staff_customers_read on customers
  for select to authenticated using (tenant_id = public.my_tenant_id());

-- NOTE: inserts/updates/deletes on orders, order_items, history, menu, zones,
-- coupons, customers and sequences are performed by the Next.js API routes
-- using the service-role key (bypasses RLS). No public write policies exist.

-- ─── Realtime: live order feed for the admin dashboard ──────────────────────
alter publication supabase_realtime add table orders;

-- Order-status broadcast channels (order:<tracking_token>) carry only
-- {status, order_no}; tokens are unguessable, so a permissive broadcast
-- policy is acceptable for Phase 1. The API sends via the service role;
-- the tracking page listens anonymously. (Polling is the fallback.)
create policy "order broadcast listen" on realtime.messages
  for select to anon, authenticated using (true);

-- ─── Storage: public bucket for menu photos ─────────────────────────────────
insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

create policy "menu-photos public read" on storage.objects
  for select using (bucket_id = 'menu-photos');

create policy "menu-photos staff upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'menu-photos');

create policy "menu-photos staff update" on storage.objects
  for update to authenticated using (bucket_id = 'menu-photos');

create policy "menu-photos staff delete" on storage.objects
  for delete to authenticated using (bucket_id = 'menu-photos');
