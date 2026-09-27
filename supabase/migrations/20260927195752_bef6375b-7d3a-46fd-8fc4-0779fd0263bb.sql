CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Only email + aggregated habit data; no passwords, locations or documents
CREATE OR REPLACE FUNCTION public.admin_user_overview()
RETURNS TABLE (
  user_id uuid, email text, registered_at timestamptz, entries_count bigint, last_entry date,
  avg_activity numeric, avg_sleep numeric, avg_water numeric, avg_nutrition numeric, avg_stress numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at, count(e.id), max(e.entry_date),
    round(avg(e.activity_minutes)::numeric, 1), round(avg(e.sleep_hours)::numeric, 1),
    round(avg(e.water_glasses)::numeric, 1), round(avg(e.nutrition_score)::numeric, 1),
    round(avg(e.stress_level)::numeric, 1)
  FROM auth.users u
  LEFT JOIN public.habit_entries e ON e.user_id = u.id
  GROUP BY u.id, u.email, u.created_at
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_daily_stats(_days integer DEFAULT 30)
RETURNS TABLE (
  day date, active_users bigint, avg_activity numeric, avg_sleep numeric, avg_water numeric,
  avg_nutrition numeric, avg_stress numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT e.entry_date, count(DISTINCT e.user_id),
    round(avg(e.activity_minutes)::numeric, 1), round(avg(e.sleep_hours)::numeric, 1),
    round(avg(e.water_glasses)::numeric, 1), round(avg(e.nutrition_score)::numeric, 1),
    round(avg(e.stress_level)::numeric, 1)
  FROM public.habit_entries e
  WHERE e.entry_date >= current_date - LEAST(GREATEST(_days, 1), 365)
  GROUP BY e.entry_date
  ORDER BY e.entry_date;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_user_overview() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_daily_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_user_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_daily_stats(integer) TO authenticated;