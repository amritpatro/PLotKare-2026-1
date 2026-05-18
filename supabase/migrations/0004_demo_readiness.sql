-- Demo readiness alignment for auth routing, onboarding completion, and admin access.

alter table public.profiles
  add column if not exists customer_type public.customer_type,
  add column if not exists onboarding_status public.onboarding_status not null default 'pending',
  add column if not exists onboarding_completed boolean default false,
  add column if not exists verified boolean default false;

update public.profiles
set onboarding_completed = true
where onboarding_status = 'completed'
  and coalesce(onboarding_completed, false) = false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_customer_type public.customer_type;
begin
  if new.raw_user_meta_data->>'customer_type' in ('land_owner', 'plot_seller', 'plot_buyer') then
    selected_customer_type := (new.raw_user_meta_data->>'customer_type')::public.customer_type;
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
    coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'user'),
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
  return new;
end;
$$;

alter table public.land_owner_details
  add column if not exists admin_notes text;

alter table public.plot_seller_details
  add column if not exists account_type text default 'savings',
  add column if not exists admin_notes text;

alter table public.plot_buyer_details
  add column if not exists kyc_pan_number text,
  add column if not exists kyc_aadhaar_last4 text,
  add column if not exists account_type text default 'savings',
  add column if not exists admin_notes text;

alter table public.land_owner_details enable row level security;
alter table public.plot_seller_details enable row level security;
alter table public.plot_buyer_details enable row level security;

drop policy if exists "Users see own land_owner details" on public.land_owner_details;
create policy "Users see own land_owner details"
  on public.land_owner_details for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users see own plot_seller details" on public.plot_seller_details;
create policy "Users see own plot_seller details"
  on public.plot_seller_details for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users see own plot_buyer details" on public.plot_buyer_details;
create policy "Users see own plot_buyer details"
  on public.plot_buyer_details for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Admins see all land_owner details" on public.land_owner_details;
create policy "Admins see all land_owner details"
  on public.land_owner_details for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins see all plot_seller details" on public.plot_seller_details;
create policy "Admins see all plot_seller details"
  on public.plot_seller_details for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins see all plot_buyer details" on public.plot_buyer_details;
create policy "Admins see all plot_buyer details"
  on public.plot_buyer_details for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_customer_type on public.profiles(customer_type);
create index if not exists idx_land_owner_user_id on public.land_owner_details(user_id);
create index if not exists idx_plot_seller_user_id on public.plot_seller_details(user_id);
create index if not exists idx_plot_buyer_user_id on public.plot_buyer_details(user_id);

-- After creating the auth user in Supabase Dashboard, replace the UUID and run:
-- insert into public.profiles (id, full_name, email, role, customer_type, onboarding_status, onboarding_completed, verified)
-- values ('REPLACE_WITH_ADMIN_UUID', 'PlotKare Admin', 'admin@plotkare.in', 'admin', null, 'completed', true, true)
-- on conflict (id) do update
-- set full_name = excluded.full_name,
--     email = excluded.email,
--     role = excluded.role,
--     onboarding_status = excluded.onboarding_status,
--     onboarding_completed = excluded.onboarding_completed,
--     verified = excluded.verified;
