drop policy if exists "reports_released_owner_or_admin_select" on public.inspection_reports;
drop policy if exists "reports_released_owner_or_field_select" on public.inspection_reports;
drop policy if exists "reports_admin_write" on public.inspection_reports;
drop policy if exists "reports_access_select" on public.inspection_reports;
drop policy if exists "reports_admin_insert" on public.inspection_reports;
drop policy if exists "reports_admin_update" on public.inspection_reports;
drop policy if exists "reports_admin_delete" on public.inspection_reports;

create policy "reports_access_select" on public.inspection_reports
for select to authenticated
using (
  app_private.is_admin()
  or (owner_id = (select auth.uid()) and delivery_status = 'released')
  or (inspection_id is not null and app_private.is_assigned_field_agent(inspection_id))
);

create policy "reports_admin_insert" on public.inspection_reports
for insert to authenticated
with check (app_private.is_admin());

create policy "reports_admin_update" on public.inspection_reports
for update to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create policy "reports_admin_delete" on public.inspection_reports
for delete to authenticated
using (app_private.is_admin());
