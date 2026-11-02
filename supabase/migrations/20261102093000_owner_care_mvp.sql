-- Owner-care MVP: a private property record, safe discovery, and delegated family visibility.

create table if not exists public.property_care_items (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  category text not null check (category in ('documents','location','boundary','inspection','photos','tax_reminder','utility_reminder','local_issue','fence_signboard','development_readiness','other')),
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','awaiting_owner','resolved','dismissed')),
  due_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_care_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  care_item_id uuid references public.property_care_items(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  summary text not null,
  visibility text not null default 'owner' check (visibility in ('owner','family','internal')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.property_readiness_snapshots (
  property_id uuid primary key references public.properties(id) on delete cascade,
  tier text not null check (tier in ('needs_attention','building_record','care_current','opportunity_ready')),
  blockers jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  next_action text not null,
  evaluated_at timestamptz not null default now(),
  evaluated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.property_qr_settings (
  property_id uuid primary key references public.properties(id) on delete cascade,
  public_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  status text not null default 'draft' check (status in ('draft','pending_review','active','paused','revoked')),
  owner_enabled boolean not null default false,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  approximate_location_label text,
  public_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_family_grants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invited_email text not null,
  viewer_profile_id uuid references public.profiles(id) on delete set null,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','active','revoked','expired')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, invited_email)
);

create table if not exists public.property_interest_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source text not null default 'qr' check (source in ('qr','public_page','owner_share')),
  request_type text not null check (request_type in ('enquiry','offer','site_visit')),
  buyer_profile_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_email text,
  guest_phone text,
  message text,
  offer_min_lakhs numeric,
  offer_max_lakhs numeric,
  consent_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new','reviewing','advisor_assigned','visit_requested','declined','closed')),
  assigned_employee_id uuid references public.employees(id) on delete set null,
  owner_response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((request_type <> 'offer') or (buyer_profile_id is not null and offer_min_lakhs is not null and offer_max_lakhs is not null and offer_max_lakhs >= offer_min_lakhs))
);

create index if not exists property_care_items_property_status_idx on public.property_care_items(property_id, status, due_at);
create index if not exists property_care_events_property_created_idx on public.property_care_events(property_id, created_at desc);
create index if not exists property_interest_property_created_idx on public.property_interest_requests(property_id, created_at desc);

drop trigger if exists property_care_items_updated_at on public.property_care_items;
create trigger property_care_items_updated_at before update on public.property_care_items for each row execute function public.touch_updated_at();
drop trigger if exists property_qr_settings_updated_at on public.property_qr_settings;
create trigger property_qr_settings_updated_at before update on public.property_qr_settings for each row execute function public.touch_updated_at();
drop trigger if exists property_family_grants_updated_at on public.property_family_grants;
create trigger property_family_grants_updated_at before update on public.property_family_grants for each row execute function public.touch_updated_at();
drop trigger if exists property_interest_requests_updated_at on public.property_interest_requests;
create trigger property_interest_requests_updated_at before update on public.property_interest_requests for each row execute function public.touch_updated_at();

alter table public.property_care_items enable row level security;
alter table public.property_care_events enable row level security;
alter table public.property_readiness_snapshots enable row level security;
alter table public.property_qr_settings enable row level security;
alter table public.property_family_grants enable row level security;
alter table public.property_interest_requests enable row level security;

create or replace function public.can_view_property_care(target_property_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.properties p where p.id = target_property_id and p.owner_profile_id = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee'))
    or exists (select 1 from public.property_family_grants g where g.property_id = target_property_id and g.viewer_profile_id = auth.uid() and g.status = 'active' and g.expires_at > now());
$$;

create policy "property_care_view" on public.property_care_items for select using (public.can_view_property_care(property_id));
create policy "property_care_owner_create" on public.property_care_items for insert with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()));
create policy "property_care_owner_update" on public.property_care_items for update using (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid())) with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()));
create policy "property_care_operations_update" on public.property_care_items for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee'))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee')));
create policy "property_care_events_view" on public.property_care_events for select using (visibility <> 'internal' and public.can_view_property_care(property_id));
create policy "property_care_events_create" on public.property_care_events for insert with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee')));
create policy "property_readiness_view" on public.property_readiness_snapshots for select using (public.can_view_property_care(property_id));
create policy "property_readiness_write" on public.property_readiness_snapshots for all using (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee'))) with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee')));
create policy "property_qr_owner_view" on public.property_qr_settings for select using (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee')));
create policy "property_qr_owner_write" on public.property_qr_settings for all using (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee'))) with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee')));
create policy "family_grant_owner_manage" on public.property_family_grants for all using (invited_by = auth.uid()) with check (invited_by = auth.uid());
create policy "family_grant_viewer_view" on public.property_family_grants for select using (viewer_profile_id = auth.uid());
create policy "property_interest_owner_view" on public.property_interest_requests for select using (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()) or buyer_profile_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee')));
create policy "property_interest_buyer_update" on public.property_interest_requests for update using (buyer_profile_id = auth.uid()) with check (buyer_profile_id = auth.uid());
create policy "property_interest_owner_update" on public.property_interest_requests for update using (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee'))) with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_profile_id = auth.uid()) or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','employee')));
