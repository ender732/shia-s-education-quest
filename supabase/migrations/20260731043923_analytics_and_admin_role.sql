-- First-party site analytics + admin role.
-- COPPA-minded: no cross-site fingerprinting; clients insert via validated RPC only;
-- SELECT only for profiles.role = 'admin'. IP is optional (hashed, server-supplied).

-- ---------------------------------------------------------------------------
-- 1) profiles: allow admin role; block client self-promotion
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'parent', 'admin'));

CREATE OR REPLACE FUNCTION public.is_admin(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _uid AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Clients (authenticated JWT) cannot assign or remove admin.
  -- service_role / postgres / direct SQL operators may.
  IF coalesce(auth.role(), '') = 'authenticated' THEN
    IF NEW.role = 'admin' AND (TG_OP = 'INSERT' OR OLD.role IS DISTINCT FROM 'admin') THEN
      RAISE EXCEPTION 'admin role cannot be assigned by clients';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'admin role cannot be changed by clients';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_admin_role ON public.profiles;
CREATE TRIGGER profiles_guard_admin_role
  BEFORE INSERT OR UPDATE OF role
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_admin_role();

REVOKE ALL ON FUNCTION public.guard_profile_admin_role() FROM PUBLIC, anon, authenticated;

-- Parent-role age guard should not apply to admin.
CREATE OR REPLACE FUNCTION public.guard_profile_parent_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _years INTEGER;
BEGIN
  IF NEW.role = 'admin' THEN
    RETURN NEW;
  END IF;
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

-- ---------------------------------------------------------------------------
-- 2) Analytics tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  landing_path TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  user_agent TEXT,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  bot_name TEXT,
  language TEXT,
  timezone_offset INTEGER,
  screen_width INTEGER,
  screen_height INTEGER,
  ip_hash TEXT,
  CONSTRAINT analytics_sessions_visitor_id_len CHECK (char_length(visitor_id) BETWEEN 8 AND 64),
  CONSTRAINT analytics_sessions_ua_len CHECK (user_agent IS NULL OR char_length(user_agent) <= 512),
  CONSTRAINT analytics_sessions_path_len CHECK (landing_path IS NULL OR char_length(landing_path) <= 500),
  CONSTRAINT analytics_sessions_referrer_len CHECK (referrer IS NULL OR char_length(referrer) <= 500)
);

CREATE INDEX IF NOT EXISTS analytics_sessions_started_at_idx
  ON public.analytics_sessions (started_at DESC);
CREATE INDEX IF NOT EXISTS analytics_sessions_visitor_id_idx
  ON public.analytics_sessions (visitor_id);
CREATE INDEX IF NOT EXISTS analytics_sessions_is_bot_idx
  ON public.analytics_sessions (is_bot);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE SET NULL,
  visitor_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  path TEXT,
  referrer TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  bot_name TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_visitor_id_len CHECK (char_length(visitor_id) BETWEEN 8 AND 64),
  CONSTRAINT analytics_events_name_check CHECK (event_name IN (
    'page_view',
    'share',
    'copy_link',
    'signup_start',
    'login',
    'confirm_email',
    'oauth_return',
    'lesson_open',
    'book_assign',
    'session_start'
  )),
  CONSTRAINT analytics_events_path_len CHECK (path IS NULL OR char_length(path) <= 500),
  CONSTRAINT analytics_events_referrer_len CHECK (referrer IS NULL OR char_length(referrer) <= 500),
  CONSTRAINT analytics_events_ua_len CHECK (user_agent IS NULL OR char_length(user_agent) <= 512),
  CONSTRAINT analytics_events_properties_size CHECK (pg_column_size(properties) <= 2048)
);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_name_idx
  ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS analytics_events_session_id_idx
  ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS analytics_events_path_idx
  ON public.analytics_events (path);

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- No direct client INSERT/UPDATE/DELETE/SELECT — use RPCs only.
REVOKE ALL ON TABLE public.analytics_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.analytics_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.analytics_sessions TO service_role;
GRANT ALL ON TABLE public.analytics_events TO service_role;

