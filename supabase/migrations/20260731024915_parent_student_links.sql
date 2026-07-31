-- Parent ↔ student linking via shareable student link_code (UUID).
-- Parents only see progress for students they have explicitly linked.

-- 1) Shareable link code on every profile (students share theirs with parents)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS link_code UUID NOT NULL DEFAULT gen_random_uuid();

-- Backfill any rows that somehow lack a code (IF NOT EXISTS + NOT NULL DEFAULT covers new inserts;
-- unique index below enforces uniqueness for existing rows too)
UPDATE public.profiles
SET link_code = gen_random_uuid()
WHERE link_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_link_code_key ON public.profiles (link_code);

-- 2) Explicit parent–student link table
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT parent_student_links_parent_student_key UNIQUE (parent_id, student_id),
  CONSTRAINT parent_student_links_no_self_check CHECK (parent_id <> student_id)
);

GRANT SELECT, DELETE ON public.parent_student_links TO authenticated;
GRANT ALL ON public.parent_student_links TO service_role;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS parent_student_links_parent_id_idx
  ON public.parent_student_links (parent_id);
CREATE INDEX IF NOT EXISTS parent_student_links_student_id_idx
  ON public.parent_student_links (student_id);

-- 3) Helpers (SECURITY DEFINER; revoke from public/anon)
CREATE OR REPLACE FUNCTION public.is_linked_student(_student_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_links
    WHERE parent_id = auth.uid()
      AND student_id = _student_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_linked_student(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_linked_student(UUID) TO authenticated;

-- Link by code: validates student role + code without exposing link_code for browsing
CREATE OR REPLACE FUNCTION public.link_student_by_code(_code UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _parent_id UUID := auth.uid();
  _student_id UUID;
BEGIN
  IF _parent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_parent(_parent_id) THEN
    RAISE EXCEPTION 'Only parent accounts can link students';
  END IF;

  SELECT p.id INTO _student_id
  FROM public.profiles p
  WHERE p.link_code = _code
    AND p.role = 'student'
  LIMIT 1;

  IF _student_id IS NULL THEN
    RAISE EXCEPTION 'Invalid parent link code';
  END IF;

  IF _student_id = _parent_id THEN
    RAISE EXCEPTION 'Cannot link to yourself';
  END IF;

  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (_parent_id, _student_id)
  ON CONFLICT (parent_id, student_id) DO NOTHING;

  RETURN _student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_student_by_code(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_student_by_code(UUID) TO authenticated;

-- 4) parent_student_links RLS
DROP POLICY IF EXISTS "links select own parent" ON public.parent_student_links;
CREATE POLICY "links select own parent"
  ON public.parent_student_links FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "links select as student" ON public.parent_student_links;
CREATE POLICY "links select as student"
  ON public.parent_student_links FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- No direct INSERT for clients — use link_student_by_code (SECURITY DEFINER)

DROP POLICY IF EXISTS "links delete own parent" ON public.parent_student_links;
CREATE POLICY "links delete own parent"
  ON public.parent_student_links FOR DELETE TO authenticated
  USING (parent_id = auth.uid());

-- 5) Tighten profiles SELECT: own row, or linked students only (no all-students for parents)
DROP POLICY IF EXISTS "own profile read" ON public.profiles;

DROP POLICY IF EXISTS "profiles read own" ON public.profiles;
CREATE POLICY "profiles read own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles read linked students" ON public.profiles;
CREATE POLICY "profiles read linked students"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_parent(auth.uid())
    AND public.is_linked_student(id)
  );

-- 6) Restrict task_progress / book_reports parent reads to linked students
DROP POLICY IF EXISTS "progress read own or parent" ON public.task_progress;
CREATE POLICY "progress read own or linked parent"
  ON public.task_progress FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (public.is_parent(auth.uid()) AND public.is_linked_student(user_id))
  );

DROP POLICY IF EXISTS "progress delete own or parent" ON public.task_progress;
CREATE POLICY "progress delete own or linked parent"
  ON public.task_progress FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (public.is_parent(auth.uid()) AND public.is_linked_student(user_id))
  );

DROP POLICY IF EXISTS "reports read" ON public.book_reports;
CREATE POLICY "reports read own or linked parent"
  ON public.book_reports FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR (public.is_parent(auth.uid()) AND public.is_linked_student(student_id))
  );
