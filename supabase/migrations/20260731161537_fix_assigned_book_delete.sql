-- Fix assigned book removal:
-- Direct .delete() returned HTTP 204 with 0 rows when RLS denied access
-- (false "Book removed" toast). Admins could SELECT all books but not DELETE.
--
-- Permission-checked RPC deletes the row with a real error on denial.
-- PDF cleanup stays on the Storage API (direct storage.objects DELETE is blocked).

CREATE OR REPLACE FUNCTION public.delete_assigned_book(_book_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _book public.assigned_books%ROWTYPE;
  _allowed BOOLEAN := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _book
  FROM public.assigned_books
  WHERE id = _book_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Book not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF public.is_admin(_uid) THEN
    _allowed := true;
  ELSIF public.is_parent(_uid) AND _book.assigned_by = _uid THEN
    _allowed := true;
  ELSIF _book.student_may_delete
    AND NOT public.is_parent(_uid)
    AND (
      _book.assigned_by IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.parent_student_links psl
        WHERE psl.parent_id = _book.assigned_by
          AND psl.student_id = _uid
      )
    )
  THEN
    _allowed := true;
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'You do not have permission to remove this book'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.assigned_books WHERE id = _book_id;

  RETURN jsonb_build_object(
    'id', _book.id,
    'pdf_url', _book.pdf_url
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_assigned_book(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_assigned_book(UUID) TO authenticated;

DROP POLICY IF EXISTS "books admin delete" ON public.assigned_books;
CREATE POLICY "books admin delete"
  ON public.assigned_books FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "books files admin delete" ON storage.objects;
CREATE POLICY "books files admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assigned-books'
    AND public.is_admin(auth.uid())
  );
