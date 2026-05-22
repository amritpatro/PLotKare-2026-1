-- Day 4 advisor fixes for employee work logs.

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
    OR EXISTS (
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
    OR EXISTS (
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

CREATE INDEX IF NOT EXISTS idx_employee_work_logs_profile_id
  ON public.employee_work_logs(profile_id);
