-- Follow-up hardening for projects that already applied migration 0017.

DROP POLICY IF EXISTS "customer_property_requests_admin_update" ON public.customer_property_requests;
DROP POLICY IF EXISTS "customer_property_requests_employee_update_assigned" ON public.customer_property_requests;
DROP POLICY IF EXISTS "customer_property_requests_operations_update" ON public.customer_property_requests;

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
