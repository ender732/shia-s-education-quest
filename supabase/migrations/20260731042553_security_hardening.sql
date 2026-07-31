-- Security hardening: RLS, storage, RPCs, profile/task guards, search_path.

-- ---------------------------------------------------------------------------
-- 1) Fix mutable search_path on helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.age_years_from_dob(_dob DATE)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _dob IS NULL THEN NULL
    ELSE EXTRACT(YEAR FROM age((timezone('utc', now()))::date, _dob))::INTEGER
  END;
$$;

CREATE OR REPLACE FUNCTION public.today_et()
RETURNS DATE
LANGUAGE SQL
STABLE
SET search_path = public
AS $$
  SELECT (timezone('America/New_York', now()))::date;
$$;

REVOKE ALL ON FUNCTION public.age_years_from_dob(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.age_years_from_dob(DATE) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) assigned_books: parents see own; students see shared library
--    (prevents parent↔parent IDOR on book metadata)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "books read" ON public.assigned_books;
CREATE POLICY "books read"
  ON public.assigned_books FOR SELECT TO authenticated
  USING (
    assigned_by = auth.uid()
    OR NOT public.is_parent(auth.uid())
  );

-- Students may only delete books flagged for them when linked to the assigner
-- (or legacy rows with null assigned_by).
DROP POLICY IF EXISTS "books student delete" ON public.assigned_books;
CREATE POLICY "books student delete"
  ON public.assigned_books FOR DELETE TO authenticated
  USING (
    student_may_delete = true
    AND NOT public.is_parent(auth.uid())
    AND (
      assigned_by IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.parent_student_links psl
        WHERE psl.parent_id = assigned_books.assigned_by
          AND psl.student_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Storage reads: respect assigned_books visibility via RLS-aware EXISTS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "books files read" ON storage.objects;
CREATE POLICY "books files read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assigned-books'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.assigned_books ab
        WHERE ab.pdf_url = name
      )
    )
  );

DROP POLICY IF EXISTS "books files student delete" ON storage.objects;
CREATE POLICY "books files student delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assigned-books'
    AND NOT public.is_parent(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assigned_books ab
      WHERE ab.pdf_url = name
        AND ab.student_may_delete = true
        AND (
          ab.assigned_by IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.parent_student_links psl
            WHERE psl.parent_id = ab.assigned_by
              AND psl.student_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4) tasks: stop any-authenticated UPDATE/DELETE privilege escalation
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks update" ON public.tasks;
CREATE POLICY "tasks parent update own"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.is_parent(auth.uid())
    AND created_by = auth.uid()
  )
  WITH CHECK (
    public.is_parent(auth.uid())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "tasks parent delete" ON public.tasks;
CREATE POLICY "tasks parent delete own"
  ON public.tasks FOR DELETE TO authenticated
  USING (
    public.is_parent(auth.uid())
    AND created_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 5) profiles: lock link_code; bound XP/level mutations
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

    -- Keep level derived from XP so clients cannot set an arbitrary level
    NEW.level := GREATEST(1, (COALESCE(NEW.xp_points, 0) / 500) + 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_sensitive_columns ON public.profiles;
CREATE TRIGGER profiles_guard_sensitive_columns
  BEFORE UPDATE OF link_code, xp_points, level
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_sensitive_columns();

REVOKE ALL ON FUNCTION public.guard_profile_sensitive_columns() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) daily_activity: only SECURITY DEFINER RPCs may write; harden RPCs
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.daily_activity FROM authenticated;
-- SELECT remains for own rows (leaderboard uses definer RPC)

CREATE OR REPLACE FUNCTION public.upsert_daily_seconds(
  _task_id UUID,
  _seconds INTEGER,
  _subject_id UUID DEFAULT NULL,
  _activity_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _today DATE := public.today_et();
  _day DATE;
  _add INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _seconds IS NULL OR _seconds <= 0 THEN
    RETURN;
  END IF;

  -- Cap per call (tracker flushes ~every 20s; allow short catch-up)
  _add := LEAST(_seconds, 300);

  -- Only today or yesterday ET (midnight flush); reject backdating / future dates
  _day := COALESCE(_activity_date, _today);
  IF _day < (_today - 1) OR _day > _today THEN
    _day := _today;
  END IF;

  INSERT INTO public.daily_activity (user_id, activity_date, task_id, subject_id, seconds_spent, updated_at)
  VALUES (_uid, _day, _task_id, _subject_id, _add, now())
  ON CONFLICT (user_id, activity_date, task_id)
  DO UPDATE SET
    seconds_spent = LEAST(public.daily_activity.seconds_spent + EXCLUDED.seconds_spent, 86400),
    subject_id = COALESCE(EXCLUDED.subject_id, public.daily_activity.subject_id),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_daily_score(
  _task_id UUID,
  _score INTEGER,
  _subject_id UUID DEFAULT NULL,
  _activity_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _today DATE := public.today_et();
  _day DATE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _score IS NULL OR _score < 0 OR _score > 100 THEN
    RAISE EXCEPTION 'Score must be between 0 and 100';
  END IF;

  _day := COALESCE(_activity_date, _today);
  IF _day < (_today - 1) OR _day > _today THEN
    _day := _today;
  END IF;

  INSERT INTO public.daily_activity (user_id, activity_date, task_id, subject_id, seconds_spent, best_score, updated_at)
  VALUES (_uid, _day, _task_id, _subject_id, 0, _score, now())
  ON CONFLICT (user_id, activity_date, task_id)
  DO UPDATE SET
    best_score = GREATEST(COALESCE(public.daily_activity.best_score, 0), EXCLUDED.best_score),
    subject_id = COALESCE(EXCLUDED.subject_id, public.daily_activity.subject_id),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_daily_seconds(UUID, INTEGER, UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_daily_seconds(UUID, INTEGER, UUID, DATE) TO authenticated;

REVOKE ALL ON FUNCTION public.upsert_daily_score(UUID, INTEGER, UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_daily_score(UUID, INTEGER, UUID, DATE) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) link_student_by_code: clearer constant-time-ish failure (still UUID entropy)
--    + require code non-null
-- ---------------------------------------------------------------------------
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

  IF _code IS NULL THEN
    RAISE EXCEPTION 'Invalid parent link code';
  END IF;

  IF NOT public.is_parent(_parent_id) THEN
    RAISE EXCEPTION 'Only parent accounts can link students';
  END IF;

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

-- ---------------------------------------------------------------------------
-- 8) Rate-limit metadata for parent link-code emails
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS link_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.link_email_sent_at IS
  'Last time a parent link-code email was sent (rate limiting).';
