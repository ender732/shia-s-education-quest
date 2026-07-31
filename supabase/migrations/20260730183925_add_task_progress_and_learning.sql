-- Per-student lesson progress (replaces shared tasks.is_completed for learning)
CREATE TABLE public.task_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_progress TO authenticated;
GRANT ALL ON public.task_progress TO service_role;
ALTER TABLE public.task_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress read own or parent"
  ON public.task_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_parent(auth.uid()));

CREATE POLICY "progress insert own"
  ON public.task_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "progress update own"
  ON public.task_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "progress delete own or parent"
  ON public.task_progress FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_parent(auth.uid()));

CREATE INDEX task_progress_user_id_idx ON public.task_progress (user_id);
CREATE INDEX task_progress_task_id_idx ON public.task_progress (task_id);
