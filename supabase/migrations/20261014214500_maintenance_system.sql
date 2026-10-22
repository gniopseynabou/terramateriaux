-- ============================================================
-- Migration: Centralized Maintenance System
-- Date: 2026-10-14
-- Description:
-- 1. Table public.maintenance_settings (singleton)
-- 2. RLS : Lecture publique, modification réservée super_admin
-- 3. RPC public.set_maintenance_mode(...) avec audit log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.maintenance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    title TEXT NOT NULL DEFAULT 'Plateforme en maintenance technique',
    message TEXT NOT NULL DEFAULT 'Notre équipe technique effectue actuellement une opération de maintenance planifiée afin d''améliorer la qualité de nos services. Le site sera de nouveau accessible dans les plus brefs délais.',
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    enabled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    enabled_by_email TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertion de la configuration par défaut (si vide)
INSERT INTO public.maintenance_settings (is_enabled, title, message)
SELECT false, 'Plateforme en maintenance technique', 'Notre équipe technique effectue actuellement une opération de maintenance planifiée afin d''améliorer la qualité de nos services. Le site sera de nouveau accessible dans les plus brefs délais.'
WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_settings);

-- RLS
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;

-- Les visiteurs et clients doivent pouvoir lire l'état de maintenance
DROP POLICY IF EXISTS "Public read maintenance settings" ON public.maintenance_settings;
CREATE POLICY "Public read maintenance settings"
    ON public.maintenance_settings FOR SELECT
    USING (true);

-- Seul le rôle super_admin peut mettre à jour directement la table
DROP POLICY IF EXISTS "Super-admins update maintenance settings" ON public.maintenance_settings;
CREATE POLICY "Super-admins update maintenance settings"
    ON public.maintenance_settings FOR UPDATE TO authenticated
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

REVOKE INSERT, DELETE ON public.maintenance_settings FROM anon, authenticated;

-- RPC sécurisée avec traçabilité dans audit_logs
CREATE OR REPLACE FUNCTION public.set_maintenance_mode(
    _is_enabled BOOLEAN,
    _message TEXT DEFAULT NULL,
    _scheduled_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _caller_id UUID := auth.uid();
    _caller_email TEXT;
    _row public.maintenance_settings%ROWTYPE;
BEGIN
    -- Contrôle strict d'autorisation : réservé exclusivement au super_admin
    IF NOT public.is_super_admin(_caller_id) THEN
        RAISE EXCEPTION 'Accès refusé : seul un Super-Administrateur peut modifier le mode maintenance.';
    END IF;

    SELECT email INTO _caller_email FROM auth.users WHERE id = _caller_id;

    -- Mise à jour du singleton
    UPDATE public.maintenance_settings
    SET is_enabled = _is_enabled,
        message = COALESCE(_message, message),
        scheduled_end = _scheduled_end,
        enabled_by = _caller_id,
        enabled_by_email = _caller_email,
        updated_at = now()
    WHERE id = (SELECT id FROM public.maintenance_settings LIMIT 1)
    RETURNING * INTO _row;

    -- Traçabilité automatique dans le journal d'audit
    PERFORM public.log_security_event(
        CASE WHEN _is_enabled THEN 'MAINTENANCE_ACTIVATED' ELSE 'MAINTENANCE_DEACTIVATED' END,
        'maintenance_settings',
        jsonb_build_object(
            'is_enabled', _is_enabled,
            'scheduled_end', _scheduled_end,
            'message', _row.message
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'is_enabled', _row.is_enabled,
        'updated_at', _row.updated_at
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_maintenance_mode(BOOLEAN, TEXT, TIMESTAMPTZ) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_maintenance_mode(BOOLEAN, TEXT, TIMESTAMPTZ) TO authenticated;
