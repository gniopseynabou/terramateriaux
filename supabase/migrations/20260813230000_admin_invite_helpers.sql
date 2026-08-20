-- ============================================================
-- Fonctions SQL pour la gestion des administrateurs
-- ============================================================

-- 1. Lister tous les admins (email + profil) — SECURITY DEFINER
--    Nécessaire car auth.users n'est pas accessible côté client.
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  user_id   UUID,
  email     TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seuls les admins peuvent appeler cette fonction
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    au.email::TEXT,
    COALESCE(p.full_name, '')::TEXT AS full_name,
    au.created_at AS created_at
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'admin'
  ORDER BY au.created_at DESC;
END;
$$;

-- 2. Révoquer le rôle admin d'un utilisateur
--    Un admin ne peut pas se révoquer lui-même.
CREATE OR REPLACE FUNCTION public.revoke_admin_role(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  -- Empêcher l'auto-révocation
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Vous ne pouvez pas révoquer votre propre rôle admin.';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = 'admin';
END;
$$;
