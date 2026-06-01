-- Complete field inspection access controls and compatibility columns.

alter table public.inspections
  add column if not exists arrival_time timestamptz;

alter table public.inspection_reports
  add column if not exists pdf_path text;

alter table public.employees
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

update public.employees
set user_id = profile_id
where user_id is null;

create index if not exists idx_employees_user_id on public.employees(user_id);

drop policy if exists "agent_own_inspection_photos" on public.inspection_photos;
drop policy if exists "agent_own_photos" on public.inspection_photos;
drop policy if exists "admin_all_photos" on public.inspection_photos;
drop policy if exists "employee_view_photos" on public.inspection_photos;
drop policy if exists "employee_view_submitted_photos" on public.inspection_photos;
drop policy if exists "owner_view_approved_photos" on public.inspection_photos;

create policy "agent_own_photos" on public.inspection_photos
  for all to authenticated
  using (
    exists (
      select 1
      from public.inspections i
      join public.employees e on i.assigned_employee_id = e.id
      where i.id = inspection_photos.inspection_id
        and coalesce(e.user_id, e.profile_id) = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.inspections i
      join public.employees e on i.assigned_employee_id = e.id
      where i.id = inspection_photos.inspection_id
        and coalesce(e.user_id, e.profile_id) = auth.uid()
    )
  );

create policy "admin_all_photos" on public.inspection_photos
  for all to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "employee_view_submitted_photos" on public.inspection_photos
  for select to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'employee'
    and exists (
      select 1
      from public.inspections i
      where i.id = inspection_photos.inspection_id
        and i.workflow_step in ('submitted', 'reviewed', 'approved', 'delivered', 'rejected')
    )
  );

create policy "owner_view_approved_photos" on public.inspection_photos
  for select to authenticated
  using (
    exists (
      select 1
      from public.inspections i
      left join public.plots p on i.plot_id = p.id
      left join public.properties prop on i.property_id = prop.id
      join public.inspection_reports ir on ir.inspection_id = i.id
      where i.id = inspection_photos.inspection_id
        and (p.owner_id = auth.uid() or prop.owner_profile_id = auth.uid())
        and ir.admin_approved = true
        and ir.owner_visible = true
    )
  );

drop policy if exists "admin_full_storage_access" on storage.objects;
drop policy if exists "agent_own_storage_upload" on storage.objects;
drop policy if exists "service_role_full_access" on storage.objects;

create policy "admin_full_storage_access" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'inspection-photos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  )
  with check (
    bucket_id = 'inspection-photos'
    and (select role from public.profiles where id = auth.uid()) = 'admin'
  );

create policy "agent_own_storage_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'inspection-photos'
    and (storage.foldername(name))[1] = 'inspections'
  );

create policy "service_role_full_access" on storage.objects
  for all to service_role
  using (true)
  with check (true);
