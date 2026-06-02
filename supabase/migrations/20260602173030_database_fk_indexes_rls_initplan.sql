create index if not exists idx_admin_internal_notes_author_id
  on public.admin_internal_notes(author_id);
create index if not exists idx_admin_task_assignments_assigned_by
  on public.admin_task_assignments(assigned_by);
create index if not exists idx_amenity_service_requests_amenity_id
  on public.amenity_service_requests(amenity_id);
create index if not exists idx_amenity_service_requests_assigned_employee_id
  on public.amenity_service_requests(assigned_employee_id);
create index if not exists idx_amenity_service_requests_customer_id
  on public.amenity_service_requests(customer_id);
create index if not exists idx_amenity_service_requests_listing_id
  on public.amenity_service_requests(listing_id);
create index if not exists idx_listing_inquiries_customer_id
  on public.listing_inquiries(customer_id);
create index if not exists idx_listings_archived_by
  on public.listings(archived_by);
create index if not exists idx_plots_archived_by
  on public.plots(archived_by);
create index if not exists idx_profiles_suspended_by
  on public.profiles(suspended_by);
create index if not exists idx_properties_archived_by
  on public.properties(archived_by);
create index if not exists idx_saved_listings_customer_id
  on public.saved_listings(customer_id);
create index if not exists idx_site_visit_requests_assigned_employee_id
  on public.site_visit_requests(assigned_employee_id);
create index if not exists idx_site_visit_requests_customer_id
  on public.site_visit_requests(customer_id);
create index if not exists idx_site_visit_requests_inquiry_id
  on public.site_visit_requests(inquiry_id);
create index if not exists idx_verification_events_assigned_employee_id
  on public.verification_events(assigned_employee_id);

drop policy if exists "active_amenities_owner_all" on public.active_amenities;
create policy "active_amenities_owner_all"
  on public.active_amenities
  for all
  using ((select auth.uid()) = owner_id or app_private.is_admin())
  with check ((select auth.uid()) = owner_id or app_private.is_admin());

drop policy if exists "documents_owner_all" on public.documents;
create policy "documents_owner_all"
  on public.documents
  for all
  using ((select auth.uid()) = owner_id or app_private.is_admin())
  with check ((select auth.uid()) = owner_id or app_private.is_admin());
