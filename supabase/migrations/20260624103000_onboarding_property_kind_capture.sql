-- Additive onboarding capture for property-type specific setup.
-- Existing role model, RLS policies, and dashboard tables remain unchanged.

alter table public.land_owner_details
  add column if not exists property_kind text not null default 'plot'
    check (property_kind in ('plot', 'apartment', 'house', 'commercial', 'agricultural_land', 'mixed_other')),
  add column if not exists owner_relationship text
    check (owner_relationship is null or owner_relationship in ('owner', 'family_representative', 'authorized_manager', 'power_of_attorney')),
  add column if not exists property_purpose text
    check (property_purpose is null or property_purpose in ('monitor_protect', 'sell_list', 'tenant_management', 'inspection_report', 'document_vault')),
  add column if not exists boundary_status text
    check (boundary_status is null or boundary_status in ('walled', 'fenced', 'open', 'partially_marked', 'unknown')),
  add column if not exists occupancy_status text
    check (occupancy_status is null or occupancy_status in ('vacant', 'self_used', 'family_used', 'rented', 'under_construction', 'unknown')),
  add column if not exists inspection_contact_name text,
  add column if not exists inspection_contact_phone text,
  add column if not exists concern_types text[] not null default '{}',
  add column if not exists property_details jsonb not null default '{}'::jsonb;

alter table public.plot_seller_details
  add column if not exists seller_type text
    check (seller_type is null or seller_type in ('owner', 'broker', 'developer', 'authorized_seller')),
  add column if not exists listing_property_kind text
    check (listing_property_kind is null or listing_property_kind in ('plot', 'apartment', 'house', 'commercial', 'agricultural_land', 'mixed_other')),
  add column if not exists listing_location text,
  add column if not exists expected_price_lakhs numeric check (expected_price_lakhs is null or expected_price_lakhs >= 0),
  add column if not exists listing_notes text;

alter table public.plot_buyer_details
  add column if not exists buying_purpose text
    check (buying_purpose is null or buying_purpose in ('own_use', 'investment', 'rental_income', 'business_use', 'agriculture', 'exploring')),
  add column if not exists purchase_timeline text
    check (purchase_timeline is null or purchase_timeline in ('urgent', 'one_to_three_months', 'three_to_six_months', 'exploring'));

alter table public.properties
  add column if not exists asset_type text
    check (asset_type is null or asset_type in ('plot', 'apartment', 'house', 'commercial', 'agricultural_land', 'mixed_other')),
  add column if not exists occupancy_status text
    check (occupancy_status is null or occupancy_status in ('vacant', 'self_used', 'family_used', 'rented', 'under_construction', 'unknown')),
  add column if not exists onboarding_details jsonb not null default '{}'::jsonb;

create index if not exists land_owner_details_property_kind_idx
  on public.land_owner_details (property_kind);

create index if not exists properties_owner_asset_type_idx
  on public.properties (owner_profile_id, asset_type, created_at desc);
