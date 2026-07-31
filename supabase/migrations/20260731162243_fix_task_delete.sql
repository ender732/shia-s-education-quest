-- Task delete: curriculum rows have created_by NULL, so "delete own" RLS
-- silently no-ops (HTTP 204, 0 rows). Parents were shown a false "Task removed"
-- toast. Provide a permission-checked RPC + admin delete policy.
-- Curriculum seed tasks (created_by IS NULL) are not deletable by parents.

CREATE OR REPLACE FUNCTION public.delete_task(_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _task public.tasks%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _task
  FROM public.tasks
  WHERE id = _task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF _task.created_by IS NULL THEN
    RAISE EXCEPTION 'Curriculum lessons cannot be removed'
      USING ERRCODE = '42501';
  END IF;

  IF public.is_admin(_uid) OR (
    public.is_parent(_uid) AND _task.created_by = _uid
  ) THEN
    DELETE FROM public.tasks WHERE id = _task_id;
    RETURN jsonb_build_object('id', _task.id, 'title', _task.title);
  END IF;

  RAISE EXCEPTION 'You do not have permission to remove this task'
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.delete_task(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_task(UUID) TO authenticated;

DROP POLICY IF EXISTS "tasks admin delete" ON public.tasks;
CREATE POLICY "tasks admin delete"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
