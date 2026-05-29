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
