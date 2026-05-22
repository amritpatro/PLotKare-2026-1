-- Day 3 admin operations foundation: account controls, assignments, notes, and verification events.
-- Idempotent by design so parallel Day 3 work can land safely.

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('pending', 'active', 'suspended', 'closed')),
  add column if not exists admin_notes text,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles(id) on delete set null;

alter table public.properties
  add column if not exists admin_notes text,
  add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists due_at timestamptz,
  add column if not exists escalation_level integer not null default 0 check (escalation_level >= 0);

alter table public.sellers
  add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists due_at timestamptz,
  add column if not exists escalation_level integer not null default 0 check (escalation_level >= 0);

alter table public.owners
  add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists due_at timestamptz,
  add column if not exists escalation_level integer not null default 0 check (escalation_level >= 0);

alter table public.customers
  add column if not exists admin_notes text,
  add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists due_at timestamptz,
  add column if not exists escalation_level integer not null default 0 check (escalation_level >= 0);

alter table public.property_documents
  add column if not exists admin_notes text,
  add column if not exists assigned_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists due_at timestamptz,
  add column if not exists escalation_level integer not null default 0 check (escalation_level >= 0);

create or replace function app_private.prevent_profile_admin_field_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or app_private.is_admin() then
    return new;
  end if;

  if new.account_status is distinct from old.account_status
    or new.admin_notes is distinct from old.admin_notes
    or new.suspended_at is distinct from old.suspended_at
    or new.suspended_by is distinct from old.suspended_by
    or new.role_assigned_at is distinct from old.role_assigned_at
    or new.role_assigned_by is distinct from old.role_assigned_by
    or new.employee_role is distinct from old.employee_role then
    raise exception 'admin controlled profile fields can only be changed by admins';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_admin_field_update on public.profiles;
create trigger prevent_profile_admin_field_update before update on public.profiles
for each row execute function app_private.prevent_profile_admin_field_update();

create table if not exists public.admin_internal_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  author_id uuid references public.profiles(id) on delete set null,
  note text not null,
  visibility text not null default 'admin'
    check (visibility in ('admin', 'assigned_employee')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_task_assignments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  assigned_employee_id uuid not null references public.employees(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  escalation_level integer not null default 0 check (escalation_level >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, assigned_employee_id)
);

create table if not exists public.verification_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  previous_status text,
  new_status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  assigned_employee_id uuid references public.employees(id) on delete set null,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  escalation_level integer not null default 0 check (escalation_level >= 0),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists admin_task_assignments_updated_at on public.admin_task_assignments;
create trigger admin_task_assignments_updated_at before update on public.admin_task_assignments
for each row execute function public.touch_updated_at();

alter table public.admin_internal_notes enable row level security;
alter table public.admin_task_assignments enable row level security;
alter table public.verification_events enable row level security;

drop policy if exists "admin_internal_notes_admin_all" on public.admin_internal_notes;
create policy "admin_internal_notes_admin_all" on public.admin_internal_notes
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "admin_internal_notes_employee_select" on public.admin_internal_notes;
create policy "admin_internal_notes_employee_select" on public.admin_internal_notes
for select to authenticated
using (
  visibility = 'assigned_employee'
  and exists (
    select 1
    from public.admin_task_assignments ata
    join public.employees e on e.id = ata.assigned_employee_id
    where ata.entity_type = admin_internal_notes.entity_type
      and ata.entity_id = admin_internal_notes.entity_id
      and e.profile_id = (select auth.uid())
      and e.active
  )
);

drop policy if exists "admin_task_assignments_admin_all" on public.admin_task_assignments;
create policy "admin_task_assignments_admin_all" on public.admin_task_assignments
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "admin_task_assignments_employee_select" on public.admin_task_assignments;
create policy "admin_task_assignments_employee_select" on public.admin_task_assignments
for select to authenticated
using (
  exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
);

drop policy if exists "admin_task_assignments_employee_update" on public.admin_task_assignments;
create policy "admin_task_assignments_employee_update" on public.admin_task_assignments
for update to authenticated
using (
  exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
)
with check (
  exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
);

drop policy if exists "verification_events_admin_all" on public.verification_events;
create policy "verification_events_admin_all" on public.verification_events
for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

drop policy if exists "verification_events_employee_select" on public.verification_events;
create policy "verification_events_employee_select" on public.verification_events
for select to authenticated
using (
  exists (
    select 1 from public.employees e
    where e.id = assigned_employee_id and e.profile_id = (select auth.uid()) and e.active
  )
);

grant select, insert, update, delete on public.admin_internal_notes to authenticated;
grant select, insert, update, delete on public.admin_task_assignments to authenticated;
grant select, insert, update, delete on public.verification_events to authenticated;

create index if not exists idx_profiles_account_status on public.profiles(account_status);
create index if not exists idx_properties_assigned_employee_id on public.properties(assigned_employee_id);
create index if not exists idx_properties_priority_due_at on public.properties(priority, due_at);
create index if not exists idx_sellers_assigned_employee_id on public.sellers(assigned_employee_id);
create index if not exists idx_owners_assigned_employee_id on public.owners(assigned_employee_id);
create index if not exists idx_customers_assigned_employee_id on public.customers(assigned_employee_id);
create index if not exists idx_property_documents_assigned_employee_id on public.property_documents(assigned_employee_id);
create index if not exists idx_admin_internal_notes_entity on public.admin_internal_notes(entity_type, entity_id, created_at desc);
create index if not exists idx_admin_task_assignments_entity on public.admin_task_assignments(entity_type, entity_id);
create index if not exists idx_admin_task_assignments_employee_status on public.admin_task_assignments(assigned_employee_id, status);
create index if not exists idx_verification_events_entity on public.verification_events(entity_type, entity_id, created_at desc);
create index if not exists idx_verification_events_actor on public.verification_events(actor_id, created_at desc);
