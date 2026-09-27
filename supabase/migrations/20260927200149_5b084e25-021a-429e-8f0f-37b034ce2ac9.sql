ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

CREATE OR REPLACE FUNCTION public.super_list_admins()
RETURNS TABLE (user_id uuid, email text, role text, granted_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT r.user_id, u.email::text, r.role::text, r.created_at
  FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id
  WHERE r.role::text IN ('admin','super_admin')
  ORDER BY r.created_at;
END; $$;

CREATE OR REPLACE FUNCTION public.super_grant_admin(_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin') ON CONFLICT DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.super_revoke_admin(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF public.has_role(_user_id, 'super_admin'::public.app_role) THEN RAISE EXCEPTION 'cannot_revoke_super'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
END; $$;

REVOKE EXECUTE ON FUNCTION public.super_list_admins() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.super_grant_admin(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.super_revoke_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_list_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_grant_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_revoke_admin(uuid) TO authenticated;