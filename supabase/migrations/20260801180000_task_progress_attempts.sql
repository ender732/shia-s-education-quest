-- Track how many times a student attempts a lesson; score stays the best result.
ALTER TABLE public.task_progress
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 1
    CHECK (attempt_count >= 1),
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN public.task_progress.attempt_count IS
  'Number of scored quiz/worksheet attempts for this lesson.';
COMMENT ON COLUMN public.task_progress.score IS
  'Best score achieved across attempts (0–100).';
COMMENT ON COLUMN public.task_progress.xp_awarded IS
  'XP granted once on first mastery (≥ pass threshold); not re-granted on retries.';
