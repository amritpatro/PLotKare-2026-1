alter table public.inspections
  add column if not exists target_place_label text,
  add column if not exists arrival_place_label text;

alter table public.plots
  add column if not exists target_place_label text;

alter table public.agent_locations
  add column if not exists place_label text;
