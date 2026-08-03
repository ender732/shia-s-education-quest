-- Security baseline v1 (OWASP / ASVS-minded):
-- 1) Stop role-helper enumeration for arbitrary UUIDs
-- 2) Private lesson-worksheet PDFs (uploader + admin only)
-- 3) Profile streak / XP award integrity guards
-- 4) Cap xp_awarded on progress & submissions
-- 5) Parents cannot delete linked students' task_progress
-- 6) Soft rate limit on link_student_by_code attempts

-- ---------------------------------------------------------------------------
-- 1) is_parent / is_admin: only answer for the caller (auth.uid())
--    RLS and RPCs already pass auth.uid(); this blocks probing other accounts.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_parent(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (_uid IS NOT NULL AND _uid = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = _uid
        AND role IN ('parent', 'admin')
    );
$$;

REVOKE ALL ON FUNCTION public.is_parent(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parent(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (_uid IS NOT NULL AND _uid = auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = _uid
        AND role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) lesson-worksheets storage: source PDFs are parent uploads for AI drafting.
--    Students use lesson_payload, not the raw PDF — do not leak published keys.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "lesson worksheets read" ON storage.objects;
CREATE POLICY "lesson worksheets read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-worksheets'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3) profiles: streak_days soft guard (extend sensitive-column trigger)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.link_code IS DISTINCT FROM OLD.link_code THEN
      RAISE EXCEPTION 'link_code cannot be changed';
    END IF;

    IF NEW.xp_points IS DISTINCT FROM OLD.xp_points THEN
      IF NEW.xp_points < 0 THEN
        RAISE EXCEPTION 'xp_points cannot be negative';
      END IF;
      -- Soft anti-cheat: max +300 XP per row update (matches top AI grade award)
      IF NEW.xp_points > OLD.xp_points + 300 THEN
        RAISE EXCEPTION 'xp_points increase too large';
      END IF;
    END IF;

    IF NEW.streak_days IS DISTINCT FROM OLD.streak_days THEN
      IF NEW.streak_days < 0 THEN
        RAISE EXCEPTION 'streak_days cannot be negative';
      END IF;
      -- Daily touch increments by at most +1 (or resets to 1)
      IF NEW.streak_days > OLD.streak_days + 1 THEN
        RAISE EXCEPTION 'streak_days increase too large';
      END IF;
    END IF;

    -- Keep level derived from XP so clients cannot set an arbitrary level
    NEW.level := GREATEST(1, (COALESCE(NEW.xp_points, 0) / 500) + 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_sensitive_columns ON public.profiles;
CREATE TRIGGER profiles_guard_sensitive_columns
  BEFORE UPDATE OF link_code, xp_points, level, streak_days
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_sensitive_columns();

REVOKE ALL ON FUNCTION public.guard_profile_sensitive_columns() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Bound xp_awarded on client-writable scoring tables
-- ---------------------------------------------------------------------------
UPDATE public.task_progress SET xp_awarded = 500 WHERE xp_awarded > 500;
UPDATE public.worksheet_submissions SET xp_awarded = 500 WHERE xp_awarded > 500;
UPDATE public.book_reports SET xp_awarded = 500 WHERE xp_awarded > 500;
UPDATE public.task_progress SET xp_awarded = 0 WHERE xp_awarded < 0;
UPDATE public.worksheet_submissions SET xp_awarded = 0 WHERE xp_awarded < 0;
UPDATE public.book_reports SET xp_awarded = 0 WHERE xp_awarded < 0;

ALTER TABLE public.task_progress
  DROP CONSTRAINT IF EXISTS task_progress_xp_awarded_bounds;
ALTER TABLE public.task_progress
  ADD CONSTRAINT task_progress_xp_awarded_bounds
  CHECK (xp_awarded >= 0 AND xp_awarded <= 500);

ALTER TABLE public.worksheet_submissions
  DROP CONSTRAINT IF EXISTS worksheet_submissions_xp_awarded_bounds;
ALTER TABLE public.worksheet_submissions
  ADD CONSTRAINT worksheet_submissions_xp_awarded_bounds
  CHECK (xp_awarded >= 0 AND xp_awarded <= 500);

ALTER TABLE public.book_reports
  DROP CONSTRAINT IF EXISTS book_reports_xp_awarded_bounds;
ALTER TABLE public.book_reports
  ADD CONSTRAINT book_reports_xp_awarded_bounds
  CHECK (xp_awarded >= 0 AND xp_awarded <= 500);

CREATE OR REPLACE FUNCTION public.guard_task_progress_xp_awarded()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.xp_awarded > 0
    AND NEW.xp_awarded IS DISTINCT FROM OLD.xp_awarded
  THEN
    RAISE EXCEPTION 'xp_awarded cannot be changed after it is set';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_progress_guard_xp_awarded ON public.task_progress;
CREATE TRIGGER task_progress_guard_xp_awarded
  BEFORE UPDATE OF xp_awarded
  ON public.task_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_task_progress_xp_awarded();

REVOKE ALL ON FUNCTION public.guard_task_progress_xp_awarded() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) task_progress DELETE: own rows only (parents retain SELECT via linked policy)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "progress delete own or linked parent" ON public.task_progress;
DROP POLICY IF EXISTS "progress delete own or parent" ON public.task_progress;
CREATE POLICY "progress delete own"
  ON public.task_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6) link_student_by_code: soft rate limit (UUID entropy remains primary control)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parent_link_attempts (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parent_link_attempts_parent_recent_idx
  ON public.parent_link_attempts (parent_id, attempted_at DESC);

ALTER TABLE public.parent_link_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.parent_link_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.parent_link_attempts TO service_role;
-- No client policies: only SECURITY DEFINER RPCs write/read this table.

CREATE OR REPLACE FUNCTION public.link_student_by_code(_code UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _parent_id UUID := auth.uid();
  _student_id UUID;
  _recent INTEGER;
BEGIN
  IF _parent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _code IS NULL THEN
    RAISE EXCEPTION 'Invalid parent link code';
  END IF;

  IF NOT public.is_parent(_parent_id) THEN
    RAISE EXCEPTION 'Only parent accounts can link students';
  END IF;

  -- Soft rate limit: 10 attempts / parent / 15 minutes (failed + successful)
  DELETE FROM public.parent_link_attempts
  WHERE parent_id = _parent_id
    AND attempted_at < now() - interval '15 minutes';

  SELECT count(*)::INTEGER INTO _recent
  FROM public.parent_link_attempts
  WHERE parent_id = _parent_id
    AND attempted_at > now() - interval '15 minutes';

  IF _recent >= 10 THEN
    RAISE EXCEPTION 'Too many link attempts. Please wait a few minutes and try again.';
  END IF;

  INSERT INTO public.parent_link_attempts (parent_id) VALUES (_parent_id);

  SELECT p.id INTO _student_id
  FROM public.profiles p
  WHERE p.link_code = _code
    AND p.role = 'student'
  LIMIT 1;

  -- Same message whether missing or wrong role — reduces account enumeration
  IF _student_id IS NULL THEN
    RAISE EXCEPTION 'Invalid parent link code';
  END IF;

  IF _student_id = _parent_id THEN
    RAISE EXCEPTION 'Invalid parent link code';
  END IF;

  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (_parent_id, _student_id)
  ON CONFLICT (parent_id, student_id) DO NOTHING;

  RETURN _student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.link_student_by_code(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_student_by_code(UUID) TO authenticated;
