
CREATE POLICY "books files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assigned-books');
CREATE POLICY "books files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assigned-books' AND public.is_parent(auth.uid()));
CREATE POLICY "books files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assigned-books' AND public.is_parent(auth.uid()))
  WITH CHECK (bucket_id = 'assigned-books' AND public.is_parent(auth.uid()));
CREATE POLICY "books files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assigned-books' AND public.is_parent(auth.uid()));
