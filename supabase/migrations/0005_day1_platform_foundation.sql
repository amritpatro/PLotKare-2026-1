-- Day 1 platform foundation: roles, lifecycle schema, RLS helpers, and access policies.
-- This migration is intentionally non-destructive so the existing demo data keeps working.

alter type public.user_role add value if not exists 'plot_seller';
alter type public.user_role add value if not exists 'land_owner';
alter type public.user_role add value if not exists 'customer';
alter type public.user_role add value if not exists 'employee';

do $$
begin
  create type public.employee_role as enum ('verification_agent', 'field_inspection_agent', 'support_staff');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists address_line text,
  add column if not exists postal_code text,
  add column if not exists customer_category text,
  add column if not exists referral_source text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_notes jsonb not null default '{}'::jsonb,
  add column if not exists verified boolean not null default false,
  add column if not exists employee_role public.employee_role,
  add column if not exists role_assigned_at timestamptz,
  add column if not exists role_assigned_by uuid references public.profiles(id) on delete set null;

update public.profiles
set onboarding_completed = true
where onboarding_status = 'completed' and onboarding_completed is distinct from true;

update public.profiles
set role = case
    when customer_type = 'plot_seller' then 'plot_seller'::public.user_role
    when customer_type = 'land_owner' then 'land_owner'::public.user_role
    when customer_type = 'plot_buyer' then 'customer'::public.user_role
    else role
  end,
  role_assigned_at = coalesce(role_assigned_at, now())
where role = 'user'
  and customer_type in ('plot_seller', 'land_owner', 'plot_buyer');

