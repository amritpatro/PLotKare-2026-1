-- Role dashboard hardening: buyer marketplace actions, profile completion trail,
-- amenity requests, and account settings support.

alter table public.profiles
  add column if not exists alternate_phone text,
  add column if not exists profile_completion_status jsonb not null default '{}'::jsonb,
  add column if not exists security_preferences jsonb not null default '{}'::jsonb;

alter table public.customers
  add column if not exists preferred_contact_method text not null default 'phone'
    check (preferred_contact_method in ('phone', 'email', 'whatsapp')),
  add column if not exists profile_completion_status jsonb not null default '{}'::jsonb;

alter table public.sellers
  add column if not exists payout_preferences jsonb not null default '{}'::jsonb,
  add column if not exists listing_preferences jsonb not null default '{}'::jsonb;

alter table public.owners
  add column if not exists service_preferences jsonb not null default '{}'::jsonb;

alter table public.employees
  add column if not exists availability_preferences jsonb not null default '{}'::jsonb;

create table if not exists public.saved_listings (
  id uuid primary key default gen_random_uuid(),
  buyer_profile_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  listing_id uuid not null references public.listings(id) on delete cascade,
  status text not null default 'saved'
    check (status in ('saved', 'shortlisted', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_profile_id, listing_id)
);

create table if not exists public.listing_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_profile_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'site_visit_planned', 'negotiating', 'converted', 'closed', 'cancelled')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  preferred_contact_method text not null default 'phone'
    check (preferred_contact_method in ('phone', 'email', 'whatsapp')),
  message text,
  internal_notes text,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_visit_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  inquiry_id uuid references public.listing_inquiries(id) on delete set null,
  buyer_profile_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested', 'scheduled', 'completed', 'cancelled', 'no_show')),
  preferred_window text,
  scheduled_for timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.amenity_service_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  amenity_id text references public.amenities(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested', 'reviewing', 'quoted', 'approved', 'scheduled', 'completed', 'cancelled')),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_completion_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null,
  status text not null default 'completed'
    check (status in ('missing', 'pending', 'completed', 'verified', 'rejected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists saved_listings_updated_at on public.saved_listings;
create trigger saved_listings_updated_at before update on public.saved_listings
for each row execute function public.touch_updated_at();

drop trigger if exists listing_inquiries_updated_at on public.listing_inquiries;
create trigger listing_inquiries_updated_at before update on public.listing_inquiries
for each row execute function public.touch_updated_at();

drop trigger if exists site_visit_requests_updated_at on public.site_visit_requests;
create trigger site_visit_requests_updated_at before update on public.site_visit_requests
for each row execute function public.touch_updated_at();

drop trigger if exists amenity_service_requests_updated_at on public.amenity_service_requests;
create trigger amenity_service_requests_updated_at before update on public.amenity_service_requests
for each row execute function public.touch_updated_at();

alter table public.saved_listings enable row level security;
alter table public.listing_inquiries enable row level security;
alter table public.site_visit_requests enable row level security;
alter table public.amenity_service_requests enable row level security;
alter table public.profile_completion_events enable row level security;

drop policy if exists "saved_listings_owner_all" on public.saved_listings;
create policy "saved_listings_owner_all" on public.saved_listings
for all to authenticated
using (buyer_profile_id = (select auth.uid()) or app_private.is_admin())
with check (buyer_profile_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "listing_inquiries_access_select" on public.listing_inquiries;
create policy "listing_inquiries_access_select" on public.listing_inquiries
for select to authenticated
using (
  app_private.is_admin()
  or buyer_profile_id = (select auth.uid())
  or exists (
    select 1 from public.listings l
    where l.id = listing_inquiries.listing_id
      and l.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.employees e
    where e.id = listing_inquiries.assigned_employee_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
);

drop policy if exists "listing_inquiries_buyer_insert" on public.listing_inquiries;
create policy "listing_inquiries_buyer_insert" on public.listing_inquiries
for insert to authenticated
with check (buyer_profile_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "listing_inquiries_update_allowed" on public.listing_inquiries;
create policy "listing_inquiries_update_allowed" on public.listing_inquiries
for update to authenticated
using (
  app_private.is_admin()
  or buyer_profile_id = (select auth.uid())
  or exists (
    select 1 from public.employees e
    where e.id = listing_inquiries.assigned_employee_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
)
with check (
  app_private.is_admin()
  or buyer_profile_id = (select auth.uid())
  or exists (
    select 1 from public.employees e
    where e.id = listing_inquiries.assigned_employee_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
);

drop policy if exists "site_visit_requests_access_select" on public.site_visit_requests;
create policy "site_visit_requests_access_select" on public.site_visit_requests
for select to authenticated
using (
  app_private.is_admin()
  or buyer_profile_id = (select auth.uid())
  or exists (
    select 1 from public.listings l
    where l.id = site_visit_requests.listing_id
      and l.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.employees e
    where e.id = site_visit_requests.assigned_employee_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
);

drop policy if exists "site_visit_requests_buyer_insert" on public.site_visit_requests;
create policy "site_visit_requests_buyer_insert" on public.site_visit_requests
for insert to authenticated
with check (buyer_profile_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "site_visit_requests_update_allowed" on public.site_visit_requests;
create policy "site_visit_requests_update_allowed" on public.site_visit_requests
for update to authenticated
using (
  app_private.is_admin()
  or buyer_profile_id = (select auth.uid())
  or exists (
    select 1 from public.employees e
    where e.id = site_visit_requests.assigned_employee_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
)
with check (
  app_private.is_admin()
  or buyer_profile_id = (select auth.uid())
  or exists (
    select 1 from public.employees e
    where e.id = site_visit_requests.assigned_employee_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
);

drop policy if exists "amenity_service_requests_access_select" on public.amenity_service_requests;
create policy "amenity_service_requests_access_select" on public.amenity_service_requests
for select to authenticated
using (
  app_private.is_admin()
  or requester_id = (select auth.uid())
  or (property_id is not null and app_private.can_access_property(property_id))
  or exists (
    select 1 from public.employees e
    where e.id = amenity_service_requests.assigned_employee_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
);

drop policy if exists "amenity_service_requests_write_allowed" on public.amenity_service_requests;
create policy "amenity_service_requests_write_allowed" on public.amenity_service_requests
for all to authenticated
using (
  app_private.is_admin()
  or requester_id = (select auth.uid())
  or exists (
    select 1 from public.employees e
    where e.id = amenity_service_requests.assigned_employee_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
)
with check (
  app_private.is_admin()
  or requester_id = (select auth.uid())
  or exists (
    select 1 from public.employees e
    where e.id = amenity_service_requests.assigned_employee_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
);

drop policy if exists "profile_completion_events_owner_select" on public.profile_completion_events;
create policy "profile_completion_events_owner_select" on public.profile_completion_events
for select to authenticated
using (profile_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "profile_completion_events_owner_insert" on public.profile_completion_events;
create policy "profile_completion_events_owner_insert" on public.profile_completion_events
for insert to authenticated
with check (profile_id = (select auth.uid()) or app_private.is_admin());

grant select, insert, update, delete on public.saved_listings to authenticated;
grant select, insert, update on public.listing_inquiries to authenticated;
grant select, insert, update on public.site_visit_requests to authenticated;
grant select, insert, update on public.amenity_service_requests to authenticated;
grant select, insert on public.profile_completion_events to authenticated;

create index if not exists idx_saved_listings_buyer_profile_id on public.saved_listings(buyer_profile_id, created_at desc);
create index if not exists idx_saved_listings_listing_id on public.saved_listings(listing_id);
create index if not exists idx_listing_inquiries_buyer_profile_id on public.listing_inquiries(buyer_profile_id, created_at desc);
create index if not exists idx_listing_inquiries_listing_status on public.listing_inquiries(listing_id, status);
create index if not exists idx_listing_inquiries_employee_status on public.listing_inquiries(assigned_employee_id, status);
create index if not exists idx_site_visit_requests_buyer_profile_id on public.site_visit_requests(buyer_profile_id, created_at desc);
create index if not exists idx_site_visit_requests_listing_status on public.site_visit_requests(listing_id, status);
create index if not exists idx_amenity_service_requests_requester_id on public.amenity_service_requests(requester_id, created_at desc);
create index if not exists idx_amenity_service_requests_property_id on public.amenity_service_requests(property_id);
create index if not exists idx_profile_completion_events_profile_id on public.profile_completion_events(profile_id, created_at desc);
