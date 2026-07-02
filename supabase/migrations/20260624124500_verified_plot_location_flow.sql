-- Verified plot location flow.
-- Owners can submit coordinates for review; only admins/service role can activate
-- the coordinates used for inspections and agent arrival proof.

alter table public.plots
  add column if not exists target_latitude numeric,
  add column if not exists target_longitude numeric,
  add column if not exists coordinates_confirmed_at timestamptz,
  add column if not exists coordinates_confirmed_by uuid references public.profiles(id) on delete set null,
  add column if not exists submitted_latitude numeric,
  add column if not exists submitted_longitude numeric,
  add column if not exists submitted_accuracy_meters numeric,
  add column if not exists location_source text,
  add column if not exists location_status text not null default 'not_set',
  add column if not exists location_note text,
  add column if not exists location_submitted_at timestamptz,
  add column if not exists address_landmark text,
  add column if not exists google_maps_link text,
  add column if not exists location_verified_at timestamptz,
  add column if not exists location_verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists location_adjusted_by_admin boolean not null default false;

do $$
begin
  alter table public.plots
    add constraint plots_target_latitude_range
    check (target_latitude is null or (target_latitude >= -90 and target_latitude <= 90)) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.plots
    add constraint plots_target_longitude_range
    check (target_longitude is null or (target_longitude >= -180 and target_longitude <= 180)) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.plots
    add constraint plots_submitted_latitude_range
    check (submitted_latitude is null or (submitted_latitude >= -90 and submitted_latitude <= 90)) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.plots
    add constraint plots_submitted_longitude_range
    check (submitted_longitude is null or (submitted_longitude >= -180 and submitted_longitude <= 180)) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.plots
    add constraint plots_submitted_accuracy_nonnegative
    check (submitted_accuracy_meters is null or submitted_accuracy_meters >= 0) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.plots
    add constraint plots_location_status_check
    check (location_status in ('not_set', 'pending_verification', 'verified', 'rejected')) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.plots
    add constraint plots_location_source_check
    check (location_source is null or location_source in ('owner_map_pin', 'owner_gps', 'owner_manual')) not valid;
exception when duplicate_object then null;
end $$;

create index if not exists idx_plots_location_status_submitted
  on public.plots(location_status, location_submitted_at desc);

create index if not exists idx_plots_owner_location_status
  on public.plots(owner_id, location_status, created_at desc);

alter table public.inspections
  add column if not exists arrival_outside_radius boolean not null default false;

update public.plots p
set
  target_latitude = coalesce(p.target_latitude, pr.latitude),
  target_longitude = coalesce(p.target_longitude, pr.longitude),
  submitted_latitude = coalesce(p.submitted_latitude, p.target_latitude, pr.latitude),
  submitted_longitude = coalesce(p.submitted_longitude, p.target_longitude, pr.longitude),
  location_source = coalesce(p.location_source, 'owner_manual'),
  location_status = 'verified',
  coordinates_confirmed_at = coalesce(p.coordinates_confirmed_at, pr.coordinates_confirmed_at, now()),
  coordinates_confirmed_by = coalesce(p.coordinates_confirmed_by, pr.coordinates_confirmed_by),
  location_verified_at = coalesce(p.location_verified_at, p.coordinates_confirmed_at, pr.coordinates_confirmed_at, now()),
  location_verified_by = coalesce(p.location_verified_by, p.coordinates_confirmed_by, pr.coordinates_confirmed_by),
  google_maps_link = coalesce(
    p.google_maps_link,
    'https://www.google.com/maps/dir/?api=1&destination=' ||
      coalesce(p.target_latitude, pr.latitude)::text || ',' ||
      coalesce(p.target_longitude, pr.longitude)::text
  )
from public.properties pr
where p.property_id = pr.id
  and pr.latitude is not null
  and pr.longitude is not null
  and coalesce(p.location_status, 'not_set') in ('not_set', 'verified')
  and (p.target_latitude is null or p.target_longitude is null);

create or replace function app_private.guard_plot_location_update()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  old_status text := coalesce(old.location_status, 'not_set');
  new_status text := coalesce(new.location_status, 'not_set');
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if coalesce(auth.role(), '') = 'service_role' or app_private.is_admin() then
    return new;
  end if;

  if new.location_status is distinct from old.location_status
    or new.target_latitude is distinct from old.target_latitude
    or new.target_longitude is distinct from old.target_longitude
    or new.coordinates_confirmed_at is distinct from old.coordinates_confirmed_at
    or new.coordinates_confirmed_by is distinct from old.coordinates_confirmed_by
    or new.google_maps_link is distinct from old.google_maps_link
    or new.location_verified_at is distinct from old.location_verified_at
    or new.location_verified_by is distinct from old.location_verified_by
    or new.location_adjusted_by_admin is distinct from old.location_adjusted_by_admin then

    if old_status in ('not_set', 'rejected')
      and new_status = 'pending_verification'
      and new.target_latitude is not distinct from old.target_latitude
      and new.target_longitude is not distinct from old.target_longitude
      and new.coordinates_confirmed_at is not distinct from old.coordinates_confirmed_at
      and new.coordinates_confirmed_by is not distinct from old.coordinates_confirmed_by
      and new.google_maps_link is not distinct from old.google_maps_link
      and new.location_verified_at is null
      and new.location_verified_by is null
      and coalesce(new.location_adjusted_by_admin, false) = false
      and new.location_source in ('owner_map_pin', 'owner_gps', 'owner_manual') then
      return new;
    end if;

    raise exception 'plot location verification fields can only be changed by admins';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_plot_location_update on public.plots;
create trigger guard_plot_location_update
before update on public.plots
for each row execute function app_private.guard_plot_location_update();