-- Admin-only SELECT via RLS (service_role bypasses; RPC also checks is_admin).
DROP POLICY IF EXISTS "analytics_sessions admin select" ON public.analytics_sessions;
CREATE POLICY "analytics_sessions admin select"
  ON public.analytics_sessions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "analytics_events admin select" ON public.analytics_events;
CREATE POLICY "analytics_events admin select"
  ON public.analytics_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Grant SELECT to authenticated so RLS policy can apply for admins using direct queries.
GRANT SELECT ON TABLE public.analytics_sessions TO authenticated;
GRANT SELECT ON TABLE public.analytics_events TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Ingest RPC (anon + authenticated)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_analytics(
  _visitor_id TEXT,
  _event_name TEXT,
  _session_id UUID DEFAULT NULL,
  _path TEXT DEFAULT NULL,
  _referrer TEXT DEFAULT NULL,
  _utm_source TEXT DEFAULT NULL,
  _utm_medium TEXT DEFAULT NULL,
  _utm_campaign TEXT DEFAULT NULL,
  _utm_content TEXT DEFAULT NULL,
  _utm_term TEXT DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL,
  _is_bot BOOLEAN DEFAULT false,
  _bot_name TEXT DEFAULT NULL,
  _language TEXT DEFAULT NULL,
  _timezone_offset INTEGER DEFAULT NULL,
  _screen_width INTEGER DEFAULT NULL,
  _screen_height INTEGER DEFAULT NULL,
  _ip_hash TEXT DEFAULT NULL,
  _properties JSONB DEFAULT '{}'::jsonb,
  _landing_path TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vid TEXT;
  _sid UUID;
  _uid UUID := auth.uid();
  _name TEXT;
  _props JSONB;
  _recent INTEGER;
BEGIN
  _vid := left(trim(coalesce(_visitor_id, '')), 64);
  IF char_length(_vid) < 8 THEN
    RAISE EXCEPTION 'invalid visitor_id';
  END IF;

  _name := left(trim(coalesce(_event_name, '')), 64);
  IF _name NOT IN (
    'page_view', 'share', 'copy_link', 'signup_start', 'login',
    'confirm_email', 'oauth_return', 'lesson_open', 'book_assign', 'session_start'
  ) THEN
    RAISE EXCEPTION 'invalid event_name';
  END IF;

  -- Soft rate limit: max 60 events / visitor / minute
  SELECT count(*)::INTEGER INTO _recent
  FROM public.analytics_events
  WHERE visitor_id = _vid
    AND created_at > now() - interval '1 minute';
  IF _recent >= 60 THEN
    RAISE EXCEPTION 'rate limit exceeded';
  END IF;

  _props := coalesce(_properties, '{}'::jsonb);
  IF pg_column_size(_props) > 2048 THEN
    _props := '{}'::jsonb;
  END IF;
  -- Strip accidental PII keys if present
  _props := _props - 'email' - 'password' - 'parent_contact_email' - 'token';

  IF _session_id IS NOT NULL THEN
    SELECT id INTO _sid
    FROM public.analytics_sessions
    WHERE id = _session_id AND visitor_id = _vid;
  END IF;

  IF _sid IS NULL THEN
    INSERT INTO public.analytics_sessions (
      visitor_id, user_id, landing_path, referrer,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      user_agent, is_bot, bot_name, language, timezone_offset,
      screen_width, screen_height, ip_hash
    ) VALUES (
      _vid,
      _uid,
      left(nullif(trim(coalesce(_landing_path, _path)), ''), 500),
      left(nullif(trim(_referrer), ''), 500),
      left(nullif(trim(_utm_source), ''), 100),
      left(nullif(trim(_utm_medium), ''), 100),
      left(nullif(trim(_utm_campaign), ''), 100),
      left(nullif(trim(_utm_content), ''), 100),
      left(nullif(trim(_utm_term), ''), 100),
      left(nullif(trim(_user_agent), ''), 512),
      coalesce(_is_bot, false),
      left(nullif(trim(_bot_name), ''), 100),
      left(nullif(trim(_language), ''), 32),
      _timezone_offset,
      CASE WHEN _screen_width IS NULL THEN NULL ELSE least(greatest(_screen_width, 0), 10000) END,
      CASE WHEN _screen_height IS NULL THEN NULL ELSE least(greatest(_screen_height, 0), 10000) END,
      left(nullif(trim(_ip_hash), ''), 64)
    )
    RETURNING id INTO _sid;
  ELSE
    UPDATE public.analytics_sessions
    SET
      last_seen_at = now(),
      user_id = coalesce(_uid, user_id),
      ip_hash = coalesce(left(nullif(trim(_ip_hash), ''), 64), ip_hash),
      is_bot = coalesce(_is_bot, is_bot),
      bot_name = coalesce(left(nullif(trim(_bot_name), ''), 100), bot_name)
    WHERE id = _sid;
  END IF;

  INSERT INTO public.analytics_events (
    session_id, visitor_id, user_id, event_name, path, referrer,
    properties, is_bot, bot_name, user_agent
  ) VALUES (
    _sid,
    _vid,
    _uid,
    _name,
    left(nullif(trim(_path), ''), 500),
    left(nullif(trim(_referrer), ''), 500),
    _props,
    coalesce(_is_bot, false),
    left(nullif(trim(_bot_name), ''), 100),
    left(nullif(trim(_user_agent), ''), 512)
  );

  RETURN _sid;
END;
$$;

REVOKE ALL ON FUNCTION public.track_analytics FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_analytics(
  TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, JSONB, TEXT
) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Admin analytics read RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_analytics_overview(_days INTEGER DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d INTEGER := least(greatest(coalesce(_days, 14), 1), 90);
  _since TIMESTAMPTZ := now() - (_d || ' days')::interval;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN jsonb_build_object(
    'days', _d,
    'page_views', (
      SELECT count(*) FROM public.analytics_events
      WHERE event_name = 'page_view' AND created_at >= _since
    ),
    'unique_visitors', (
      SELECT count(DISTINCT visitor_id) FROM public.analytics_sessions
      WHERE started_at >= _since
    ),
    'sessions', (
      SELECT count(*) FROM public.analytics_sessions WHERE started_at >= _since
    ),
    'human_sessions', (
      SELECT count(*) FROM public.analytics_sessions
      WHERE started_at >= _since AND is_bot = false
    ),
    'bot_sessions', (
      SELECT count(*) FROM public.analytics_sessions
      WHERE started_at >= _since AND is_bot = true
    ),
    'signups', (
      SELECT count(*) FROM public.analytics_events
      WHERE event_name = 'signup_start' AND created_at >= _since
    ),
    'logins', (
      SELECT count(*) FROM public.analytics_events
      WHERE event_name = 'login' AND created_at >= _since
    ),
    'shares', (
      SELECT count(*) FROM public.analytics_events
      WHERE event_name IN ('share', 'copy_link') AND created_at >= _since
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_daily(_days INTEGER DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d INTEGER := least(greatest(coalesce(_days, 14), 1), 90);
  _since DATE := (timezone('utc', now())::date - (_d - 1));
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(t)::jsonb ORDER BY t.day)
    FROM (
      SELECT
        d::date AS day,
        coalesce(pv.cnt, 0) AS page_views,
        coalesce(vs.cnt, 0) AS visitors,
        coalesce(bs.cnt, 0) AS bot_sessions
      FROM generate_series(_since, timezone('utc', now())::date, '1 day'::interval) AS d
      LEFT JOIN (
        SELECT created_at::date AS day, count(*)::INTEGER AS cnt
        FROM public.analytics_events
        WHERE event_name = 'page_view' AND created_at >= _since
        GROUP BY 1
      ) pv ON pv.day = d::date
      LEFT JOIN (
        SELECT started_at::date AS day, count(DISTINCT visitor_id)::INTEGER AS cnt
        FROM public.analytics_sessions
        WHERE started_at >= _since AND is_bot = false
        GROUP BY 1
      ) vs ON vs.day = d::date
      LEFT JOIN (
        SELECT started_at::date AS day, count(*)::INTEGER AS cnt
        FROM public.analytics_sessions
        WHERE started_at >= _since AND is_bot = true
        GROUP BY 1
      ) bs ON bs.day = d::date
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_top_pages(
  _days INTEGER DEFAULT 14,
  _limit INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d INTEGER := least(greatest(coalesce(_days, 14), 1), 90);
  _lim INTEGER := least(greatest(coalesce(_limit, 15), 1), 50);
  _since TIMESTAMPTZ := now() - (_d || ' days')::interval;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(t)::jsonb)
    FROM (
      SELECT coalesce(path, '(unknown)') AS path, count(*)::INTEGER AS views
      FROM public.analytics_events
      WHERE event_name = 'page_view' AND created_at >= _since
      GROUP BY 1
      ORDER BY views DESC
      LIMIT _lim
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_referrers(
  _days INTEGER DEFAULT 14,
  _limit INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d INTEGER := least(greatest(coalesce(_days, 14), 1), 90);
  _lim INTEGER := least(greatest(coalesce(_limit, 15), 1), 50);
  _since TIMESTAMPTZ := now() - (_d || ' days')::interval;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(t)::jsonb)
    FROM (
      SELECT
        CASE
          WHEN referrer IS NULL OR trim(referrer) = '' THEN '(direct / none)'
          ELSE left(referrer, 200)
        END AS referrer,
        count(*)::INTEGER AS sessions
      FROM public.analytics_sessions
      WHERE started_at >= _since
      GROUP BY 1
      ORDER BY sessions DESC
      LIMIT _lim
    ) t
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_bots(_days INTEGER DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d INTEGER := least(greatest(coalesce(_days, 14), 1), 90);
  _since TIMESTAMPTZ := now() - (_d || ' days')::interval;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN jsonb_build_object(
    'human_sessions', (
      SELECT count(*) FROM public.analytics_sessions
      WHERE started_at >= _since AND is_bot = false
    ),
    'bot_sessions', (
      SELECT count(*) FROM public.analytics_sessions
      WHERE started_at >= _since AND is_bot = true
    ),
    'by_name', coalesce((
      SELECT jsonb_agg(row_to_json(t)::jsonb)
      FROM (
        SELECT coalesce(bot_name, 'unknown') AS bot_name, count(*)::INTEGER AS sessions
        FROM public.analytics_sessions
        WHERE started_at >= _since AND is_bot = true
        GROUP BY 1
        ORDER BY sessions DESC
        LIMIT 20
      ) t
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_recent_events(_limit INTEGER DEFAULT 40)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lim INTEGER := least(greatest(coalesce(_limit, 40), 1), 100);
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(row_to_json(t)::jsonb)
    FROM (
      SELECT
        id,
        event_name,
        path,
        referrer,
        is_bot,
        bot_name,
        visitor_id,
        user_id,
        properties,
        created_at
      FROM public.analytics_events
      ORDER BY created_at DESC
      LIMIT _lim
    ) t
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_analytics_overview(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_analytics_daily(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_analytics_top_pages(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_analytics_referrers(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_analytics_bots(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_analytics_recent_events(INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_analytics_overview(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_daily(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_top_pages(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_referrers(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_bots(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_recent_events(INTEGER) TO authenticated;

COMMENT ON TABLE public.analytics_sessions IS
  'First-party anonymous visitor sessions for site analytics. Admin read only.';
COMMENT ON TABLE public.analytics_events IS
  'Allowlisted product/site events. No passwords or full emails in properties.';

-- To promote an operator (run in SQL editor as postgres / service role):
-- UPDATE public.profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'ed3780813@gmail.com');
