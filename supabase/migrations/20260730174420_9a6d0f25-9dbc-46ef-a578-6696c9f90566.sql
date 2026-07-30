
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_parent(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_parent(UUID) TO authenticated;

DROP POLICY "tasks update" ON public.tasks;
CREATE POLICY "tasks update" ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