create or replace function app_private.profile_role(check_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = check_user_id;
$$;

create or replace function app_private.has_role(allowed_roles text[], check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app_private.profile_role(check_user_id) = any(allowed_roles), false);
$$;

create or replace function app_private.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_private.has_role(array['admin'], check_user_id);
$$;

create or replace function app_private.is_employee(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_private.has_role(array['employee'], check_user_id);
$$;

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  company_name text,
  gst_number text,
  pan_number text,
  verification_status text not null default 'submitted'
    check (verification_status in ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.sellers (profile_id, company_name, verification_status)
select id, coalesce(full_name, 'PlotKare Seller'), 'submitted'
from public.profiles
where role = 'plot_seller'
on conflict (profile_id) do nothing;

create table if not exists public.owners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  verification_status text not null default 'submitted'
    check (verification_status in ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.owners (profile_id, verification_status)
select id, 'submitted'
from public.profiles
where role = 'land_owner'
on conflict (profile_id) do nothing;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  created_by_seller_id uuid references public.sellers(id) on delete set null,
  full_name text not null default '',
  email text,
  phone text,
  address text,
  aadhaar_last4 text,
  pan_number text,
  kyc_status text not null default 'submitted'
    check (kyc_status in ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  account_status text not null default 'pending'
    check (account_status in ('pending', 'active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.customers (profile_id, full_name, email, phone, account_status, kyc_status)
select id, coalesce(nullif(full_name, ''), email), email, phone, 'active', 'submitted'
from public.profiles
where role = 'customer'
on conflict (profile_id) do nothing;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  employee_role public.employee_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  seller_id uuid references public.sellers(id) on delete set null,
  current_customer_id uuid references public.customers(id) on delete set null,
  property_kind public.property_kind not null default 'plot',
  title text not null default '',
  address text,
  city text,
  state text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  lifecycle_status text not null default 'registered'
    check (lifecycle_status in ('draft', 'registered', 'available', 'reserved', 'sold', 'rented', 'managed', 'archived')),
  verification_status text not null default 'submitted'
    check (verification_status in ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plots
  add column if not exists property_id uuid references public.properties(id) on delete set null,
  add column if not exists seller_id uuid references public.sellers(id) on delete set null,
  add column if not exists reserved_customer_id uuid references public.customers(id) on delete set null,
  add column if not exists sold_customer_id uuid references public.customers(id) on delete set null,
  add column if not exists verification_status text not null default 'submitted',
  add column if not exists lifecycle_status text not null default 'registered',
  add column if not exists survey_number text,
  add column if not exists dimensions jsonb not null default '{}'::jsonb,
  add column if not exists layout_image_path text,
  add column if not exists sold_at timestamptz;

create table if not exists public.apartments (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties(id) on delete cascade,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  apartment_number text,
  floor_label text,
  bhk integer,
  built_up_sqft numeric,
  lifecycle_status text not null default 'registered'
    check (lifecycle_status in ('draft', 'registered', 'available', 'reserved', 'sold', 'rented', 'managed', 'archived')),
  verification_status text not null default 'submitted'
    check (verification_status in ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  apartment_id uuid references public.apartments(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  document_type text not null,
  title text not null,
  bucket text not null default 'property-documents',
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  verification_status text not null default 'submitted'
    check (verification_status in ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  visibility text not null default 'internal'
    check (visibility in ('internal', 'owner', 'seller', 'customer', 'employee', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create table if not exists public.customer_property_links (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  seller_id uuid references public.sellers(id) on delete set null,
  relationship_type text not null default 'buyer'
    check (relationship_type in ('buyer', 'owner', 'renter', 'tenant', 'family_tenant', 'bachelor_tenant', 'nominee')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'expired', 'cancelled')),
  registration_date date,
  agreement_document_id uuid references public.property_documents(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, property_id, relationship_type)
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vendor_type text not null,
  phone text,
  email text,
  city text,
  active boolean not null default true,
  verification_status text not null default 'submitted'
    check (verification_status in ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'scheduled'
    check (status in ('requested', 'scheduled', 'in_progress', 'completed', 'cancelled', 'needs_followup')),
  scheduled_for timestamptz,
  completed_at timestamptz,
  summary text,
  report_path text,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  requester_id uuid references public.profiles(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'assigned', 'in_progress', 'waiting_on_vendor', 'resolved', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  audience_role text not null check (audience_role in ('plot_seller', 'land_owner', 'customer')),
  price_monthly numeric not null default 0 check (price_monthly >= 0),
  price_yearly numeric not null default 0 check (price_yearly >= 0),
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_subscription_id text unique,
  provider_plan_id text,
  plan public.plan_tier not null default 'standard',
  status text not null default 'created',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
  add column if not exists plan_id uuid references public.plans(id) on delete set null,
  add column if not exists property_id uuid references public.properties(id) on delete set null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

alter table public.payments
  add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null,
  add column if not exists property_id uuid references public.properties(id) on delete set null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists provider text not null default 'manual',
  add column if not exists provider_payment_id text;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  title text not null,
  message text not null,
  category text not null default 'system',
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references public.profiles(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  subject text not null,
  description text not null,
  status text not null default 'open'
    check (status in ('open', 'assigned', 'in_progress', 'waiting_on_customer', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs
  add column if not exists property_id uuid references public.properties(id) on delete set null,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists ip_address text,
  add column if not exists user_agent text;

create or replace function app_private.is_seller_record(check_seller_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sellers
    where id = check_seller_id and profile_id = check_user_id
  );
$$;

create or replace function app_private.is_customer_record(check_customer_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.customers
    where id = check_customer_id and profile_id = check_user_id
  );
$$;

create or replace function app_private.can_access_property(check_property_id uuid, check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    app_private.is_admin(check_user_id)
    or exists (
      select 1
      from public.properties p
      left join public.sellers s on s.id = p.seller_id
      where p.id = check_property_id
        and (p.owner_profile_id = check_user_id or s.profile_id = check_user_id)
    )
    or exists (
      select 1
      from public.customer_property_links cpl
      join public.customers c on c.id = cpl.customer_id
      where cpl.property_id = check_property_id
        and c.profile_id = check_user_id
        and cpl.status in ('pending', 'active', 'completed')
    )
    or exists (
      select 1
      from public.inspections i
      join public.employees e on e.id = i.assigned_employee_id
      where i.property_id = check_property_id and e.profile_id = check_user_id and e.active
    )
    or exists (
      select 1
      from public.maintenance_requests mr
      join public.employees e on e.id = mr.assigned_employee_id
      where mr.property_id = check_property_id and e.profile_id = check_user_id and e.active
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_customer_type public.customer_type;
  selected_role text := 'user';
  metadata_role text := new.raw_app_meta_data->>'role';
begin
  if new.raw_user_meta_data->>'customer_type' in ('land_owner', 'plot_seller', 'plot_buyer') then
    selected_customer_type := (new.raw_user_meta_data->>'customer_type')::public.customer_type;
  end if;

  if selected_customer_type = 'land_owner' then
    selected_role := 'land_owner';
  elsif selected_customer_type = 'plot_seller' then
    selected_role := 'plot_seller';
  elsif selected_customer_type = 'plot_buyer' then
    selected_role := 'customer';
  end if;

  if metadata_role in ('admin', 'employee', 'customer', 'land_owner', 'plot_seller', 'user') then
    selected_role := metadata_role;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    city,
    address_line,
    postal_code,
    customer_type,
    customer_category,
    referral_source,
    latitude,
    longitude,
    role,
    onboarding_status,
    onboarding_completed,
    onboarding_notes
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'address_line',
    new.raw_user_meta_data->>'postal_code',
    selected_customer_type,
    new.raw_user_meta_data->>'customer_category',
    new.raw_user_meta_data->>'referral_source',
    nullif(new.raw_user_meta_data->>'latitude', '')::numeric,
    nullif(new.raw_user_meta_data->>'longitude', '')::numeric,
    selected_role::public.user_role,
    case
      when selected_customer_type is null then 'pending'::public.onboarding_status
      else 'in_progress'::public.onboarding_status
    end,
    false,
    jsonb_build_object(
      'signup_completed_at', now(),
      'location_permission', coalesce(new.raw_user_meta_data->>'location_permission', 'not_requested')
    )
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
      phone = coalesce(excluded.phone, public.profiles.phone),
      city = coalesce(excluded.city, public.profiles.city),
      address_line = coalesce(excluded.address_line, public.profiles.address_line),
      postal_code = coalesce(excluded.postal_code, public.profiles.postal_code),
      customer_type = coalesce(excluded.customer_type, public.profiles.customer_type),
      customer_category = coalesce(excluded.customer_category, public.profiles.customer_category),
      referral_source = coalesce(excluded.referral_source, public.profiles.referral_source),
      latitude = coalesce(excluded.latitude, public.profiles.latitude),
      longitude = coalesce(excluded.longitude, public.profiles.longitude),
      role = case
        when public.profiles.role::text in ('admin', 'employee') then public.profiles.role
        else excluded.role
      end,
      onboarding_status = case
        when public.profiles.onboarding_status = 'completed' then public.profiles.onboarding_status
        when excluded.customer_type is not null then 'in_progress'::public.onboarding_status
        else public.profiles.onboarding_status
      end,
      onboarding_completed = case
        when public.profiles.onboarding_status = 'completed' then true
        when excluded.customer_type is not null then false
        else public.profiles.onboarding_completed
      end,
      onboarding_notes = public.profiles.onboarding_notes || excluded.onboarding_notes;

  if selected_customer_type = 'plot_seller' then
    insert into public.sellers (profile_id, company_name, verification_status)
    values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'PlotKare Seller'), 'submitted')
    on conflict (profile_id) do nothing;
  elsif selected_customer_type = 'land_owner' then
    insert into public.owners (profile_id, verification_status)
    values (new.id, 'submitted')
    on conflict (profile_id) do nothing;
  elsif selected_customer_type = 'plot_buyer' then
    insert into public.customers (profile_id, full_name, email, phone, account_status, kyc_status)
    values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, '')),
      new.email,
      new.raw_user_meta_data->>'phone',
      'active',
      'submitted'
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

alter function public.touch_updated_at() set search_path = public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable' and p.pronargs = 0
  ) then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
  end if;
end $$;

drop trigger if exists sellers_updated_at on public.sellers;
create trigger sellers_updated_at before update on public.sellers for each row execute function public.touch_updated_at();
drop trigger if exists owners_updated_at on public.owners;
create trigger owners_updated_at before update on public.owners for each row execute function public.touch_updated_at();
drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers for each row execute function public.touch_updated_at();
drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at before update on public.employees for each row execute function public.touch_updated_at();
drop trigger if exists properties_updated_at on public.properties;
create trigger properties_updated_at before update on public.properties for each row execute function public.touch_updated_at();
drop trigger if exists apartments_updated_at on public.apartments;
create trigger apartments_updated_at before update on public.apartments for each row execute function public.touch_updated_at();
drop trigger if exists property_documents_updated_at on public.property_documents;
create trigger property_documents_updated_at before update on public.property_documents for each row execute function public.touch_updated_at();
drop trigger if exists customer_property_links_updated_at on public.customer_property_links;
create trigger customer_property_links_updated_at before update on public.customer_property_links for each row execute function public.touch_updated_at();
drop trigger if exists vendors_updated_at on public.vendors;
create trigger vendors_updated_at before update on public.vendors for each row execute function public.touch_updated_at();
drop trigger if exists inspections_updated_at on public.inspections;
create trigger inspections_updated_at before update on public.inspections for each row execute function public.touch_updated_at();
drop trigger if exists maintenance_requests_updated_at on public.maintenance_requests;
create trigger maintenance_requests_updated_at before update on public.maintenance_requests for each row execute function public.touch_updated_at();
drop trigger if exists plans_updated_at on public.plans;
create trigger plans_updated_at before update on public.plans for each row execute function public.touch_updated_at();
drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets for each row execute function public.touch_updated_at();

alter table public.sellers enable row level security;
alter table public.owners enable row level security;
alter table public.customers enable row level security;
alter table public.employees enable row level security;
alter table public.properties enable row level security;
alter table public.apartments enable row level security;
alter table public.property_documents enable row level security;
alter table public.customer_property_links enable row level security;
alter table public.vendors enable row level security;
alter table public.inspections enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.plans enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or app_private.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and role::text = app_private.profile_role((select auth.uid())));

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "sellers_owner_select" on public.sellers;
create policy "sellers_owner_select" on public.sellers
for select to authenticated
using (profile_id = (select auth.uid()) or app_private.is_admin());
drop policy if exists "sellers_owner_write" on public.sellers;
create policy "sellers_owner_write" on public.sellers
for all to authenticated
using (profile_id = (select auth.uid()) or app_private.is_admin())
with check (profile_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "owners_owner_all" on public.owners;
create policy "owners_owner_all" on public.owners
for all to authenticated
using (profile_id = (select auth.uid()) or app_private.is_admin())
with check (profile_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "customers_access_select" on public.customers;
create policy "customers_access_select" on public.customers
for select to authenticated
using (
  profile_id = (select auth.uid())
  or app_private.is_admin()
  or app_private.is_seller_record(created_by_seller_id)
);
drop policy if exists "customers_seller_insert" on public.customers;
create policy "customers_seller_insert" on public.customers
for insert to authenticated
with check (app_private.is_admin() or app_private.is_seller_record(created_by_seller_id));
drop policy if exists "customers_seller_update" on public.customers;
create policy "customers_seller_update" on public.customers
for update to authenticated
using (profile_id = (select auth.uid()) or app_private.is_admin() or app_private.is_seller_record(created_by_seller_id))
with check (profile_id = (select auth.uid()) or app_private.is_admin() or app_private.is_seller_record(created_by_seller_id));

drop policy if exists "employees_self_or_admin_select" on public.employees;
create policy "employees_self_or_admin_select" on public.employees
for select to authenticated
using (profile_id = (select auth.uid()) or app_private.is_admin());
drop policy if exists "employees_admin_all" on public.employees;
create policy "employees_admin_all" on public.employees
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "properties_access_select" on public.properties;
create policy "properties_access_select" on public.properties
for select to authenticated
using (app_private.can_access_property(id));
drop policy if exists "properties_owner_seller_insert" on public.properties;
create policy "properties_owner_seller_insert" on public.properties
for insert to authenticated
with check (
  app_private.is_admin()
  or owner_profile_id = (select auth.uid())
  or app_private.is_seller_record(seller_id)
);
drop policy if exists "properties_owner_seller_update" on public.properties;
create policy "properties_owner_seller_update" on public.properties
for update to authenticated
using (
  app_private.is_admin()
  or owner_profile_id = (select auth.uid())
  or app_private.is_seller_record(seller_id)
)
with check (
  app_private.is_admin()
  or owner_profile_id = (select auth.uid())
  or app_private.is_seller_record(seller_id)
);

drop policy if exists "apartments_property_access" on public.apartments;
create policy "apartments_property_access" on public.apartments
for all to authenticated
using (app_private.can_access_property(property_id))
with check (app_private.can_access_property(property_id));

drop policy if exists "property_documents_access_select" on public.property_documents;
create policy "property_documents_access_select" on public.property_documents
for select to authenticated
using (
  app_private.is_admin()
  or uploaded_by = (select auth.uid())
  or (property_id is not null and app_private.can_access_property(property_id))
);
drop policy if exists "property_documents_upload" on public.property_documents;
create policy "property_documents_upload" on public.property_documents
for insert to authenticated
with check (
  app_private.is_admin()
  or uploaded_by = (select auth.uid())
  or (property_id is not null and app_private.can_access_property(property_id))
);
drop policy if exists "property_documents_update" on public.property_documents;
create policy "property_documents_update" on public.property_documents
for update to authenticated
using (
  app_private.is_admin()
  or uploaded_by = (select auth.uid())
  or (property_id is not null and app_private.can_access_property(property_id))
)
with check (
  app_private.is_admin()
  or uploaded_by = (select auth.uid())
  or (property_id is not null and app_private.can_access_property(property_id))
);

drop policy if exists "customer_property_links_access_select" on public.customer_property_links;
create policy "customer_property_links_access_select" on public.customer_property_links
for select to authenticated
using (
  app_private.is_admin()
  or app_private.is_customer_record(customer_id)
  or app_private.is_seller_record(seller_id)
  or app_private.can_access_property(property_id)
);
drop policy if exists "customer_property_links_owner_seller_write" on public.customer_property_links;
create policy "customer_property_links_owner_seller_write" on public.customer_property_links
for all to authenticated
using (
  app_private.is_admin()
  or app_private.is_seller_record(seller_id)
  or app_private.can_access_property(property_id)
)
with check (
  app_private.is_admin()
  or app_private.is_seller_record(seller_id)
  or app_private.can_access_property(property_id)
);

drop policy if exists "vendors_admin_employee_select" on public.vendors;
create policy "vendors_admin_employee_select" on public.vendors
for select to authenticated
using (active = true or app_private.is_admin() or app_private.is_employee());
drop policy if exists "vendors_admin_all" on public.vendors;
create policy "vendors_admin_all" on public.vendors
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "inspections_access_select" on public.inspections;
create policy "inspections_access_select" on public.inspections
for select to authenticated
using (
  app_private.is_admin()
  or app_private.can_access_property(property_id)
  or exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
);
drop policy if exists "inspections_employee_update" on public.inspections;
create policy "inspections_employee_update" on public.inspections
for update to authenticated
using (
  app_private.is_admin()
  or exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
)
with check (
  app_private.is_admin()
  or exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
);
drop policy if exists "inspections_request_insert" on public.inspections;
create policy "inspections_request_insert" on public.inspections
for insert to authenticated
with check (app_private.is_admin() or app_private.can_access_property(property_id));

drop policy if exists "maintenance_requests_access_select" on public.maintenance_requests;
create policy "maintenance_requests_access_select" on public.maintenance_requests
for select to authenticated
using (
  app_private.is_admin()
  or requester_id = (select auth.uid())
  or app_private.can_access_property(property_id)
  or exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
);
drop policy if exists "maintenance_requests_access_write" on public.maintenance_requests;
create policy "maintenance_requests_access_write" on public.maintenance_requests
for all to authenticated
using (
  app_private.is_admin()
  or requester_id = (select auth.uid())
  or app_private.can_access_property(property_id)
  or exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
)
with check (
  app_private.is_admin()
  or requester_id = (select auth.uid())
  or app_private.can_access_property(property_id)
  or exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
);

drop policy if exists "plans_read_active" on public.plans;
create policy "plans_read_active" on public.plans
for select using (active = true or app_private.is_admin());
drop policy if exists "plans_admin_all" on public.plans;
create policy "plans_admin_all" on public.plans
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "notifications_recipient_all" on public.notifications;
create policy "notifications_recipient_all" on public.notifications
for all to authenticated
using (recipient_id = (select auth.uid()) or app_private.is_admin())
with check (recipient_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "support_tickets_access_select" on public.support_tickets;
create policy "support_tickets_access_select" on public.support_tickets
for select to authenticated
using (
  app_private.is_admin()
  or requester_id = (select auth.uid())
  or app_private.is_customer_record(customer_id)
  or (property_id is not null and app_private.can_access_property(property_id))
  or exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
);
drop policy if exists "support_tickets_access_write" on public.support_tickets;
create policy "support_tickets_access_write" on public.support_tickets
for all to authenticated
using (
  app_private.is_admin()
  or requester_id = (select auth.uid())
  or exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
)
with check (
  app_private.is_admin()
  or requester_id = (select auth.uid())
  or exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
);

drop policy if exists "subscriptions_owner_select" on public.subscriptions;
create policy "subscriptions_owner_select" on public.subscriptions
for select to authenticated
using (
  owner_id = (select auth.uid())
  or app_private.is_admin()
  or (property_id is not null and app_private.can_access_property(property_id))
);
drop policy if exists "subscriptions_admin_write" on public.subscriptions;
create policy "subscriptions_admin_write" on public.subscriptions
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "payments_owner_select" on public.payments;
create policy "payments_owner_select" on public.payments
for select to authenticated
using (
  owner_id = (select auth.uid())
  or app_private.is_admin()
  or (property_id is not null and app_private.can_access_property(property_id))
);
drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write" on public.payments
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select" on public.audit_logs
for select to authenticated
using (app_private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-documents', 'property-documents', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "property_documents_storage_owner_read" on storage.objects;
create policy "property_documents_storage_owner_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'property-documents'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

drop policy if exists "property_documents_storage_owner_insert" on storage.objects;
create policy "property_documents_storage_owner_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'property-documents'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "property_documents_storage_owner_update" on storage.objects;
create policy "property_documents_storage_owner_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'property-documents'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
)
with check (
  bucket_id = 'property-documents'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

create index if not exists idx_profiles_role_employee_role on public.profiles(role, employee_role);
create index if not exists idx_profiles_onboarding_completed on public.profiles(onboarding_completed);
create index if not exists idx_profiles_customer_type_status on public.profiles(customer_type, onboarding_status);
create index if not exists idx_sellers_profile_id on public.sellers(profile_id);
create index if not exists idx_owners_profile_id on public.owners(profile_id);
create index if not exists idx_customers_profile_id on public.customers(profile_id);
create index if not exists idx_customers_created_by_seller_id on public.customers(created_by_seller_id);
create index if not exists idx_employees_profile_id on public.employees(profile_id);
create index if not exists idx_properties_owner_profile_id on public.properties(owner_profile_id);
create index if not exists idx_properties_seller_id on public.properties(seller_id);
create index if not exists idx_properties_current_customer_id on public.properties(current_customer_id);
create index if not exists idx_plots_property_id on public.plots(property_id);
create index if not exists idx_plots_seller_id on public.plots(seller_id);
create index if not exists idx_plots_sold_customer_id on public.plots(sold_customer_id);
create index if not exists idx_apartments_property_id on public.apartments(property_id);
create index if not exists idx_property_documents_property_id on public.property_documents(property_id);
create index if not exists idx_property_documents_customer_id on public.property_documents(customer_id);
create index if not exists idx_customer_property_links_customer_id on public.customer_property_links(customer_id);
create index if not exists idx_customer_property_links_property_id on public.customer_property_links(property_id);
create index if not exists idx_customer_property_links_seller_id on public.customer_property_links(seller_id);
create index if not exists idx_inspections_property_id on public.inspections(property_id);
create index if not exists idx_inspections_assigned_employee_id on public.inspections(assigned_employee_id);
create index if not exists idx_maintenance_requests_property_id on public.maintenance_requests(property_id);
create index if not exists idx_maintenance_requests_assigned_employee_id on public.maintenance_requests(assigned_employee_id);
create index if not exists idx_subscriptions_plan_id on public.subscriptions(plan_id);
create index if not exists idx_subscriptions_property_id on public.subscriptions(property_id);
create index if not exists idx_subscriptions_customer_id on public.subscriptions(customer_id);
create index if not exists idx_payments_subscription_id on public.payments(subscription_id);
create index if not exists idx_payments_property_id on public.payments(property_id);
create index if not exists idx_payments_customer_id on public.payments(customer_id);
create index if not exists idx_notifications_recipient_id_read_at on public.notifications(recipient_id, read_at);
create index if not exists idx_support_tickets_requester_id on public.support_tickets(requester_id);
create index if not exists idx_support_tickets_property_id on public.support_tickets(property_id);
create index if not exists idx_support_tickets_assigned_employee_id on public.support_tickets(assigned_employee_id);
create index if not exists idx_audit_logs_property_id on public.audit_logs(property_id);
create index if not exists idx_audit_logs_customer_id on public.audit_logs(customer_id);
create index if not exists idx_apartments_owner_profile_id on public.apartments(owner_profile_id);
create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists idx_customer_property_links_agreement_document_id on public.customer_property_links(agreement_document_id);
create index if not exists idx_customer_property_links_created_by on public.customer_property_links(created_by);
create index if not exists idx_inspections_customer_id on public.inspections(customer_id);
create index if not exists idx_inspections_plot_id on public.inspections(plot_id);
create index if not exists idx_inspections_requested_by on public.inspections(requested_by);
create index if not exists idx_maintenance_requests_customer_id on public.maintenance_requests(customer_id);
create index if not exists idx_maintenance_requests_requester_id on public.maintenance_requests(requester_id);
create index if not exists idx_maintenance_requests_vendor_id on public.maintenance_requests(vendor_id);
create index if not exists idx_notifications_actor_id on public.notifications(actor_id);
create index if not exists idx_payments_owner_id on public.payments(owner_id);
create index if not exists idx_plots_reserved_customer_id on public.plots(reserved_customer_id);
create index if not exists idx_profiles_role_assigned_by on public.profiles(role_assigned_by);
create index if not exists idx_properties_created_by on public.properties(created_by);
create index if not exists idx_property_documents_apartment_id on public.property_documents(apartment_id);
create index if not exists idx_property_documents_plot_id on public.property_documents(plot_id);
create index if not exists idx_property_documents_uploaded_by on public.property_documents(uploaded_by);
create index if not exists idx_subscriptions_owner_id on public.subscriptions(owner_id);
create index if not exists idx_support_tickets_customer_id on public.support_tickets(customer_id);

create index if not exists idx_active_amenities_amenity_id on public.active_amenities(amenity_id);
create index if not exists idx_active_amenities_plot_id on public.active_amenities(plot_id);
create index if not exists idx_documents_owner_id on public.documents(owner_id);
create index if not exists idx_documents_plot_id on public.documents(plot_id);
create index if not exists idx_inspection_reports_owner_id on public.inspection_reports(owner_id);
create index if not exists idx_inspection_reports_plot_id on public.inspection_reports(plot_id);
create index if not exists idx_listings_owner_id on public.listings(owner_id);
create index if not exists idx_listings_plot_id on public.listings(plot_id);

-- Admin bootstrap:
-- 1. Create auth user in Supabase Dashboard.
-- 2. Set role through SQL, never from client user_metadata:
-- update public.profiles
-- set role = 'admin',
--     onboarding_status = 'completed',
--     onboarding_completed = true,
--     verified = true,
--     role_assigned_at = now()
-- where email = 'admin@plotkare.in';
