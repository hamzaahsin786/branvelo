-- Mezban security hardening (Phase 1 audit follow-ups)

-- ─── 1. Lock down next_order_no() ──────────────────────────────────────────
-- It is SECURITY DEFINER and was executable by PUBLIC: any anonymous caller
-- could burn per-tenant order numbers via supabase.rpc('next_order_no').
-- Only the API (service role) may call it now.
revoke all on function public.next_order_no(uuid) from public, anon, authenticated;
grant execute on function public.next_order_no(uuid) to service_role;

-- ─── 2. Atomic coupon-use claim ────────────────────────────────────────────
-- Replaces the API's read-then-write uses counter (which could overshoot
-- max_uses under concurrency). Single guarded UPDATE; returns true only
-- when a use was actually claimed.
create or replace function public.claim_coupon_use(p_tenant_id uuid, p_code text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_updated integer;
begin
  update public.coupons
     set uses = uses + 1
   where tenant_id = p_tenant_id
     and code = p_code
     and active = true
     and (max_uses is null or uses < max_uses)
     and (valid_from is null or valid_from <= now())
     and (valid_until is null or valid_until > now());
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.claim_coupon_use(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_coupon_use(uuid, text) to service_role;

-- Compensation for a claimed use when the order fails to save afterwards.
create or replace function public.release_coupon_use(p_tenant_id uuid, p_code text)
returns void
language plpgsql
security definer
as $$
begin
  update public.coupons
     set uses = greatest(uses - 1, 0)
   where tenant_id = p_tenant_id
     and code = p_code;
end;
$$;

revoke all on function public.release_coupon_use(uuid, text) from public, anon, authenticated;
grant execute on function public.release_coupon_use(uuid, text) to service_role;

-- ─── 3. Tighten menu-photos storage policies ───────────────────────────────
-- Before: ANY authenticated user could insert/update/delete ANY object in the
-- bucket. Now: only staff (rows in public.users) and only under their own
-- tenant's path prefix (<tenant_id>/...). Public reads unchanged.
drop policy if exists "menu-photos staff upload" on storage.objects;
drop policy if exists "menu-photos staff update" on storage.objects;
drop policy if exists "menu-photos staff delete" on storage.objects;

create policy "menu-photos staff upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-photos'
    and name like (
      select tenant_id::text from public.users where id = auth.uid() limit 1
    ) || '/%'
  );

create policy "menu-photos staff update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'menu-photos'
    and name like (
      select tenant_id::text from public.users where id = auth.uid() limit 1
    ) || '/%'
  )
  with check (
    bucket_id = 'menu-photos'
    and name like (
      select tenant_id::text from public.users where id = auth.uid() limit 1
    ) || '/%'
  );

create policy "menu-photos staff delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-photos'
    and name like (
      select tenant_id::text from public.users where id = auth.uid() limit 1
    ) || '/%'
  );
