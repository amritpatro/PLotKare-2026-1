-- Follow-up indexes for the verified listing pipeline foreign keys.

CREATE INDEX IF NOT EXISTS idx_listings_seller_id
  ON public.listings(seller_id)
  WHERE seller_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listings_verified_by
  ON public.listings(verified_by)
  WHERE verified_by IS NOT NULL;
