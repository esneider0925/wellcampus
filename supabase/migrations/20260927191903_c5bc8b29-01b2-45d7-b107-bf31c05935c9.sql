CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  program text NOT NULL DEFAULT '',
  semester smallint CHECK (semester BETWEEN 1 AND 12),
  study_shift text CHECK (study_shift IN ('Diurna', 'Nocturna', 'Mixta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Students create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Students update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Students delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.habit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT current_date,
  activity_minutes integer NOT NULL DEFAULT 0 CHECK (activity_minutes BETWEEN 0 AND 600),
  sleep_hours numeric(3,1) NOT NULL DEFAULT 0 CHECK (sleep_hours BETWEEN 0 AND 24),
  water_glasses integer NOT NULL DEFAULT 0 CHECK (water_glasses BETWEEN 0 AND 30),
  nutrition_score smallint NOT NULL DEFAULT 0 CHECK (nutrition_score BETWEEN 0 AND 5),
  stress_level smallint NOT NULL DEFAULT 3 CHECK (stress_level BETWEEN 1 AND 5),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_entries TO authenticated;
GRANT ALL ON public.habit_entries TO service_role;
ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own entries" ON public.habit_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students create own entries" ON public.habit_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students update own entries" ON public.habit_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students delete own entries" ON public.habit_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX habit_entries_user_date_idx ON public.habit_entries (user_id, entry_date DESC);
CREATE TRIGGER habit_entries_set_updated_at BEFORE UPDATE ON public.habit_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_type text NOT NULL CHECK (habit_type IN ('activity', 'sleep', 'water', 'nutrition', 'stress')),
  target_value numeric(6,1) NOT NULL CHECK (target_value > 0),
  unit text NOT NULL CHECK (char_length(unit) BETWEEN 1 AND 30),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, habit_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own goals" ON public.goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students create own goals" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students update own goals" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students delete own goals" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER goals_set_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();