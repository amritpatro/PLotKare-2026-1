-- Align active dashboard amenity records to the approved real amenity photographs.
-- Existing active request foreign keys remain stable; matching legacy ids retain their identity.

insert into public.amenities (id, name, category, kind, amount, image_path, active)
values
  ('boundary-fencing', 'Boundary Fencing', 'Protection', 'one-time', 18000, '/images/amenities/real/boundary-fencing.jpg', true),
  ('cctv-camera', 'CCTV Camera Setup', 'Security', 'one-time', 12000, '/images/amenities/real/cctv-installation.jpg', true),
  ('solar-lighting', 'Solar Lighting', 'Utility', 'monthly', 1500, '/images/amenities/real/solar-panel.jpg', true),
  ('portable-storage', 'Portable Storage Unit', 'Utility', 'monthly', 600, '/images/amenities/real/storage-space.jpg', true),
  ('garden-care', 'Garden Care', 'Lifestyle', 'monthly', 1200, '/images/amenities/real/herbal-garden.jpg', true),
  ('container-farming', 'Container Farming Lease', 'Income Generation', 'monthly', 800, '/images/amenities/real/container-farming.jpg', true),
  ('drip-irrigation', 'Drip Irrigation Setup', 'Utility', 'one-time', 8000, '/images/amenities/real/drip-irrigation.jpg', true),
  ('legal-signboard', 'Legal Signboard Installation', 'Protection', 'one-time', 2000, '/images/amenities/real/legal-sign-boards.jpg', true),
  ('mushroom-kit', 'Mushroom Kit Cultivation', 'Income Generation', 'monthly', 1200, '/images/amenities/real/mushroom-kit.jpg', true),
  ('rainwater', 'Rainwater Harvesting Pit', 'Utility', 'one-time', 12000, '/images/amenities/real/rainwater-harvesting.jpg', true)
on conflict (id) do update
set
  name = excluded.name,
  category = excluded.category,
  kind = excluded.kind,
  amount = excluded.amount,
  image_path = excluded.image_path;
