-- Add property-type specific inspection templates without changing existing role or RLS models.

alter table public.inspections
  add column if not exists inspection_property_type text not null default 'vacant_plot';

do $$
begin
  alter table public.inspections
    add constraint inspections_inspection_property_type_check
    check (inspection_property_type in ('vacant_plot', 'apartment', 'house_villa', 'commercial')) not valid;
exception when duplicate_object then null;
end $$;

update public.inspections i
set inspection_property_type = case
  when lower(coalesce(nullif(p.asset_type, ''), p.property_kind::text, '')) = 'apartment' then 'apartment'
  when lower(coalesce(nullif(p.asset_type, ''), p.property_kind::text, '')) in ('house', 'villa', 'house_villa') then 'house_villa'
  when lower(coalesce(nullif(p.asset_type, ''), p.property_kind::text, '')) = 'commercial' then 'commercial'
  else 'vacant_plot'
end
from public.properties p
where i.property_id = p.id;

create index if not exists inspections_property_type_idx
  on public.inspections(property_id, inspection_property_type, created_at desc);

alter table public.inspection_photos
  drop constraint if exists inspection_photos_direction_check;

alter table public.inspection_photos
  add constraint inspection_photos_direction_check
  check (
    direction is null
    or direction in (
      'north',
      'south',
      'east',
      'west',
      'entrance',
      'main_room',
      'kitchen',
      'bathroom',
      'front',
      'rear',
      'interior',
      'roof',
      'garden',
      'facade',
      'issue',
      'amenity'
    )
    or direction like 'issue-%'
    or direction like 'amenity-%'
  ) not valid;

alter table public.inspection_photos
  drop constraint if exists inspection_photos_subject_check;

alter table public.inspection_photos
  add constraint inspection_photos_subject_check
  check (subject in ('boundary', 'site', 'interior', 'exterior', 'issue', 'amenity')) not valid;
