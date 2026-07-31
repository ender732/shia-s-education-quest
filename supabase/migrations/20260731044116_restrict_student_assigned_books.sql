-- Restrict student book visibility to linked parents' assignments only.
-- Residual risk from security_hardening: students could SELECT all assigned_books
-- (and thus any PDF referenced there) via OR NOT is_parent(auth.uid()).
--
-- Schema note: assigned_books has no student_id / assignee column — visibility is
-- solely via assigned_by + parent_student_links (plus own rows for parents).

-- ---------------------------------------------------------------------------
-- 1) assigned_books SELECT: parent own | linked student | admin
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "books read" ON public.assigned_books;
CREATE POLICY "books read"
  ON public.assigned_books FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.parent_student_links psl
      WHERE psl.parent_id = assigned_books.assigned_by
        AND psl.student_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Storage SELECT: own folder | visible book row | admin
--    Explicit link check (not only RLS-aware EXISTS) so storage stays correct
--    even if table SELECT is later broadened.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "books files read" ON storage.objects;
CREATE POLICY "books files read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assigned-books'
    AND (
      public.is_admin(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.assigned_books ab
        WHERE ab.pdf_url = name
          AND (
            ab.assigned_by = auth.uid()
            OR EXISTS (
              SELECT 1
              FROM public.parent_student_links psl
              WHERE psl.parent_id = ab.assigned_by
                AND psl.student_id = auth.uid()
            )
          )
      )
    )
  );
