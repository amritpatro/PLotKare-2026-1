-- Profile, document, support, and customer property workflow repair.
-- Keeps sensitive storage private while making operational actions explicit.

ALTER TABLE public.property_documents
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS requirement_level TEXT NOT NULL DEFAULT 'optional'
    CHECK (requirement_level IN ('mandatory', 'optional')),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS upload_finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replaces_document_id UUID REFERENCES public.property_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS withdrawal_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

ALTER TABLE public.property_documents
  DROP CONSTRAINT IF EXISTS property_documents_verification_status_check;

ALTER TABLE public.property_documents
  ADD CONSTRAINT property_documents_verification_status_check
  CHECK (verification_status IN (
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'needs_clarification',
    'withdrawal_requested',
    'withdrawn',
    'expired'
  ));

UPDATE public.property_documents
SET upload_finalized_at = COALESCE(upload_finalized_at, created_at)
WHERE upload_finalized_at IS NULL;

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id = 'property-documents';

DROP POLICY IF EXISTS "property_documents_update" ON public.property_documents;
CREATE POLICY "property_documents_admin_update"
  ON public.property_documents
  FOR UPDATE TO authenticated
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS ticket_reference TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

UPDATE public.support_tickets
SET ticket_reference = 'PK-SUP-' || UPPER(LEFT(REPLACE(id::TEXT, '-', ''), 8))
WHERE ticket_reference IS NULL;

ALTER TABLE public.support_tickets
  ALTER COLUMN ticket_reference SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_reference
  ON public.support_tickets(ticket_reference);

CREATE OR REPLACE FUNCTION public.assign_support_ticket_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.ticket_reference IS NULL OR BTRIM(NEW.ticket_reference) = '' THEN
    NEW.ticket_reference := 'PK-SUP-' || UPPER(LEFT(REPLACE(NEW.id::TEXT, '-', ''), 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_tickets_reference_before_insert ON public.support_tickets;
CREATE TRIGGER support_tickets_reference_before_insert
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.assign_support_ticket_reference();

DROP POLICY IF EXISTS "ticket_replies_insert_scoped" ON public.ticket_replies;
CREATE POLICY "ticket_replies_insert_scoped"
  ON public.ticket_replies
  FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      app_private.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.support_tickets st
        WHERE st.id = ticket_replies.ticket_id
          AND st.requester_id = (SELECT auth.uid())
          AND ticket_replies.visibility = 'public'
      )
      OR EXISTS (
        SELECT 1
        FROM public.support_tickets st
        JOIN public.employees e ON e.id = st.assigned_employee_id
        WHERE st.id = ticket_replies.ticket_id
          AND e.profile_id = (SELECT auth.uid())
          AND e.active = TRUE
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.customer_property_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_kind TEXT NOT NULL CHECK (property_kind IN ('plot', 'apartment', 'rental', 'managed_property')),
  property_title TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  relationship_type TEXT NOT NULL DEFAULT 'owner',
  notes TEXT,
  linked_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS customer_property_requests_updated_at ON public.customer_property_requests;
CREATE TRIGGER customer_property_requests_updated_at BEFORE UPDATE ON public.customer_property_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.customer_property_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_property_requests_select_scoped" ON public.customer_property_requests;
CREATE POLICY "customer_property_requests_select_scoped"
  ON public.customer_property_requests FOR SELECT TO authenticated
  USING (
    app_private.is_admin()
    OR requester_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = customer_property_requests.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  );

DROP POLICY IF EXISTS "customer_property_requests_insert_own" ON public.customer_property_requests;
CREATE POLICY "customer_property_requests_insert_own"
  ON public.customer_property_requests FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = (SELECT auth.uid())
    AND app_private.is_customer_record(customer_id)
    AND status = 'submitted'
  );

DROP POLICY IF EXISTS "customer_property_requests_admin_update" ON public.customer_property_requests;
DROP POLICY IF EXISTS "customer_property_requests_employee_update_assigned" ON public.customer_property_requests;
CREATE POLICY "customer_property_requests_operations_update"
  ON public.customer_property_requests FOR UPDATE TO authenticated
  USING (
    app_private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = customer_property_requests.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.employee_role = 'verification_agent'
        AND e.active = TRUE
    )
  )
  WITH CHECK (
    app_private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = customer_property_requests.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.employee_role = 'verification_agent'
        AND e.active = TRUE
    )
  );

ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_entity_type_check;

ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_entity_type_check
  CHECK (entity_type IN ('property', 'seller', 'owner', 'customer', 'document', 'property_link_request'));

ALTER TABLE public.verification_requests
  DROP CONSTRAINT IF EXISTS verification_requests_status_check;

ALTER TABLE public.verification_requests
  ADD CONSTRAINT verification_requests_status_check
  CHECK (status IN (
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'needs_clarification',
    'withdrawal_requested',
    'withdrawn',
    'expired'
  ));

GRANT SELECT, INSERT, UPDATE ON public.customer_property_requests TO authenticated;

CREATE INDEX IF NOT EXISTS idx_property_documents_uploader_type_created
  ON public.property_documents(uploaded_by, document_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_property_requests_requester_status
  ON public.customer_property_requests(requester_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_property_requests_assignee_status
  ON public.customer_property_requests(assigned_employee_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_property_requests_customer_id
  ON public.customer_property_requests(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_property_requests_linked_property_id
  ON public.customer_property_requests(linked_property_id);

CREATE INDEX IF NOT EXISTS idx_customer_property_requests_reviewed_by
  ON public.customer_property_requests(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_property_documents_reviewed_by
  ON public.property_documents(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_property_documents_replaces_document_id
  ON public.property_documents(replaces_document_id);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.property_documents;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_property_requests;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
