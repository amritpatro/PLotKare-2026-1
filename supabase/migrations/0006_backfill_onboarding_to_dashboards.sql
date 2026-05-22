-- Backfill onboarding detail rows into operational dashboard tables.
-- This keeps existing completed users from seeing empty dashboards after Day 2 wiring.

insert into public.owners (profile_id, verification_status)
select user_id, 'submitted'
from public.land_owner_details
on conflict (profile_id) do nothing;

insert into public.sellers (profile_id, company_name, gst_number, pan_number, verification_status)
select
  user_id,
  coalesce(nullif(company_name, ''), 'PlotKare Seller'),
  nullif(gst_number, ''),
  nullif(pan_number, ''),
  'submitted'
from public.plot_seller_details
on conflict (profile_id) do update
set company_name = coalesce(excluded.company_name, public.sellers.company_name),
    gst_number = coalesce(excluded.gst_number, public.sellers.gst_number),
    pan_number = coalesce(excluded.pan_number, public.sellers.pan_number),
    updated_at = now();

insert into public.customers (profile_id, full_name, email, phone, account_status, kyc_status)
select
  p.id,
  coalesce(nullif(p.full_name, ''), p.email, 'PlotKare Customer'),
  p.email,
  p.phone,
  'active',
  'submitted'
from public.plot_buyer_details pbd
join public.profiles p on p.id = pbd.user_id
on conflict (profile_id) do update
set full_name = coalesce(nullif(excluded.full_name, ''), public.customers.full_name),
    email = coalesce(excluded.email, public.customers.email),
    phone = coalesce(excluded.phone, public.customers.phone),
    updated_at = now();

with source_rows as (
  select
    lod.user_id,
    ('ONB-' || upper(left(lod.user_id::text, 8))) as plot_number,
    trim(lod.property_location) as location,
    lod.property_size_sqyards as sq_yards,
    case lod.property_facing
      when 'N' then 'North'::public.plot_facing
      when 'S' then 'South'::public.plot_facing
      when 'W' then 'West'::public.plot_facing
      else 'East'::public.plot_facing
    end as facing,
    coalesce(lod.is_corner_plot, false) as corner_plot,
    ('Onboarding plot - ' || trim(lod.property_location)) as title
  from public.land_owner_details lod
  where nullif(trim(lod.property_location), '') is not null
    and lod.property_size_sqyards is not null
),
inserted_properties as (
  insert into public.properties (
    owner_profile_id,
    property_kind,
    title,
    address,
    city,
    lifecycle_status,
    verification_status,
    created_by
  )
  select
    src.user_id,
    'plot',
    src.title,
    src.location,
    src.location,
    'registered',
    'submitted',
    src.user_id
  from source_rows src
  where not exists (
    select 1
    from public.properties p
    where p.owner_profile_id = src.user_id
      and p.created_by = src.user_id
      and p.title = src.title
  )
  returning id, owner_profile_id, title
),
all_matching_properties as (
  select id, owner_profile_id, title, created_at
  from public.properties
  union all
  select id, owner_profile_id, title, now() as created_at
  from inserted_properties
),
property_match as (
  select distinct on (src.user_id, src.plot_number)
    src.*,
    p.id as property_id
  from source_rows src
  join all_matching_properties p
    on p.owner_profile_id = src.user_id
   and p.title = src.title
  order by src.user_id, src.plot_number, p.created_at desc
)
insert into public.plots (
  owner_id,
  property_id,
  plot_number,
  location,
  sq_yards,
  facing,
  corner_plot,
  purchase_price_lakhs,
  current_value_lakhs,
  status,
  lifecycle_status,
  verification_status,
  last_inspection
)
select
  user_id,
  property_id,
  plot_number,
  location,
  sq_yards,
  facing,
  corner_plot,
  0,
  0,
  'registered',
  'registered',
  'submitted',
  now()::date
from property_match
on conflict (owner_id, plot_number) do update
set property_id = coalesce(public.plots.property_id, excluded.property_id),
    location = excluded.location,
    sq_yards = excluded.sq_yards,
    facing = excluded.facing,
    corner_plot = excluded.corner_plot,
    lifecycle_status = excluded.lifecycle_status,
    verification_status = excluded.verification_status,
    updated_at = now();
