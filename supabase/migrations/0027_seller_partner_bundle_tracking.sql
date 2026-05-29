alter table public.customer_property_links
  add column if not exists bundled_plan text
    check (bundled_plan in ('basic', 'standard', 'premium')),
  add column if not exists bundle_months integer
    check (bundle_months is null or bundle_months between 1 and 36),
  add column if not exists bundle_status text not null default 'not_included'
    check (bundle_status in ('not_included', 'pending_activation', 'active', 'expired', 'cancelled')),
  add column if not exists activation_source text not null default 'direct'
    check (activation_source in ('direct', 'seller_partner', 'admin_grant')),
  add column if not exists bundle_started_at timestamptz,
  add column if not exists bundle_expires_at timestamptz,
  add column if not exists bundle_notes text;

create index if not exists idx_customer_property_links_bundle_status
  on public.customer_property_links(bundle_status);

create index if not exists idx_customer_property_links_activation_source
  on public.customer_property_links(activation_source);
