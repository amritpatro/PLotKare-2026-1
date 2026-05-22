-- Day 4: Employee operations, field reporting, and admin-visible work history.

ALTER TABLE public.admin_task_assignments
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_employee_note TEXT;

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS field_condition TEXT
    CHECK (field_condition IS NULL OR field_condition IN ('good', 'watch', 'issue_found', 'critical')),
  ADD COLUMN IF NOT EXISTS issue_severity TEXT
    CHECK (issue_severity IS NULL OR issue_severity IN ('none', 'low', 'medium', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS employee_notes TEXT,
  ADD COLUMN IF NOT EXISTS next_visit_at TIMESTAMPTZ;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS employee_notes TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS employee_notes TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.employee_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  note TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employee_work_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage employee work logs" ON public.employee_work_logs;
DROP POLICY IF EXISTS "Employees read own work logs" ON public.employee_work_logs;
DROP POLICY IF EXISTS "Employees create own work logs" ON public.employee_work_logs;
DROP POLICY IF EXISTS "Employee work logs select" ON public.employee_work_logs;
DROP POLICY IF EXISTS "Employee work logs insert" ON public.employee_work_logs;
DROP POLICY IF EXISTS "Admins update employee work logs" ON public.employee_work_logs;
DROP POLICY IF EXISTS "Admins delete employee work logs" ON public.employee_work_logs;

CREATE POLICY "Employee work logs select"
  ON public.employee_work_logs
  FOR SELECT
  USING (
    app_private.is_admin()
    OR
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_work_logs.employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  );

CREATE POLICY "Employee work logs insert"
  ON public.employee_work_logs
  FOR INSERT
  WITH CHECK (
    app_private.is_admin()
    OR
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = employee_work_logs.employee_id
        AND e.profile_id = (SELECT auth.uid())
        AND e.active = TRUE
    )
  );

CREATE POLICY "Admins update employee work logs"
  ON public.employee_work_logs
  FOR UPDATE
  USING (app_private.is_admin())
  WITH CHECK (app_private.is_admin());

CREATE POLICY "Admins delete employee work logs"
  ON public.employee_work_logs
  FOR DELETE
  USING (app_private.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_work_logs TO authenticated;

CREATE INDEX IF NOT EXISTS idx_employee_work_logs_employee_created
  ON public.employee_work_logs(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_work_logs_profile_id
  ON public.employee_work_logs(profile_id);

CREATE INDEX IF NOT EXISTS idx_employee_work_logs_entity
  ON public.employee_work_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_admin_task_assignments_status_due
  ON public.admin_task_assignments(status, due_at);

CREATE INDEX IF NOT EXISTS idx_inspections_assignee_status
  ON public.inspections(assigned_employee_id, status, scheduled_for);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_work_logs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
