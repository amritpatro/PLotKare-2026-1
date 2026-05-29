-- Field inspection execution, evidence integrity, and released report delivery.

alter table public.employees
  add column if not exists worker_type text not null default 'internal'
    check (worker_type in ('internal', 'vendor')),
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null,
  add column if not exists assigned_corridor text;

alter table public.properties
  add column if not exists coordinates_confirmed_at timestamptz,
  add column if not exists coordinates_confirmed_by uuid references public.profiles(id) on delete set null,
  add column if not exists coordinates_source text
    check (coordinates_source is null or coordinates_source in ('admin_verified', 'survey_verified', 'gps_verified'));

create index if not exists idx_properties_coordinates_confirmed_by
  on public.properties(coordinates_confirmed_by) where coordinates_confirmed_by is not null;
create index if not exists idx_properties_field_coordinate_ready
  on public.properties(verification_status, coordinates_confirmed_at)
  where latitude is not null and longitude is not null;

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.inspections'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';

  if constraint_name is not null then
    execute format('alter table public.inspections drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.inspections
  add column if not exists inspection_reference text,
  add column if not exists workflow_step text not null default 'briefing'
    check (workflow_step in ('briefing', 'arrival', 'photos', 'checklist', 'documents', 'amenities', 'review', 'submitted')),
  add column if not exists plan_snapshot text not null default 'basic',
  add column if not exists requirements_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists target_latitude numeric,
  add column if not exists target_longitude numeric,
  add column if not exists proximity_radius_meters integer not null default 50 check (proximity_radius_meters between 10 and 500),
  add column if not exists arrival_latitude numeric,
  add column if not exists arrival_longitude numeric,
  add column if not exists arrival_accuracy_meters numeric,
  add column if not exists arrival_distance_meters numeric,
  add column if not exists arrival_captured_at timestamptz,
  add column if not exists arrival_verified boolean not null default false,
  add column if not exists started_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists sync_status text not null default 'server'
    check (sync_status in ('server', 'offline_saved', 'syncing', 'synced', 'retry_required'));

update public.inspections
set inspection_reference = 'PKI-' || upper(substr(replace(id::text, '-', ''), 1, 10))
where inspection_reference is null;

alter table public.inspections
  alter column inspection_reference set default ('PKI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  alter column inspection_reference set not null;

alter table public.inspections
  drop constraint if exists inspections_status_check,
  add constraint inspections_status_check check (
    status in (
      'requested', 'scheduled', 'in_progress', 'submitted', 'under_review',
      'approved', 'correction_required', 'rejected', 'delivered',
      'completed', 'cancelled', 'needs_followup'
    )
  );

create unique index if not exists idx_inspections_reference on public.inspections(inspection_reference);
create index if not exists idx_inspections_field_queue
  on public.inspections(assigned_employee_id, scheduled_for, status);
create index if not exists idx_employees_vendor_id
  on public.employees(vendor_id) where vendor_id is not null;

create table if not exists public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  report_id uuid references public.inspection_reports(id) on delete set null,
  bucket text not null default 'inspection-photos',
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  latitude numeric,
  longitude numeric,
  captured_at timestamptz,
  caption text,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

alter table public.inspection_photos enable row level security;

alter table public.inspection_photos
  add column if not exists inspection_id uuid references public.inspections(id) on delete cascade,
  add column if not exists agent_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists direction text
    check (direction is null or direction in ('north', 'south', 'east', 'west', 'issue', 'amenity')),
  add column if not exists subject text not null default 'boundary'
    check (subject in ('boundary', 'issue', 'amenity')),
  add column if not exists accuracy_meters numeric,
  add column if not exists note text,
  add column if not exists active_amenity_id uuid references public.active_amenities(id) on delete set null,
  add column if not exists compressed_size_bytes bigint,
  add column if not exists upload_status text not null default 'finalized'
    check (upload_status in ('prepared', 'finalized', 'failed')),
  add column if not exists finalized_at timestamptz;

create index if not exists idx_inspection_photos_session
  on public.inspection_photos(inspection_id, direction, created_at);
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

alter table public.inspection_reports
  add column if not exists inspection_id uuid references public.inspections(id) on delete set null,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists review_notes text,
  add column if not exists approved_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists delivery_status text not null default 'pending_review'
    check (delivery_status in ('pending_review', 'correction_required', 'rejected', 'approved', 'released')),
  add column if not exists email_delivery_status text not null default 'not_ready'
    check (email_delivery_status in ('not_ready', 'pending', 'sent', 'skipped', 'failed')),
  add column if not exists delivery_error text;

update public.inspection_reports
set delivery_status = case when status in ('Completed', 'Action Needed') then 'released' else delivery_status end,
    released_at = case when status in ('Completed', 'Action Needed') then coalesce(released_at, updated_at, created_at) else released_at end
where delivery_status = 'pending_review';

create unique index if not exists idx_inspection_reports_session
  on public.inspection_reports(inspection_id)
  where inspection_id is not null;
create index if not exists idx_inspection_reports_reviewed_by
  on public.inspection_reports(reviewed_by) where reviewed_by is not null;

create table if not exists public.inspection_checklist_answers (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  question_code text not null,
  answer boolean not null,
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inspection_id, question_code)
);

create table if not exists public.inspection_flags (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  flag_type text not null check (
    flag_type in ('encroachment', 'access', 'vegetation', 'waste', 'water_logging', 'survey_marker', 'document_due', 'amenity_issue', 'other')
  ),
  severity text not null default 'normal' check (severity in ('normal', 'high', 'urgent')),
  description text not null,
  photo_id uuid references public.inspection_photos(id) on delete set null,
  raised_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_document_checks (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  document_id uuid references public.property_documents(id) on delete set null,
  label text not null,
  observed_status text,
  result text not null check (result in ('confirmed', 'reminder', 'review_needed')),
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (inspection_id, label)
);

create table if not exists public.inspection_amenity_checks (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  active_amenity_id uuid not null references public.active_amenities(id) on delete cascade,
  condition text not null check (condition in ('good', 'needs_attention', 'damaged', 'not_found')),
  note text,
  photo_id uuid references public.inspection_photos(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inspection_id, active_amenity_id)
);

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

drop trigger if exists inspection_checklist_answers_updated_at on public.inspection_checklist_answers;
create trigger inspection_checklist_answers_updated_at before update on public.inspection_checklist_answers
for each row execute function public.touch_updated_at();
drop trigger if exists inspection_flags_updated_at on public.inspection_flags;
create trigger inspection_flags_updated_at before update on public.inspection_flags
for each row execute function public.touch_updated_at();
drop trigger if exists inspection_amenity_checks_updated_at on public.inspection_amenity_checks;
create trigger inspection_amenity_checks_updated_at before update on public.inspection_amenity_checks
for each row execute function public.touch_updated_at();

create or replace function app_private.is_assigned_field_agent(check_inspection_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.inspections i
    join public.employees e on e.id = i.assigned_employee_id
    where i.id = check_inspection_id
      and e.profile_id = check_user_id
      and e.active = true
      and e.employee_role = 'field_inspection_agent'
  );
$$;

create or replace function app_private.is_released_inspection_owner(check_inspection_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.inspections i
    join public.properties p on p.id = i.property_id
    join public.inspection_reports r on r.inspection_id = i.id
    where i.id = check_inspection_id
      and p.owner_profile_id = check_user_id
      and r.delivery_status = 'released'
  );
$$;

create or replace function public.prevent_finalized_field_evidence_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.upload_status = 'finalized' and (
    new.object_path is distinct from old.object_path
    or new.inspection_id is distinct from old.inspection_id
    or new.agent_employee_id is distinct from old.agent_employee_id
    or new.direction is distinct from old.direction
    or new.subject is distinct from old.subject
    or new.latitude is distinct from old.latitude
    or new.longitude is distinct from old.longitude
    or new.accuracy_meters is distinct from old.accuracy_meters
    or new.captured_at is distinct from old.captured_at
    or new.compressed_size_bytes is distinct from old.compressed_size_bytes
  ) then
    raise exception 'Finalized inspection evidence metadata is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_finalized_field_evidence on public.inspection_photos;
create trigger protect_finalized_field_evidence before update on public.inspection_photos
for each row execute function public.prevent_finalized_field_evidence_change();

create or replace function public.prevent_verified_arrival_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.arrival_captured_at is not null and (
    new.arrival_latitude is distinct from old.arrival_latitude
    or new.arrival_longitude is distinct from old.arrival_longitude
    or new.arrival_accuracy_meters is distinct from old.arrival_accuracy_meters
    or new.arrival_distance_meters is distinct from old.arrival_distance_meters
    or new.arrival_captured_at is distinct from old.arrival_captured_at
    or new.arrival_verified is distinct from old.arrival_verified
  ) then
    raise exception 'Inspection arrival evidence is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_verified_arrival on public.inspections;
create trigger protect_verified_arrival before update on public.inspections
for each row execute function public.prevent_verified_arrival_change();

alter table public.inspection_checklist_answers enable row level security;
alter table public.inspection_flags enable row level security;
alter table public.inspection_document_checks enable row level security;
alter table public.inspection_amenity_checks enable row level security;

drop policy if exists "inspections_employee_update" on public.inspections;
create policy "inspections_admin_update" on public.inspections
for update to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "reports_owner_select" on public.inspection_reports;
drop policy if exists "reports_admin_write" on public.inspection_reports;
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

drop policy if exists "inspection_photos_owner_select" on public.inspection_photos;
drop policy if exists "inspection_photos_owner_insert" on public.inspection_photos;
drop policy if exists "inspection_photos_owner_update" on public.inspection_photos;
drop policy if exists "inspection_photos_owner_delete" on public.inspection_photos;
create policy "inspection_photos_field_or_released_read" on public.inspection_photos
for select to authenticated
using (
  app_private.is_admin()
  or (inspection_id is not null and app_private.is_assigned_field_agent(inspection_id))
  or (inspection_id is not null and app_private.is_released_inspection_owner(inspection_id))
);

create policy "inspection_checklist_access_select" on public.inspection_checklist_answers
for select to authenticated
using (
  app_private.is_admin()
  or app_private.is_assigned_field_agent(inspection_id)
  or app_private.is_released_inspection_owner(inspection_id)
);
create policy "inspection_flags_access_select" on public.inspection_flags
for select to authenticated
using (
  app_private.is_admin()
  or app_private.is_assigned_field_agent(inspection_id)
  or app_private.is_released_inspection_owner(inspection_id)
);
create policy "inspection_document_checks_access_select" on public.inspection_document_checks
for select to authenticated
using (
  app_private.is_admin()
  or app_private.is_assigned_field_agent(inspection_id)
  or app_private.is_released_inspection_owner(inspection_id)
);
create policy "inspection_amenity_checks_access_select" on public.inspection_amenity_checks
for select to authenticated
using (
  app_private.is_admin()
  or app_private.is_assigned_field_agent(inspection_id)
  or app_private.is_released_inspection_owner(inspection_id)
);

drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert" on public.notifications
for insert to authenticated
with check (app_private.is_admin());

grant select on public.inspection_checklist_answers, public.inspection_flags, public.inspection_document_checks, public.inspection_amenity_checks to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('inspection-photos', 'inspection-photos', false, 819200, array['image/jpeg', 'image/webp']),
  ('inspection-reports', 'inspection-reports', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "inspection_photo_owner_read" on storage.objects;
drop policy if exists "inspection_photo_owner_insert" on storage.objects;
drop policy if exists "inspection_photo_owner_update" on storage.objects;
drop policy if exists "inspection_photo_owner_delete" on storage.objects;

drop policy if exists "private_owner_file_read" on storage.objects;
create policy "private_owner_file_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

drop policy if exists "owner_file_insert" on storage.objects;
create policy "owner_file_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('plot-images', 'profile-assets', 'documents')
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "owner_file_update" on storage.objects;
create policy "owner_file_update" on storage.objects
for update to authenticated
using (
  bucket_id in ('plot-images', 'profile-assets', 'documents')
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
)
with check (
  bucket_id in ('plot-images', 'profile-assets', 'documents')
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

drop policy if exists "owner_file_delete" on storage.objects;
create policy "owner_file_delete" on storage.objects
for delete to authenticated
using (
  bucket_id in ('plot-images', 'profile-assets', 'documents')
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

do $$
begin
  alter publication supabase_realtime add table public.inspection_photos;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.inspection_checklist_answers;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.inspection_flags;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.inspection_document_checks;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.inspection_amenity_checks;
exception when duplicate_object then null; when undefined_object then null;
end $$;
