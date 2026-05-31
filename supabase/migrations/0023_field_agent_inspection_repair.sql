-- Field agent inspection repair: non-destructive columns/indexes for GPS arrival,
-- photo sync, submitted review state, and report release metadata.

alter table public.plots
  add column if not exists target_latitude numeric,
  add column if not exists target_longitude numeric,
  add column if not exists coordinates_confirmed_at timestamptz,
  add column if not exists coordinates_confirmed_by uuid references public.profiles(id) on delete set null;

alter table public.inspections
  add column if not exists inspection_reference text,
  add column if not exists workflow_step text not null default 'briefing',
  add column if not exists target_latitude numeric,
  add column if not exists target_longitude numeric,
  add column if not exists proximity_radius_meters integer not null default 150,
  add column if not exists arrival_latitude numeric,
  add column if not exists arrival_longitude numeric,
  add column if not exists arrival_accuracy_meters numeric,
  add column if not exists arrival_distance_meters numeric,
  add column if not exists arrival_captured_at timestamptz,
  add column if not exists arrival_verified boolean not null default false,
  add column if not exists arrival_outside_radius boolean not null default false,
  add column if not exists started_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists review_notes text,
  add column if not exists sync_status text not null default 'server';

alter table public.inspection_photos
  add column if not exists inspection_id uuid references public.inspections(id) on delete cascade,
  add column if not exists agent_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists direction text,
  add column if not exists subject text,
  add column if not exists accuracy_meters numeric,
  add column if not exists note text,
  add column if not exists active_amenity_id uuid references public.active_amenities(id) on delete set null,
  add column if not exists compressed_size_bytes bigint,
  add column if not exists upload_status text not null default 'pending',
  add column if not exists uploaded_at timestamptz,
  add column if not exists finalized_at timestamptz;

alter table public.inspection_reports
  add column if not exists inspection_id uuid references public.inspections(id) on delete set null,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists review_notes text,
  add column if not exists approved_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists owner_visible boolean not null default false,
  add column if not exists admin_approved boolean not null default false,
  add column if not exists delivery_status text not null default 'pending_review',
  add column if not exists email_delivery_status text not null default 'not_ready',
  add column if not exists delivery_error text;

alter table public.employees
  add column if not exists active boolean not null default true;

create index if not exists idx_inspections_workflow_step on public.inspections(workflow_step);
create index if not exists idx_inspections_assignee_status on public.inspections(assigned_employee_id, status, workflow_step);
create index if not exists idx_inspections_plot_target on public.inspections(plot_id, target_latitude, target_longitude);
create index if not exists idx_inspection_photos_inspection_direction on public.inspection_photos(inspection_id, direction);
create index if not exists idx_inspection_photos_upload_status on public.inspection_photos(upload_status);
create index if not exists idx_inspection_reports_inspection_id on public.inspection_reports(inspection_id);
create index if not exists idx_inspection_reports_release on public.inspection_reports(admin_approved, owner_visible, delivery_status);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspection-photos', 'inspection-photos', false, 900000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

update public.plots p
set target_latitude = coalesce(p.target_latitude, pr.latitude),
    target_longitude = coalesce(p.target_longitude, pr.longitude)
from public.properties pr
where p.property_id = pr.id
  and (p.target_latitude is null or p.target_longitude is null)
  and pr.latitude is not null
  and pr.longitude is not null;

update public.inspections i
set target_latitude = coalesce(i.target_latitude, pr.latitude),
    target_longitude = coalesce(i.target_longitude, pr.longitude),
    proximity_radius_meters = coalesce(i.proximity_radius_meters, 150)
from public.properties pr
where i.property_id = pr.id
  and (i.target_latitude is null or i.target_longitude is null)
  and pr.latitude is not null
  and pr.longitude is not null;
