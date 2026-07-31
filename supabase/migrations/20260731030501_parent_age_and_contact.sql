-- Age verification + parent contact email for authentic parent/student roles.
-- Parent role requires date_of_birth implying 18+ and age_verified_at set.
-- New users always start as student; client/server applyAuthoritativeRole upgrades parents.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_contact_email TEXT;

-- Always create profiles as student — never trust client-supplied metadata role for parent.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role, parent_contact_email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'student',
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'parent_contact_email', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Age helper (whole years from DOB to today, UTC date).
CREATE OR REPLACE FUNCTION public.age_years_from_dob(_dob DATE)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _dob IS NULL THEN NULL
    ELSE (
      EXTRACT(YEAR FROM age(CURRENT_DATE, _dob))::INTEGER
    )
  END;
$$;

-- Prevent parent role without verified adult DOB; force student if under 18.
CREATE OR REPLACE FUNCTION public.guard_profile_parent_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _years INTEGER;
BEGIN
  IF NEW.role = 'parent' THEN
    IF NEW.date_of_birth IS NULL OR NEW.age_verified_at IS NULL THEN
      RAISE EXCEPTION 'Parent role requires date of birth and age verification';
    END IF;
    _years := public.age_years_from_dob(NEW.date_of_birth);
    IF _years IS NULL OR _years < 18 THEN
      RAISE EXCEPTION 'Parent accounts require age 18 or older';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_parent_role ON public.profiles;
CREATE TRIGGER profiles_guard_parent_role
  BEFORE INSERT OR UPDATE OF role, date_of_birth, age_verified_at
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_parent_role();
