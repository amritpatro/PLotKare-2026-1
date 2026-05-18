create extension if not exists pgcrypto;

create schema if not exists app_private;

create type public.user_role as enum ('user', 'admin');
create type public.plot_facing as enum ('East', 'West', 'North', 'South');
create type public.property_kind as enum ('plot', 'apartment');
create type public.listing_status as enum ('Active', 'Sold');
create type public.plan_tier as enum ('basic', 'standard', 'premium');
create type public.report_status as enum ('Draft', 'Scheduled', 'Completed', 'Action Needed');
create type public.payment_status as enum ('Pending', 'Paid', 'Failed', 'Refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  city text,
  role public.user_role not null default 'user',
  plan public.plan_tier not null default 'standard',
  avatar_path text,
  notification_preferences jsonb not null default '{
    "monthlyReports": true,
    "encroachmentAlerts": true,
    "valueUpdates": true,
    "paymentReminders": true,
    "amenityRecommendations": false,
    "marketing": false
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plot_number text not null,
  location text not null,
  location_other text,
  sq_yards numeric not null check (sq_yards > 0),
  facing public.plot_facing not null default 'East',
  corner_plot boolean not null default false,
  purchase_price_lakhs numeric not null default 0 check (purchase_price_lakhs >= 0),
  current_value_lakhs numeric not null default 0 check (current_value_lakhs >= 0),
  purchase_date date,
  status text not null default 'active',
  last_inspection date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, plot_number)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  plot_id uuid references public.plots(id) on delete set null,
  plot_number text not null,
  location text not null,
  size_sq_yards numeric not null default 0 check (size_sq_yards >= 0),
  size_label text not null,
  facing public.plot_facing not null default 'East',
  corner_plot boolean not null default false,
  premium boolean not null default false,
  price_lakhs numeric not null default 0 check (price_lakhs >= 0),
  price_display text not null,
  image_path text,
  status public.listing_status not null default 'Active',
  inquiries_count integer not null default 0 check (inquiries_count >= 0),
  property_kind public.property_kind not null default 'plot',
  bhk integer,
  floor_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.amenities (
  id text primary key,
  name text not null,
  category text not null,
  kind text not null,
  amount numeric not null default 0 check (amount >= 0),
  image_path text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.active_amenities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete cascade,
  amenity_id text not null references public.amenities(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (owner_id, plot_id, amenity_id)
);

create table public.inspection_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  month text not null,
  agent_name text,
  finding text not null default '',
  status public.report_status not null default 'Scheduled',
  report_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  description text not null,
  amount numeric not null check (amount >= 0),
  status public.payment_status not null default 'Pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  title text not null,
  bucket text not null,
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create or replace function app_private.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = check_user_id and role = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'user')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
      phone = coalesce(excluded.phone, public.profiles.phone);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger profiles_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger plots_updated_at before update on public.plots
for each row execute function public.touch_updated_at();
create trigger listings_updated_at before update on public.listings
for each row execute function public.touch_updated_at();
create trigger amenities_updated_at before update on public.amenities
for each row execute function public.touch_updated_at();
create trigger reports_updated_at before update on public.inspection_reports
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.plots enable row level security;
alter table public.listings enable row level security;
alter table public.amenities enable row level security;
alter table public.active_amenities enable row level security;
alter table public.inspection_reports enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
for select using (auth.uid() = id or app_private.is_admin());
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id and role = 'user');
create policy "profiles_admin_all" on public.profiles
for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "plots_owner_select" on public.plots
for select using (auth.uid() = owner_id or app_private.is_admin());
create policy "plots_owner_insert" on public.plots
for insert with check (auth.uid() = owner_id or app_private.is_admin());
create policy "plots_owner_update" on public.plots
for update using (auth.uid() = owner_id or app_private.is_admin()) with check (auth.uid() = owner_id or app_private.is_admin());
create policy "plots_owner_delete" on public.plots
for delete using (auth.uid() = owner_id or app_private.is_admin());

create policy "listings_public_read_active" on public.listings
for select using (status = 'Active' or auth.uid() = owner_id or app_private.is_admin());
create policy "listings_owner_write" on public.listings
for all using (auth.uid() = owner_id or app_private.is_admin()) with check (auth.uid() = owner_id or app_private.is_admin());

create policy "amenities_public_read_active" on public.amenities
for select using (active = true or app_private.is_admin());
create policy "amenities_admin_write" on public.amenities
for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "active_amenities_owner_all" on public.active_amenities
for all using (auth.uid() = owner_id or app_private.is_admin()) with check (auth.uid() = owner_id or app_private.is_admin());

create policy "reports_owner_select" on public.inspection_reports
for select using (auth.uid() = owner_id or app_private.is_admin());
create policy "reports_admin_write" on public.inspection_reports
for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "payments_owner_select" on public.payments
for select using (auth.uid() = owner_id or app_private.is_admin());
create policy "payments_admin_write" on public.payments
for all using (app_private.is_admin()) with check (app_private.is_admin());

create policy "documents_owner_all" on public.documents
for all using (auth.uid() = owner_id or app_private.is_admin()) with check (auth.uid() = owner_id or app_private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('plot-images', 'plot-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('profile-assets', 'profile-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('inspection-reports', 'inspection-reports', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "public_image_read" on storage.objects
for select using (bucket_id in ('plot-images', 'profile-assets'));

create policy "private_owner_file_read" on storage.objects
for select using (
  bucket_id in ('documents', 'inspection-reports')
  and (auth.uid()::text = (storage.foldername(name))[1] or app_private.is_admin())
);

create policy "owner_file_insert" on storage.objects
for insert with check (
  bucket_id in ('plot-images', 'profile-assets', 'documents', 'inspection-reports')
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "owner_file_update" on storage.objects
for update using (
  bucket_id in ('plot-images', 'profile-assets', 'documents', 'inspection-reports')
  and (auth.uid()::text = (storage.foldername(name))[1] or app_private.is_admin())
) with check (
  bucket_id in ('plot-images', 'profile-assets', 'documents', 'inspection-reports')
  and (auth.uid()::text = (storage.foldername(name))[1] or app_private.is_admin())
);

create policy "owner_file_delete" on storage.objects
for delete using (
  bucket_id in ('plot-images', 'profile-assets', 'documents', 'inspection-reports')
  and (auth.uid()::text = (storage.foldername(name))[1] or app_private.is_admin())
);

alter publication supabase_realtime add table public.plots;
alter publication supabase_realtime add table public.listings;
alter publication supabase_realtime add table public.active_amenities;
alter publication supabase_realtime add table public.inspection_reports;

insert into public.amenities (id, name, category, kind, amount, image_path)
values
  ('boundary-fencing', 'Boundary Fencing', 'Protection', 'one-time', 18000, '/images/amenities/protection.svg'),
  ('cctv-camera', 'CCTV Camera Setup', 'Security', 'one-time', 12000, '/images/amenities/security.svg'),
  ('solar-lighting', 'Solar Lighting', 'Utility', 'monthly', 1500, '/images/amenities/utility.svg'),
  ('portable-storage', 'Portable Storage Unit', 'Utility', 'monthly', 600, '/images/amenities/utility.svg'),
  ('garden-care', 'Garden Care', 'Lifestyle', 'monthly', 1200, '/images/amenities/lifestyle.svg'),
  ('lease-support', 'Lease Support', 'Income', 'monthly', 2500, '/images/amenities/income.svg')
on conflict (id) do update
set name = excluded.name,
    category = excluded.category,
    kind = excluded.kind,
    amount = excluded.amount,
    image_path = excluded.image_path;
