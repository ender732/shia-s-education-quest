-- Storage API forbids DELETE FROM storage.objects (protect_delete trigger).
-- Keep permission-checked row delete in RPC; client removes the PDF via Storage API.

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
