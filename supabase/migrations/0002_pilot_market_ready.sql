alter table public.profiles
  add column if not exists address_line text,
  add column if not exists postal_code text,
  add column if not exists customer_category text,
  add column if not exists referral_source text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists onboarding_notes jsonb not null default '{}'::jsonb;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    city,
    address_line,
    postal_code,
    customer_category,
    referral_source,
    latitude,
    longitude,
    role,
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
    new.raw_user_meta_data->>'customer_category',
    new.raw_user_meta_data->>'referral_source',
    nullif(new.raw_user_meta_data->>'latitude', '')::numeric,
    nullif(new.raw_user_meta_data->>'longitude', '')::numeric,
    coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'user'),
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
      customer_category = coalesce(excluded.customer_category, public.profiles.customer_category),
      referral_source = coalesce(excluded.referral_source, public.profiles.referral_source),
      latitude = coalesce(excluded.latitude, public.profiles.latitude),
      longitude = coalesce(excluded.longitude, public.profiles.longitude),
      onboarding_notes = public.profiles.onboarding_notes || excluded.onboarding_notes;
  return new;
end;
$$;

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

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'razorpay',
  event_id text unique,
  event_type text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  report_id uuid references public.inspection_reports(id) on delete set null,
  bucket text not null default 'inspection-photos',
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  latitude numeric,
  longitude numeric,
  captured_at timestamptz,
  caption text,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  topic text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
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

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
for each row execute function public.touch_updated_at();

alter table public.subscriptions enable row level security;
alter table public.payment_events enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.support_messages enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "subscriptions_owner_select" on public.subscriptions;
create policy "subscriptions_owner_select" on public.subscriptions
for select to authenticated
using ((select auth.uid()) = owner_id or app_private.is_admin());

drop policy if exists "subscriptions_admin_write" on public.subscriptions;
create policy "subscriptions_admin_write" on public.subscriptions
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "payment_events_owner_select" on public.payment_events;
create policy "payment_events_owner_select" on public.payment_events
for select to authenticated
using ((select auth.uid()) = owner_id or app_private.is_admin());

drop policy if exists "payment_events_admin_all" on public.payment_events;
create policy "payment_events_admin_all" on public.payment_events
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "inspection_photos_owner_select" on public.inspection_photos;
create policy "inspection_photos_owner_select" on public.inspection_photos
for select to authenticated
using ((select auth.uid()) = owner_id or app_private.is_admin());

drop policy if exists "inspection_photos_owner_insert" on public.inspection_photos;
create policy "inspection_photos_owner_insert" on public.inspection_photos
for insert to authenticated
with check ((select auth.uid()) = owner_id or app_private.is_admin());

drop policy if exists "inspection_photos_owner_update" on public.inspection_photos;
create policy "inspection_photos_owner_update" on public.inspection_photos
for update to authenticated
using ((select auth.uid()) = owner_id or app_private.is_admin())
with check ((select auth.uid()) = owner_id or app_private.is_admin());

drop policy if exists "inspection_photos_owner_delete" on public.inspection_photos;
create policy "inspection_photos_owner_delete" on public.inspection_photos
for delete to authenticated
using ((select auth.uid()) = owner_id or app_private.is_admin());

drop policy if exists "support_messages_public_insert" on public.support_messages;
create policy "support_messages_public_insert" on public.support_messages
for insert to anon, authenticated
with check (true);

drop policy if exists "support_messages_owner_select" on public.support_messages;
create policy "support_messages_owner_select" on public.support_messages
for select to authenticated
using ((select auth.uid()) = owner_id or app_private.is_admin());

drop policy if exists "support_messages_admin_update" on public.support_messages;
create policy "support_messages_admin_update" on public.support_messages
for update to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select" on public.audit_logs
for select to authenticated
using (app_private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('inspection-photos', 'inspection-photos', false, 52428800, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "inspection_photo_owner_read" on storage.objects;
create policy "inspection_photo_owner_read" on storage.objects
for select to authenticated
using (
  bucket_id = 'inspection-photos'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

drop policy if exists "inspection_photo_owner_insert" on storage.objects;
create policy "inspection_photo_owner_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'inspection-photos'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

drop policy if exists "inspection_photo_owner_update" on storage.objects;
create policy "inspection_photo_owner_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'inspection-photos'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
)
with check (
  bucket_id = 'inspection-photos'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

drop policy if exists "inspection_photo_owner_delete" on storage.objects;
create policy "inspection_photo_owner_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'inspection-photos'
  and ((select auth.uid())::text = (storage.foldername(name))[1] or app_private.is_admin())
);

do $$
begin
  alter publication supabase_realtime add table public.subscriptions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.payment_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.inspection_photos;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_messages;
exception when duplicate_object then null;
end $$;
