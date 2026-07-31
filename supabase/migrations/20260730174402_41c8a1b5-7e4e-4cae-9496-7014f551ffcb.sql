
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','parent')),
  xp_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_parent(_uid UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'parent');
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_parent(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
          COALESCE(NEW.raw_user_meta_data->>'role','student'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects read" ON public.subjects FOR SELECT TO authenticated USING (true);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  unit_tag TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks read" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks parent insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_parent(auth.uid()));
CREATE POLICY "tasks update" ON public.tasks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tasks parent delete" ON public.tasks FOR DELETE TO authenticated USING (public.is_parent(auth.uid()));

CREATE TABLE public.assigned_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  pdf_url TEXT,
  prompt TEXT,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assigned_books TO authenticated;
GRANT ALL ON public.assigned_books TO service_role;
ALTER TABLE public.assigned_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books read" ON public.assigned_books FOR SELECT TO authenticated USING (true);
CREATE POLICY "books parent write" ON public.assigned_books FOR INSERT TO authenticated WITH CHECK (public.is_parent(auth.uid()));
CREATE POLICY "books parent update" ON public.assigned_books FOR UPDATE TO authenticated USING (public.is_parent(auth.uid())) WITH CHECK (public.is_parent(auth.uid()));
CREATE POLICY "books parent delete" ON public.assigned_books FOR DELETE TO authenticated USING (public.is_parent(auth.uid()));

CREATE TABLE public.book_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.assigned_books(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_or_topic TEXT,
  report_text TEXT NOT NULL,
  ai_score TEXT,
  ai_feedback JSONB,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.book_reports TO authenticated;
GRANT ALL ON public.book_reports TO service_role;
ALTER TABLE public.book_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports read" ON public.book_reports FOR SELECT TO authenticated USING (student_id = auth.uid() OR public.is_parent(auth.uid()));
CREATE POLICY "reports insert own" ON public.book_reports FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());

INSERT INTO public.subjects (id, title, description, sort_order) VALUES
 ('11111111-1111-4111-8111-111111111111','Math','Multi-digit numbers, decimals, fractions, and volume',1),
 ('22222222-2222-4222-8222-222222222222','ELA / Reading','Narrative analysis, root words, and RACECE writing',2),
 ('33333333-3333-4333-8333-333333333333','Science (NYSSLS)','Matter, conservation of mass, and Earth''s spheres',3),
 ('44444444-4444-4444-8444-444444444444','Social Studies (Western Hemisphere)','Geography, history, and map reading',4),
 ('55555555-5555-4555-8555-555555555555','Assigned Reading','Ebook reading and AI-graded book reports',5);

INSERT INTO public.tasks (subject_id, title, description, unit_tag, xp_reward) VALUES
 ('11111111-1111-4111-8111-111111111111','Multi-Digit Multiplication Drill','Solve 10 problems multiplying 3-digit by 2-digit whole numbers using the standard algorithm.','187_MATH_WHOLE_NUM',100),
 ('11111111-1111-4111-8111-111111111111','Decimal Place Value to Thousandths','Compare, round, add, and subtract decimals to the thousandths place.','187_MATH_DECIMALS',120),
 ('11111111-1111-4111-8111-111111111111','Fractions with Unlike Denominators','Add and subtract fractions by finding common denominators. Show all work.','187_MATH_FRACTIONS',150),
 ('11111111-1111-4111-8111-111111111111','Volume of Rectangular Prisms','Use V = l x w x h to find the volume of 6 solid figures, including composite shapes.','187_MATH_VOLUME',130),
 ('22222222-2222-4222-8222-222222222222','Narrative Analysis: Character Change','Read the assigned chapter and explain how the main character changes, with two pieces of evidence.','187_ELA_UNIT1',120),
 ('22222222-2222-4222-8222-222222222222','Greek & Latin Root Words','Define 12 root words and use each in an original sentence.','187_ELA_ROOTS',100),
 ('22222222-2222-4222-8222-222222222222','RACECE Constructed Response','Answer the prompt using Restate, Answer, Cite, Explain, Cite, Explain.','187_RACECE_FORMAT',200),
 ('33333333-3333-4333-8333-333333333333','Properties of Matter Lab','Classify five materials by their measurable properties and record observations.','187_SCI_MATTER',110),
 ('33333333-3333-4333-8333-333333333333','Conservation of Mass','Explain why mass stays the same when substances mix, with a real example.','187_SCI_MASS',130),
 ('33333333-3333-4333-8333-333333333333','Earth''s Four Spheres','Describe geosphere, hydrosphere, atmosphere, and biosphere and how they interact.','187_SCI_SPHERES',140),
 ('44444444-4444-4444-8444-444444444444','Mapping the Western Hemisphere','Label the major countries, rivers, and mountain ranges of North and South America.','187_SS_MAPS',120),
 ('44444444-4444-4444-8444-444444444444','Indigenous Civilizations','Compare the Maya, Aztec, and Inca civilizations in a short chart.','187_SS_HISTORY',150),
 ('55555555-5555-4555-8555-555555555555','Weekly Reading Log','Read 30 minutes a day for five days and log the pages covered.','187_READ_LOG',100);
