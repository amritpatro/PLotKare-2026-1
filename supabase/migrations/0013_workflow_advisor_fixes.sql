-- Advisor cleanup for the realtime workflow tables added in 0012.

CREATE INDEX IF NOT EXISTS idx_ticket_replies_author_created
  ON public.ticket_replies(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_replies_author_employee
  ON public.ticket_replies(author_employee_id)
  WHERE author_employee_id IS NOT NULL;

DROP POLICY IF EXISTS "verification_requests_admin_all" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_employee_update_assigned" ON public.verification_requests;

DROP POLICY IF EXISTS "verification_requests_admin_insert" ON public.verification_requests;
CREATE POLICY "verification_requests_admin_insert"
  ON public.verification_requests
  FOR INSERT
  WITH CHECK (app_private.is_admin());

DROP POLICY IF EXISTS "verification_requests_update_admin_or_assigned" ON public.verification_requests;
CREATE POLICY "verification_requests_update_admin_or_assigned"
  ON public.verification_requests
  FOR UPDATE
  USING (
    app_private.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = verification_requests.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  )
  WITH CHECK (
    app_private.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = verification_requests.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  );

DROP POLICY IF EXISTS "verification_requests_delete_admin" ON public.verification_requests;
CREATE POLICY "verification_requests_delete_admin"
  ON public.verification_requests
  FOR DELETE
  USING (app_private.is_admin());
