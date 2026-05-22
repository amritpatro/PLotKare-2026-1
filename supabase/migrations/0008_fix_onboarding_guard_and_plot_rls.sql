-- Day 3 QA hardening:
-- 1. Keep seller/customer plot visibility aligned with the newer seller/customer lifecycle.
-- 2. Middleware enforces onboarding in app code; this migration covers the database side.

drop policy if exists "plots_owner_select" on public.plots;
drop policy if exists "plots_owner_insert" on public.plots;
drop policy if exists "plots_owner_update" on public.plots;
drop policy if exists "plots_owner_delete" on public.plots;

create policy "plots_participant_select"
  on public.plots for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or app_private.is_admin()
    or app_private.is_seller_record(seller_id)
    or app_private.is_customer_record(reserved_customer_id)
    or app_private.is_customer_record(sold_customer_id)
    or (property_id is not null and app_private.can_access_property(property_id))
  );

create policy "plots_owner_seller_insert"
  on public.plots for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    or app_private.is_seller_record(seller_id)
    or app_private.is_admin()
  );

create policy "plots_owner_seller_update"
  on public.plots for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    or app_private.is_seller_record(seller_id)
    or app_private.is_admin()
  )
  with check (
    owner_id = (select auth.uid())
    or app_private.is_seller_record(seller_id)
    or app_private.is_admin()
  );

create policy "plots_owner_seller_delete"
  on public.plots for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    or app_private.is_seller_record(seller_id)
    or app_private.is_admin()
  );
