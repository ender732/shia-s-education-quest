-- Secure private PDF bucket for assigned books + student delete permission.

-- 1) Private bucket: PDF only, 15 MB max
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assigned-books',
  'assigned-books',
  false,
  15728640,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Parent-controlled flag: students may remove an assignment when true
ALTER TABLE public.assigned_books
  ADD COLUMN IF NOT EXISTS student_may_delete BOOLEAN NOT NULL DEFAULT false;

-- 3) Tighten assigned_books RLS
DROP POLICY IF EXISTS "books read" ON public.assigned_books;
DROP POLICY IF EXISTS "books parent write" ON public.assigned_books;
DROP POLICY IF EXISTS "books parent update" ON public.assigned_books;
DROP POLICY IF EXISTS "books parent delete" ON public.assigned_books;
DROP POLICY IF EXISTS "books student delete" ON public.assigned_books;

CREATE POLICY "books read"
  ON public.assigned_books FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "books parent write"
  ON public.assigned_books FOR INSERT TO authenticated
  WITH CHECK (
    public.is_parent(auth.uid())
    AND assigned_by = auth.uid()
  );

CREATE POLICY "books parent update"
  ON public.assigned_books FOR UPDATE TO authenticated
  USING (
    public.is_parent(auth.uid())
    AND assigned_by = auth.uid()
  )
  WITH CHECK (
    public.is_parent(auth.uid())
    AND assigned_by = auth.uid()
  );

CREATE POLICY "books parent delete"
  ON public.assigned_books FOR DELETE TO authenticated
  USING (
    public.is_parent(auth.uid())
    AND assigned_by = auth.uid()
  );

CREATE POLICY "books student delete"
  ON public.assigned_books FOR DELETE TO authenticated
  USING (
    student_may_delete = true
    AND NOT public.is_parent(auth.uid())
  );

-- 4) Replace storage.object policies with path-scoped + PDF-safe rules
-- Path convention: {uploader_user_id}/{uuid}.pdf
-- MIME is enforced by bucket.allowed_mime_types; policies require .pdf extension
-- and uploader-owned folder prefix {auth.uid()}/...
DROP POLICY IF EXISTS "books files read" ON storage.objects;
DROP POLICY IF EXISTS "books files insert" ON storage.objects;
DROP POLICY IF EXISTS "books files update" ON storage.objects;
DROP POLICY IF EXISTS "books files delete" ON storage.objects;
DROP POLICY IF EXISTS "books files parent delete" ON storage.objects;
DROP POLICY IF EXISTS "books files student delete" ON storage.objects;

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

CREATE POLICY "books files insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assigned-books'
    AND public.is_parent(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) = 'pdf'
  );

CREATE POLICY "books files update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assigned-books'
    AND public.is_parent(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'assigned-books'
    AND public.is_parent(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) = 'pdf'
  );

CREATE POLICY "books files parent delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assigned-books'
    AND public.is_parent(auth.uid())
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

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
    )
  );
