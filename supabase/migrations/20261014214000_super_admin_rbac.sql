-- ============================================================
-- Migration: Super-Admin RBAC & Audit Logging
-- Date: 2026-10-14
-- Description:
-- 1. Extension de app_role avec 'super_admin'
-- 2. Fonctions de contrôle de privilèges is_super_admin()
-- 3. Table de journalisation technique public.audit_logs
-- ============================================================

-- 1. Extension du type ENUM des rôles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Fonction helper pour vérifier spécifiquement le rôle super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- 3. Table de traçabilité technique des actions d'exploitation (Audit Logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT,
    action TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS sur audit_logs : Seuls les super_admins peuvent consulter les logs techniques
DROP POLICY IF EXISTS "Super-admins read audit logs" ON public.audit_logs;
CREATE POLICY "Super-admins read audit logs"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (public.is_super_admin(auth.uid()));

-- L'insertion est réservée au système via les fonctions SECURITY DEFINER
REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

-- 5. RPC sécurisée pour enregistrer une action d'audit
CREATE OR REPLACE FUNCTION public.log_security_event(
    _action TEXT,
    _target_resource TEXT,
    _details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _log_id UUID;
    _email TEXT;
BEGIN
    SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

    INSERT INTO public.audit_logs (
        actor_id,
        actor_email,
        action,
        target_resource,
        details
    ) VALUES (
        auth.uid(),
        _email,
        _action,
        _target_resource,
        _details
    ) RETURNING id INTO _log_id;

    RETURN _log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT, TEXT, JSONB) TO authenticated;
