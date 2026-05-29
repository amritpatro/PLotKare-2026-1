create index if not exists idx_employees_vendor_id
  on public.employees(vendor_id) where vendor_id is not null;
create index if not exists idx_inspection_photos_agent_employee_id
  on public.inspection_photos(agent_employee_id) where agent_employee_id is not null;
create index if not exists idx_inspection_photos_owner_id
  on public.inspection_photos(owner_id);
create index if not exists idx_inspection_photos_plot_id
  on public.inspection_photos(plot_id) where plot_id is not null;
create index if not exists idx_inspection_photos_report_id
  on public.inspection_photos(report_id) where report_id is not null;
create index if not exists idx_inspection_photos_active_amenity_id
  on public.inspection_photos(active_amenity_id) where active_amenity_id is not null;
create index if not exists idx_inspection_reports_reviewed_by
  on public.inspection_reports(reviewed_by) where reviewed_by is not null;
create index if not exists idx_inspection_checklist_answers_created_by
  on public.inspection_checklist_answers(created_by);
create index if not exists idx_inspection_flags_inspection_id
  on public.inspection_flags(inspection_id);
create index if not exists idx_inspection_flags_photo_id
  on public.inspection_flags(photo_id) where photo_id is not null;
create index if not exists idx_inspection_flags_raised_by
  on public.inspection_flags(raised_by);
create index if not exists idx_inspection_document_checks_document_id
  on public.inspection_document_checks(document_id) where document_id is not null;
create index if not exists idx_inspection_document_checks_created_by
  on public.inspection_document_checks(created_by);
create index if not exists idx_inspection_amenity_checks_active_amenity_id
  on public.inspection_amenity_checks(active_amenity_id);
create index if not exists idx_inspection_amenity_checks_photo_id
  on public.inspection_amenity_checks(photo_id) where photo_id is not null;
create index if not exists idx_inspection_amenity_checks_created_by
  on public.inspection_amenity_checks(created_by);

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
