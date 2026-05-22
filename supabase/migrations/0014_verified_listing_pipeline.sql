-- Verified marketplace publishing pipeline.
-- Seller-submitted properties stay hidden until admin/employee verification
-- approves the underlying property/plot and marks the listing as published.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'submitted'
    CHECK (approval_status IN ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

UPDATE public.listings l
SET
  property_id = COALESCE(l.property_id, p.property_id),
  seller_id = COALESCE(l.seller_id, p.seller_id)
FROM public.plots p
WHERE l.plot_id = p.id
  AND (l.property_id IS NULL OR l.seller_id IS NULL);

UPDATE public.listings l
SET
  approval_status = CASE
    WHEN l.property_id IS NULL THEN 'approved'
    WHEN pr.verification_status = 'approved'
      AND COALESCE(pl.verification_status, 'approved') = 'approved'
      AND COALESCE(s.verification_status, 'approved') = 'approved'
    THEN 'approved'
    ELSE COALESCE(pr.verification_status, l.approval_status, 'submitted')
  END,
  is_published = CASE
    WHEN l.status = 'Active'
      AND (
        l.property_id IS NULL
        OR (
          pr.verification_status = 'approved'
          AND COALESCE(pl.verification_status, 'approved') = 'approved'
          AND COALESCE(s.verification_status, 'approved') = 'approved'
          AND pr.lifecycle_status IN ('available', 'registered', 'managed')
          AND COALESCE(pl.lifecycle_status, 'available') NOT IN ('sold', 'reserved', 'archived')
        )
      )
    THEN true
    ELSE false
  END,
  verified_at = CASE
    WHEN l.status = 'Active'
      AND (
        l.property_id IS NULL
        OR (
          pr.verification_status = 'approved'
          AND COALESCE(pl.verification_status, 'approved') = 'approved'
          AND COALESCE(s.verification_status, 'approved') = 'approved'
        )
      )
    THEN COALESCE(l.verified_at, now())
    ELSE l.verified_at
  END,
  published_at = CASE
    WHEN l.status = 'Active'
      AND (
        l.property_id IS NULL
        OR (
          pr.verification_status = 'approved'
          AND COALESCE(pl.verification_status, 'approved') = 'approved'
          AND COALESCE(s.verification_status, 'approved') = 'approved'
        )
      )
    THEN COALESCE(l.published_at, now())
    ELSE l.published_at
  END
FROM public.properties pr
LEFT JOIN public.plots pl ON pl.property_id = pr.id
LEFT JOIN public.sellers s ON s.id = COALESCE(pr.seller_id, pl.seller_id)
WHERE pr.id = l.property_id
  AND (l.plot_id IS NULL OR pl.id = l.plot_id);

UPDATE public.listings
SET
  approval_status = 'approved',
  is_published = true,
  verified_at = COALESCE(verified_at, now()),
  published_at = COALESCE(published_at, now())
WHERE property_id IS NULL
  AND status = 'Active'
  AND approval_status = 'submitted';

DROP INDEX IF EXISTS idx_listings_property_id_unique;

CREATE INDEX IF NOT EXISTS idx_listings_property_id
  ON public.listings(property_id)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_verified_public
  ON public.listings(status, is_published, approval_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_property_seller
  ON public.listings(property_id, seller_id);

CREATE OR REPLACE FUNCTION app_private.is_public_verified_listing(check_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    LEFT JOIN public.properties p ON p.id = l.property_id
    LEFT JOIN public.plots pl ON pl.id = l.plot_id
    LEFT JOIN public.sellers s ON s.id = COALESCE(l.seller_id, p.seller_id, pl.seller_id)
    WHERE l.id = check_listing_id
      AND l.status = 'Active'
      AND l.is_published = true
      AND l.approval_status = 'approved'
      AND (
        l.property_id IS NULL
        OR (
          p.verification_status = 'approved'
          AND p.lifecycle_status IN ('available', 'registered', 'managed')
        )
      )
      AND (
        l.plot_id IS NULL
        OR (
          pl.verification_status = 'approved'
          AND COALESCE(pl.lifecycle_status, 'available') NOT IN ('sold', 'reserved', 'archived')
          AND COALESCE(pl.status, 'available') NOT IN ('sold', 'reserved')
        )
      )
      AND (s.id IS NULL OR s.verification_status = 'approved')
  );
$$;

DROP POLICY IF EXISTS "listings_public_read_active" ON public.listings;
DROP POLICY IF EXISTS "listings_owner_write" ON public.listings;
DROP POLICY IF EXISTS "listings_verified_select" ON public.listings;
CREATE POLICY "listings_verified_select"
  ON public.listings
  FOR SELECT
  TO anon, authenticated
  USING (
    app_private.is_public_verified_listing(id)
    OR owner_id = (SELECT auth.uid())
    OR app_private.is_admin()
    OR (seller_id IS NOT NULL AND app_private.is_seller_record(seller_id))
    OR (property_id IS NOT NULL AND app_private.can_access_property(property_id))
  );

DROP POLICY IF EXISTS "listings_admin_write" ON public.listings;
CREATE POLICY "listings_admin_write"
  ON public.listings
  FOR ALL
  TO authenticated
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
