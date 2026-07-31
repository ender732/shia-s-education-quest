-- Daily quest challenge: time spent + best quiz score per student per NY calendar day.

CREATE TABLE public.daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  subject_id UUID NULL REFERENCES public.subjects(id) ON DELETE SET NULL,
  seconds_spent INTEGER NOT NULL DEFAULT 0 CHECK (seconds_spent >= 0),
  best_score INTEGER NULL CHECK (best_score IS NULL OR (best_score >= 0 AND best_score <= 100)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_date, task_id)
);

GRANT SELECT, INSERT, UPDATE ON public.daily_activity TO authenticated;
GRANT ALL ON public.daily_activity TO service_role;
ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

CREATE INDEX daily_activity_date_idx ON public.daily_activity (activity_date);
CREATE INDEX daily_activity_user_date_idx ON public.daily_activity (user_id, activity_date);

-- Own rows: full read (needed for UPDATE under RLS)
CREATE POLICY "daily_activity select own"
  ON public.daily_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "daily_activity insert own"
  ON public.daily_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "daily_activity update own"
  ON public.daily_activity FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Calendar date in America/New_York (Hudson Cliffs / NYC)
CREATE OR REPLACE FUNCTION public.today_et()
RETURNS DATE
LANGUAGE SQL
STABLE
AS $$
  SELECT (timezone('America/New_York', now()))::date;
$$;

REVOKE ALL ON FUNCTION public.today_et() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.today_et() TO authenticated;

-- Add active seconds for a task on today's ET date (or a provided date)
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
  _day DATE := COALESCE(_activity_date, public.today_et());
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _seconds IS NULL OR _seconds <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.daily_activity (user_id, activity_date, task_id, subject_id, seconds_spent, updated_at)
  VALUES (_uid, _day, _task_id, _subject_id, _seconds, now())
  ON CONFLICT (user_id, activity_date, task_id)
  DO UPDATE SET
    seconds_spent = public.daily_activity.seconds_spent + EXCLUDED.seconds_spent,
    subject_id = COALESCE(EXCLUDED.subject_id, public.daily_activity.subject_id),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_daily_seconds(UUID, INTEGER, UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_daily_seconds(UUID, INTEGER, UUID, DATE) TO authenticated;

-- Record quiz score; keeps the max for that task/day
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
  _day DATE := COALESCE(_activity_date, public.today_et());
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _score IS NULL OR _score < 0 OR _score > 100 THEN
    RAISE EXCEPTION 'Score must be between 0 and 100';
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

REVOKE ALL ON FUNCTION public.upsert_daily_score(UUID, INTEGER, UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_daily_score(UUID, INTEGER, UUID, DATE) TO authenticated;

-- Leaderboard: aggregated time + best score for a day (no emails)
CREATE OR REPLACE FUNCTION public.get_daily_leaderboard(_day DATE DEFAULT NULL)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  total_seconds BIGINT,
  best_score INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH day_agg AS (
    SELECT
      da.user_id,
      COALESCE(NULLIF(trim(p.display_name), ''), 'Explorer') AS display_name,
      SUM(da.seconds_spent)::BIGINT AS total_seconds,
      MAX(da.best_score)::INTEGER AS best_score
    FROM public.daily_activity da
    JOIN public.profiles p ON p.id = da.user_id
    WHERE da.activity_date = COALESCE(_day, public.today_et())
      AND p.role = 'student'
      AND (da.seconds_spent > 0 OR da.best_score IS NOT NULL)
    GROUP BY da.user_id, p.display_name
  )
  SELECT
    ROW_NUMBER() OVER (
      ORDER BY
        COALESCE(best_score, -1) DESC,
        total_seconds DESC,
        display_name ASC
    ) AS rank,
    day_agg.user_id,
    day_agg.display_name,
    day_agg.total_seconds,
    day_agg.best_score
  FROM day_agg
  ORDER BY rank;
$$;

REVOKE ALL ON FUNCTION public.get_daily_leaderboard(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_leaderboard(DATE) TO authenticated;
