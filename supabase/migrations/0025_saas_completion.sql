-- SaaS completion foundations: archive metadata, live agent tracking, push subscriptions,
-- and coordinate safety checks. Idempotent for production hotfix deployment.

alter table public.plots
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null,
  add column if not exists archive_reason text;

alter table public.properties
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null;

alter table public.listings
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles(id) on delete set null;

alter table public.notifications
  add column if not exists read boolean not null default false,
  add column if not exists link_path text;

create table if not exists public.agent_locations (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  agent_id uuid not null references public.employees(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  latitude numeric not null check (latitude between -90 and 90),
  longitude numeric not null check (longitude between -180 and 180),
  accuracy_meters numeric check (accuracy_meters is null or accuracy_meters >= 0),
  heading numeric check (heading is null or (heading >= 0 and heading < 360)),
  speed_mps numeric check (speed_mps is null or speed_mps >= 0),
  source text not null default 'gps' check (source in ('gps', 'network', 'manual', 'simulated')),
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at before update on public.push_subscriptions
  for each row execute function public.touch_updated_at();

do $$
begin
  alter table public.plots
    add constraint plots_target_latitude_range
    check (target_latitude is null or target_latitude between -90 and 90) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.plots
    add constraint plots_target_longitude_range
    check (target_longitude is null or target_longitude between -180 and 180) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.properties
    add constraint properties_latitude_range
    check (latitude is null or latitude between -90 and 90) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.properties
    add constraint properties_longitude_range
    check (longitude is null or longitude between -180 and 180) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.inspections
    add constraint inspections_target_latitude_range
    check (target_latitude is null or target_latitude between -90 and 90) not valid;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.inspections
    add constraint inspections_target_longitude_range
    check (target_longitude is null or target_longitude between -180 and 180) not valid;
exception when duplicate_object then null;
end $$;

alter table public.agent_locations enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "agent_locations_select_scoped" on public.agent_locations;
create policy "agent_locations_select_scoped"
  on public.agent_locations
  for select
  using (
    app_private.is_admin()
    or exists (
      select 1
      from public.inspections i
      join public.employees e on e.id = i.assigned_employee_id
      where i.id = agent_locations.inspection_id
        and e.profile_id = (select auth.uid())
        and e.active = true
    )
    or exists (
      select 1
      from public.inspections i
      left join public.properties p on p.id = i.property_id
      where i.id = agent_locations.inspection_id
        and (
          i.requested_by = (select auth.uid())
          or p.owner_profile_id = (select auth.uid())
        )
    )
  );

drop policy if exists "agent_locations_insert_assigned_agent" on public.agent_locations;
create policy "agent_locations_insert_assigned_agent"
  on public.agent_locations
  for insert
  with check (
    app_private.is_admin()
    or (
      profile_id = (select auth.uid())
      and exists (
        select 1
        from public.employees e
        join public.inspections i on i.assigned_employee_id = e.id
        where e.id = agent_locations.agent_id
          and e.profile_id = (select auth.uid())
          and e.active = true
          and i.id = agent_locations.inspection_id
      )
    )
  );

drop policy if exists "agent_locations_admin_update" on public.agent_locations;
create policy "agent_locations_admin_update"
  on public.agent_locations
  for update
  using (app_private.is_admin())
  with check (app_private.is_admin());

drop policy if exists "agent_locations_admin_delete" on public.agent_locations;
create policy "agent_locations_admin_delete"
  on public.agent_locations
  for delete
  using (app_private.is_admin());

drop policy if exists "push_subscriptions_owner_select" on public.push_subscriptions;
create policy "push_subscriptions_owner_select"
  on public.push_subscriptions
  for select
  using (user_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "push_subscriptions_owner_insert" on public.push_subscriptions;
create policy "push_subscriptions_owner_insert"
  on public.push_subscriptions
  for insert
  with check (user_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "push_subscriptions_owner_update" on public.push_subscriptions;
create policy "push_subscriptions_owner_update"
  on public.push_subscriptions
  for update
  using (user_id = (select auth.uid()) or app_private.is_admin())
  with check (user_id = (select auth.uid()) or app_private.is_admin());

drop policy if exists "push_subscriptions_owner_delete" on public.push_subscriptions;
create policy "push_subscriptions_owner_delete"
  on public.push_subscriptions
  for delete
  using (user_id = (select auth.uid()) or app_private.is_admin());

grant select, insert, update, delete on public.agent_locations to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

create index if not exists idx_plots_owner_archive
  on public.plots(owner_id, lifecycle_status, archived_at desc);

create index if not exists idx_properties_owner_archive
  on public.properties(owner_profile_id, lifecycle_status, archived_at desc);

create index if not exists idx_listings_archive_visibility
  on public.listings(status, is_published, archived_at desc);

create index if not exists idx_agent_locations_inspection_time
  on public.agent_locations(inspection_id, captured_at desc);

create index if not exists idx_agent_locations_agent_time
  on public.agent_locations(agent_id, captured_at desc);

create index if not exists idx_agent_locations_profile_time
  on public.agent_locations(profile_id, captured_at desc);

create index if not exists idx_notifications_recipient_read
  on public.notifications(recipient_id, read_at, created_at desc);

create index if not exists idx_push_subscriptions_user_enabled
  on public.push_subscriptions(user_id, enabled);

alter table public.agent_locations replica identity full;
alter table public.notifications replica identity full;
alter table public.support_tickets replica identity full;
alter table public.ticket_replies replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.agent_locations;
exception when duplicate_object then null; when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.push_subscriptions;
exception when duplicate_object then null; when undefined_object then null;
end $$;
