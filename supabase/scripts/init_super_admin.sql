-- ============================================================
-- SCRIPT D'INITIALISATION DU PREMIER SUPER-ADMIN TMI
-- Date: 2026-10-14
-- ============================================================
-- INSTRUCTIONS :
-- 1. Ouvrez le SQL Editor dans votre dashboard Supabase.
-- 2. Remplacez 'VOTRE_EMAIL_ICI@exemple.com' par l'adresse email
--    du compte technique qui doit devenir Super-Admin.
-- 3. Vérifiez l'UUID trouvé avant d'exécuter le INSERT.
-- 4. Exécutez ce script UNE SEULE FOIS.
-- 5. Supprimez ou archivez ce fichier après usage.
-- ============================================================

-- ÉTAPE 1 : Trouver l'UUID du compte cible (remplacez l'email ci-dessous)
-- Ce SELECT est en lecture seule — il ne modifie rien.
SELECT
    id        AS user_id,
    email     AS email,
    created_at
FROM auth.users
WHERE email = 'VOTRE_EMAIL_ICI@exemple.com';

-- ============================================================
-- VÉRIFIEZ QUE LE RÉSULTAT CI-DESSUS CORRESPOND AU BON COMPTE
-- AVANT DE CONTINUER.
-- ============================================================

-- ÉTAPE 2 : Attribuer le rôle super_admin
-- Remplacez 'VOTRE_EMAIL_ICI@exemple.com' par le même email qu'à l'étape 1.
DO $$
DECLARE
    _target_id UUID;
    _email     TEXT := 'VOTRE_EMAIL_ICI@exemple.com';
BEGIN
    -- Récupérer l'UUID du compte
    SELECT id INTO _target_id
    FROM auth.users
    WHERE email = _email;

    IF _target_id IS NULL THEN
        RAISE EXCEPTION 'Aucun compte trouvé pour l''email : %', _email;
    END IF;

    -- Vérifier que le rôle super_admin n'est pas déjà attribué
    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _target_id AND role = 'super_admin'
    ) THEN
        RAISE NOTICE 'Ce compte possède déjà le rôle super_admin. Aucune modification effectuée.';
        RETURN;
    END IF;

    -- Attribuer le rôle super_admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_id, 'super_admin');

    -- Journaliser l'attribution dans audit_logs
    INSERT INTO public.audit_logs (
        actor_id,
        actor_email,
        action,
        target_resource,
        details
    ) VALUES (
        _target_id,
        _email,
        'SUPER_ADMIN_ROLE_GRANTED',
        'user_roles',
        jsonb_build_object(
            'target_user_id', _target_id,
            'target_email', _email,
            'granted_by', 'init_script',
            'note', 'Premier super_admin créé manuellement via script d''initialisation sécurisé.'
        )
    );

    RAISE NOTICE 'Rôle super_admin attribué avec succès à : %  (UUID : %)', _email, _target_id;
END;
$$;

-- ÉTAPE 3 : Vérification finale (lecture seule)
SELECT
    ur.user_id,
    au.email,
    ur.role,
    ur.created_at AS role_granted_at
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role = 'super_admin'
ORDER BY ur.created_at DESC;
