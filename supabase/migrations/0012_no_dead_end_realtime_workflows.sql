-- No-dead-end SaaS hardening: support replies, verification source of truth,
-- consultation requests, scoped realtime publication, and tighter workflow RLS.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0 CHECK (escalation_level >= 0),
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_status_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN (
    'open',
    'assigned',
    'in_progress',
    'waiting_on_customer',
    'waiting_on_admin',
    'escalated',
    'resolved',
    'closed'
  ));

CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'internal')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('property', 'seller', 'owner', 'customer', 'document')),
  entity_id UUID NOT NULL,
  requester_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'needs_clarification')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_at TIMESTAMPTZ,
  escalation_level INTEGER NOT NULL DEFAULT 0 CHECK (escalation_level >= 0),
  admin_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS public.consultation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  role TEXT,
  source TEXT NOT NULL DEFAULT 'dashboard',
  subject TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'contacted', 'resolved', 'closed')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS ticket_replies_updated_at ON public.ticket_replies;
CREATE TRIGGER ticket_replies_updated_at BEFORE UPDATE ON public.ticket_replies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS verification_requests_updated_at ON public.verification_requests;
CREATE TRIGGER verification_requests_updated_at BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS consultation_requests_updated_at ON public.consultation_requests;
CREATE TRIGGER consultation_requests_updated_at BEFORE UPDATE ON public.consultation_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_replies_select_scoped" ON public.ticket_replies;
CREATE POLICY "ticket_replies_select_scoped"
  ON public.ticket_replies
  FOR SELECT
  USING (
    app_private.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.support_tickets st
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
  );

DROP POLICY IF EXISTS "ticket_replies_insert_scoped" ON public.ticket_replies;
CREATE POLICY "ticket_replies_insert_scoped"
  ON public.ticket_replies
  FOR INSERT
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND (
      app_private.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.support_tickets st
        WHERE st.id = ticket_replies.ticket_id
          AND st.requester_id = (SELECT auth.uid())
          AND ticket_replies.visibility = 'public'
      )
      OR EXISTS (
        SELECT 1
        FROM public.employees e
        WHERE e.profile_id = (SELECT auth.uid())
          AND e.active = TRUE
      )
    )
  );

DROP POLICY IF EXISTS "ticket_replies_admin_update" ON public.ticket_replies;
CREATE POLICY "ticket_replies_admin_update"
  ON public.ticket_replies
  FOR UPDATE
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

DROP POLICY IF EXISTS "verification_requests_select_scoped" ON public.verification_requests;
CREATE POLICY "verification_requests_select_scoped"
  ON public.verification_requests
  FOR SELECT
  USING (
    app_private.is_admin()
    OR requester_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = verification_requests.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  );

DROP POLICY IF EXISTS "verification_requests_admin_all" ON public.verification_requests;
CREATE POLICY "verification_requests_admin_all"
  ON public.verification_requests
  FOR ALL
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

DROP POLICY IF EXISTS "verification_requests_employee_update_assigned" ON public.verification_requests;
CREATE POLICY "verification_requests_employee_update_assigned"
  ON public.verification_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = verification_requests.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = verification_requests.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  );

DROP POLICY IF EXISTS "consultation_requests_select_scoped" ON public.consultation_requests;
CREATE POLICY "consultation_requests_select_scoped"
  ON public.consultation_requests
  FOR SELECT
  USING (app_private.is_admin() OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "consultation_requests_insert_own" ON public.consultation_requests;
CREATE POLICY "consultation_requests_insert_own"
  ON public.consultation_requests
  FOR INSERT
  WITH CHECK (app_private.is_admin() OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "consultation_requests_admin_update" ON public.consultation_requests;
CREATE POLICY "consultation_requests_admin_update"
  ON public.consultation_requests
  FOR UPDATE
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

DROP POLICY IF EXISTS "notifications_recipient_all" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_recipient_or_admin" ON public.notifications;
CREATE POLICY "notifications_select_recipient_or_admin"
  ON public.notifications
  FOR SELECT
  USING (recipient_id = (SELECT auth.uid()) OR app_private.is_admin());

DROP POLICY IF EXISTS "notifications_update_own_read_state" ON public.notifications;
CREATE POLICY "notifications_update_own_read_state"
  ON public.notifications
  FOR UPDATE
  USING (recipient_id = (SELECT auth.uid()) OR app_private.is_admin())
  WITH CHECK (recipient_id = (SELECT auth.uid()) OR app_private.is_admin());

DROP POLICY IF EXISTS "notifications_admin_insert" ON public.notifications;
CREATE POLICY "notifications_admin_insert"
  ON public.notifications
  FOR INSERT
  WITH CHECK (app_private.is_admin() OR actor_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "support_tickets_access_write" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_requester" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_requester"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (requester_id = (SELECT auth.uid()) OR app_private.is_admin());

DROP POLICY IF EXISTS "support_tickets_update_admin_or_assignee" ON public.support_tickets;
CREATE POLICY "support_tickets_update_admin_or_assignee"
  ON public.support_tickets
  FOR UPDATE
  USING (
    app_private.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = support_tickets.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  )
  WITH CHECK (
    app_private.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = support_tickets.assigned_employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_replies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_requests TO authenticated;

CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_created
  ON public.ticket_replies(ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_requests_status_priority
  ON public.verification_requests(status, priority, due_at);

CREATE INDEX IF NOT EXISTS idx_verification_requests_assignee
  ON public.verification_requests(assigned_employee_id, status);

CREATE INDEX IF NOT EXISTS idx_verification_requests_requester
  ON public.verification_requests(requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consultation_requests_user_status
  ON public.consultation_requests(user_id, status);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_replies;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_requests;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_events;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_task_assignments;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inspections;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_requests;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
