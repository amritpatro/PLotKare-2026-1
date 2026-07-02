-- PRODUCTION SEED DATA
-- Run after delete-demo-accounts.sql
-- Safe to run on a fresh production database

-- PlotKare uses public.amenities as the launch amenity catalog table.
-- The prompt mentioned amenities_catalog, but that table does not exist in this schema.

INSERT INTO public.amenities (id, name, category, kind, amount, active)
VALUES
  ('monthly-boundary-inspection', 'Monthly Boundary Inspection', 'Inspection', 'monthly', 0, true),
  ('encroachment-monitoring', 'Encroachment Monitoring', 'Security', 'monthly', 0, true),
  ('ec-certificate-tracking', 'EC Certificate Tracking', 'Documents', 'monthly', 0, true),
  ('property-tax-reminder', 'Property Tax Reminder', 'Documents', 'monthly', 0, true),
  ('document-vault', 'Document Vault', 'Documents', 'monthly', 0, true),
  ('container-farming', 'Container Farming', 'Agriculture', 'monthly', 2500, true),
  ('mushroom-bed-farming', 'Mushroom Bed Farming', 'Agriculture', 'monthly', 2000, true),
  ('herbal-garden', 'Herbal Garden', 'Agriculture', 'monthly', 1500, true),
  ('drip-irrigation', 'Drip Irrigation', 'Agriculture', 'monthly', 3000, true),
  ('rainwater-harvesting', 'Rainwater Harvesting', 'Sustainability', 'one-time', 5000, true),
  ('solar-panel-hosting', 'Solar Panel Hosting', 'Energy', 'monthly', 8000, true),
  ('boundary-fencing', 'Boundary Fencing', 'Security', 'one-time', 15000, true),
  ('cctv-installation', 'CCTV Installation', 'Security', 'one-time', 10000, true),
  ('legal-sign-boards', 'Legal Sign Boards', 'Legal', 'one-time', 3000, true),
  ('storage-unit', 'Storage Unit', 'Infrastructure', 'monthly', 5000, true),
  ('flower-bed-maintenance', 'Flower Bed Maintenance', 'Horticulture', 'monthly', 1500, true),
  ('compost-unit', 'Compost Unit', 'Sustainability', 'monthly', 2000, true),
  ('vendor-coordination', 'Vendor Coordination', 'Maintenance', 'monthly', 0, true),
  ('quarterly-review', 'Quarterly Review', 'Reporting', 'monthly', 0, true),
  ('legal-document-monitoring', 'Legal Document Monitoring', 'Legal', 'monthly', 0, true)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  category = excluded.category,
  kind = excluded.kind,
  amount = excluded.amount,
  active = excluded.active,
  updated_at = now();
