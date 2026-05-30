-- Add listing statuses for featured and archived listings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.listing_status'::regtype
      AND enumlabel = 'featured'
  ) THEN
    ALTER TYPE public.listing_status ADD VALUE 'featured';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.listing_status'::regtype
      AND enumlabel = 'archived'
  ) THEN
    ALTER TYPE public.listing_status ADD VALUE 'archived';
  END IF;
END $$;
