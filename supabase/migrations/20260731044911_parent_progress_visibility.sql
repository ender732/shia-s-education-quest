-- Parent progress visibility:
-- 1) Treat admin like parent for guardian RLS helpers (admin role replaced parent for some accounts).
-- 2) Let linked parents/admins read daily_activity for study-time / quiz attempts.
-- 3) Reaffirm linked-student SELECT on profiles + task_progress.

-- ---------------------------------------------------------------------------
-- 1) is_parent: parent OR admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_parent(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _uid
      AND role IN ('parent', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_parent(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parent(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) daily_activity: parents may SELECT linked students' rows
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "daily_activity select linked parent" ON public.daily_activity;
CREATE POLICY "daily_activity select linked parent"
  ON public.daily_activity FOR SELECT TO authenticated
  USING (
    public.is_parent(auth.uid())
    AND public.is_linked_student(user_id)
  );

-- ---------------------------------------------------------------------------
-- 3) Reaffirm profiles + task_progress linked-parent reads
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles read linked students" ON public.profiles;
CREATE POLICY "profiles read linked students"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_parent(auth.uid())
    AND public.is_linked_student(id)
  );

DROP POLICY IF EXISTS "progress read own or linked parent" ON public.task_progress;
CREATE POLICY "progress read own or linked parent"
  ON public.task_progress FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (public.is_parent(auth.uid()) AND public.is_linked_student(user_id))
  );
