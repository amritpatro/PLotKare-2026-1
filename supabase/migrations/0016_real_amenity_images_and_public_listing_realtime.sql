-- Production hardening: use approved real amenity imagery and keep public listing changes realtime-ready.

update public.amenities
set image_path = updates.image_path
from (
  values
    ('boundary-fencing', '/images/amenities/real/boundary-fencing.jpg'),
    ('cctv', '/images/amenities/real/cctv-installation.jpg'),
    ('container-farming', '/images/amenities/real/container-farming.jpg'),
    ('drip-irrigation', '/images/amenities/real/drip-irrigation.jpg'),
    ('herbal-garden', '/images/amenities/real/herbal-garden.jpg'),
    ('legal-signboard', '/images/amenities/real/legal-sign-boards.jpg'),
    ('mushroom-kit', '/images/amenities/real/mushroom-kit.jpg'),
    ('rainwater', '/images/amenities/real/rainwater-harvesting.jpg'),
    ('solar-panel', '/images/amenities/real/solar-panel.jpg'),
    ('portable-storage', '/images/amenities/real/storage-space.jpg')
) as updates(id, image_path)
where public.amenities.id = updates.id;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'listings'
  ) then
    alter publication supabase_realtime add table public.listings;
  end if;
end $$;

create index if not exists idx_listings_public_visibility
  on public.listings (approval_status, is_published, status, created_at desc);
