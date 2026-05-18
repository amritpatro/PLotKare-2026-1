-- Multi-tenant onboarding: customer types, detail tables, audit log

create type public.customer_type as enum ('land_owner', 'plot_seller', 'plot_buyer');
create type public.onboarding_status as enum ('pending', 'in_progress', 'completed');
create type public.verification_status as enum ('pending', 'verified', 'rejected');

alter table public.profiles
  add column if not exists customer_type public.customer_type,
  add column if not exists onboarding_status public.onboarding_status not null default 'pending';

create table if not exists public.land_owner_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  property_location text,
  property_size_sqyards integer check (property_size_sqyards is null or property_size_sqyards >= 100),
  property_facing text check (property_facing is null or property_facing in ('N', 'S', 'E', 'W')),
  is_corner_plot boolean not null default false,
  property_type text check (
    property_type is null
    or property_type in ('agriculture', 'food_crops', 'cash_crops', 'maintenance', 'other')
  ),
  interested_in text[] not null default '{}',
  documents_submitted jsonb not null default '{}'::jsonb,
  verification_status public.verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plot_seller_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  company_name text,
  gst_number text,
  pan_number text,
  address text,
  business_documents jsonb not null default '{}'::jsonb,
  commission_model text check (commission_model is null or commission_model in ('commission_percent', 'listing_fee')),
  commission_rate numeric check (commission_rate is null or (commission_rate >= 1 and commission_rate <= 10)),
  listing_fee_amount numeric check (listing_fee_amount is null or listing_fee_amount >= 100),
  bank_account_holder text,
  bank_account_number text,
  bank_ifsc text,
  bank_account_type text check (bank_account_type is null or bank_account_type in ('savings', 'current')),
  bank_verified boolean not null default false,
  verification_status public.verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists plot_seller_details_gst_unique
  on public.plot_seller_details (gst_number)
  where gst_number is not null and gst_number <> '';

create table if not exists public.plot_buyer_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  investment_budget_lakhs numeric,
  investment_budget_max_lakhs numeric,
  preferred_locations text[] not null default '{}',
  preferred_plot_size_min integer,
  preferred_plot_size_max integer,
  preferred_property_types text[] not null default '{}',
  kyc_pan_submitted boolean not null default false,
  kyc_aadhaar_submitted boolean not null default false,
  kyc_aadhaar_last4 text,
  kyc_verified boolean not null default false,
  bank_account_holder text,
  bank_account_number text,
  bank_ifsc text,
  bank_account_type text check (bank_account_type is null or bank_account_type in ('savings', 'current')),
  loan_eligible boolean,
  loan_amount_eligible numeric,
  loan_interested boolean not null default false,
  loan_amount_needed numeric,
  employer_name text,
  monthly_income numeric,
  employment_type text,
  kyc_status public.verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_type text not null,
  current_step integer not null default 1,
  last_completed_step integer not null default 0,
  action text not null,
  data_snapshot jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists onboarding_audit_log_user_created
  on public.onboarding_audit_log (user_id, created_at desc);

drop trigger if exists land_owner_details_updated_at on public.land_owner_details;
create trigger land_owner_details_updated_at before update on public.land_owner_details
for each row execute function public.touch_updated_at();

drop trigger if exists plot_seller_details_updated_at on public.plot_seller_details;
create trigger plot_seller_details_updated_at before update on public.plot_seller_details
for each row execute function public.touch_updated_at();

drop trigger if exists plot_buyer_details_updated_at on public.plot_buyer_details;
create trigger plot_buyer_details_updated_at before update on public.plot_buyer_details
for each row execute function public.touch_updated_at();

alter table public.land_owner_details enable row level security;
alter table public.plot_seller_details enable row level security;
alter table public.plot_buyer_details enable row level security;
alter table public.onboarding_audit_log enable row level security;

drop policy if exists "land_owner_details_owner_all" on public.land_owner_details;
create policy "land_owner_details_owner_all" on public.land_owner_details
for all to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin())
with check ((select auth.uid()) = user_id or app_private.is_admin());

drop policy if exists "plot_seller_details_owner_all" on public.plot_seller_details;
create policy "plot_seller_details_owner_all" on public.plot_seller_details
for all to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin())
with check ((select auth.uid()) = user_id or app_private.is_admin());

drop policy if exists "plot_buyer_details_owner_all" on public.plot_buyer_details;
create policy "plot_buyer_details_owner_all" on public.plot_buyer_details
for all to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin())
with check ((select auth.uid()) = user_id or app_private.is_admin());

drop policy if exists "onboarding_audit_log_owner_select" on public.onboarding_audit_log;
create policy "onboarding_audit_log_owner_select" on public.onboarding_audit_log
for select to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin());

drop policy if exists "onboarding_audit_log_owner_insert" on public.onboarding_audit_log;
create policy "onboarding_audit_log_owner_insert" on public.onboarding_audit_log
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "onboarding_audit_log_admin_all" on public.onboarding_audit_log;
create policy "onboarding_audit_log_admin_all" on public.onboarding_audit_log
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('user-documents', 'user-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "user_documents_owner_read" on storage.objects;
create policy "user_documents_owner_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'user-documents'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

drop policy if exists "user_documents_owner_insert" on storage.objects;
create policy "user_documents_owner_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'user-documents'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "user_documents_owner_update" on storage.objects;
create policy "user_documents_owner_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'user-documents'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'user-documents'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

drop policy if exists "user_documents_owner_delete" on storage.objects;
create policy "user_documents_owner_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'user-documents'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);
