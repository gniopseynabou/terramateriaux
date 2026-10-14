-- ============================================================
-- Migration: P0 Security Fixes (SEC-002 & SEC-004)
-- Date: 2026-10-14
-- ============================================================

-- 1. SEC-002 : Révoquer et supprimer la fonction d'énumération d'adresses email
--    Afin d'empêcher tout visiteur non connecté ou script automatisé de sonder la base
--    pour vérifier l'existence de comptes clients.
REVOKE EXECUTE ON FUNCTION public.check_email_exists(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_email_exists(text) FROM authenticated;
DROP FUNCTION IF EXISTS public.check_email_exists(text);

-- 2. SEC-004 : Durcir la politique d'upload sur le bucket 'payment-proofs'
--    Retrait complet du rôle 'anon' et du dossier 'guest'.
--    Seuls les utilisateurs authentifiés peuvent déposer des fichiers, et uniquement
--    dans leur propre dossier (correspondant à leur identifiant auth.uid()).
DROP POLICY IF EXISTS "Users upload own proofs" ON storage.objects;

CREATE POLICY "Users upload own proofs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
