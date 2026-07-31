-- Parent/admin PDF → AI lesson drafts + fillable worksheet submissions.
-- Drafts are hidden from students via is_draft RLS. Published tasks may store
-- lesson_payload (quiz + fillable worksheet) so content is not stuck in curriculum.ts.

-- ---------------------------------------------------------------------------
-- 1) tasks: draft + payload + optional source PDF path
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lesson_payload JSONB,
  ADD COLUMN IF NOT EXISTS worksheet_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS source_credit TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tasks.is_draft IS 'When true, only creator (parent) and admins can SELECT; students cannot see.';
COMMENT ON COLUMN public.tasks.lesson_payload IS 'Structured Lesson JSON (teach, tip, questions, optional worksheet fields).';
COMMENT ON COLUMN public.tasks.worksheet_pdf_url IS 'Storage object key in lesson-worksheets bucket ({uid}/{uuid}.pdf).';
COMMENT ON COLUMN public.tasks.source_credit IS 'Optional human attribution (e.g. Worksheet uploaded by parent).';

CREATE INDEX IF NOT EXISTS tasks_is_draft_idx ON public.tasks (is_draft);
CREATE INDEX IF NOT EXISTS tasks_created_by_draft_idx ON public.tasks (created_by) WHERE is_draft = true;

-- ---------------------------------------------------------------------------
-- 2) Tighten tasks SELECT so drafts stay private
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks read" ON public.tasks;
CREATE POLICY "tasks read"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    is_draft = false
    OR public.is_admin(auth.uid())
    OR (
      public.is_parent(auth.uid())
      AND created_by = auth.uid()
    )
  );

-- Admins can insert/update any task (parents already update own)
DROP POLICY IF EXISTS "tasks admin insert" ON public.tasks;
CREATE POLICY "tasks admin insert"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "tasks admin update" ON public.tasks;
CREATE POLICY "tasks admin update"
  ON public.tasks FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Parents inserting drafts must own the row
DROP POLICY IF EXISTS "tasks parent insert" ON public.tasks;
CREATE POLICY "tasks parent insert"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_parent(auth.uid())
    AND created_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 3) worksheet_submissions — AI-graded fillable answers (retries allowed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.worksheet_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_score INTEGER NOT NULL CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS worksheet_submissions_student_idx
  ON public.worksheet_submissions (student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS worksheet_submissions_task_idx
  ON public.worksheet_submissions (task_id, submitted_at DESC);

GRANT SELECT, INSERT ON public.worksheet_submissions TO authenticated;
GRANT ALL ON public.worksheet_submissions TO service_role;

ALTER TABLE public.worksheet_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worksheet_submissions student read own" ON public.worksheet_submissions;
CREATE POLICY "worksheet_submissions student read own"
  ON public.worksheet_submissions FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR (
      public.is_parent(auth.uid())
      AND public.is_linked_student(student_id)
    )
  );

DROP POLICY IF EXISTS "worksheet_submissions student insert own" ON public.worksheet_submissions;
CREATE POLICY "worksheet_submissions student insert own"
  ON public.worksheet_submissions FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND NOT public.is_parent(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 4) Private storage bucket for source lesson PDFs
-- Path: {uploader_user_id}/{uuid}.pdf
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-worksheets',
  'lesson-worksheets',
  false,
  15728640,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "lesson worksheets read" ON storage.objects;
DROP POLICY IF EXISTS "lesson worksheets insert" ON storage.objects;
DROP POLICY IF EXISTS "lesson worksheets update" ON storage.objects;
DROP POLICY IF EXISTS "lesson worksheets delete" ON storage.objects;

CREATE POLICY "lesson worksheets read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-worksheets'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.tasks t
        WHERE t.worksheet_pdf_url = name
          AND t.is_draft = false
      )
    )
  );

CREATE POLICY "lesson worksheets insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-worksheets'
    AND (public.is_parent(auth.uid()) OR public.is_admin(auth.uid()))
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) = 'pdf'
  );

CREATE POLICY "lesson worksheets update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'lesson-worksheets'
    AND (public.is_parent(auth.uid()) OR public.is_admin(auth.uid()))
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'lesson-worksheets'
    AND (public.is_parent(auth.uid()) OR public.is_admin(auth.uid()))
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) = 'pdf'
  );

CREATE POLICY "lesson worksheets delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'lesson-worksheets'
    AND (
      public.is_admin(auth.uid())
      OR (
        (public.is_parent(auth.uid()) OR public.is_admin(auth.uid()))
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
    )
  );
