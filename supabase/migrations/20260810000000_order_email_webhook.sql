-- ============================================================
-- Migration: Ajout de customer_email et webhook pour les emails
-- ============================================================

-- 1. Ajouter le champ email du client dans la table orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- 2. Activer pg_net (nécessaire pour les webhooks HTTP depuis SQL)
-- Note: cette extension doit être activée dans le Dashboard Supabase
-- (Database > Extensions > pg_net)

-- 3. Créer la fonction qui appelle l'Edge Function via HTTP
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _project_ref TEXT;
  _anon_key TEXT;
BEGIN
  -- Ces valeurs sont injectées via les secrets Supabase (pg_net)
  -- Elles sont configurées dans le Dashboard Supabase > Settings > API
  _project_ref := current_setting('app.settings.project_ref', true);
  _anon_key    := current_setting('app.settings.anon_key', true);

  -- N'envoyer que si le statut a vraiment changé
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url     := 'https://' || _project_ref || '.supabase.co/functions/v1/send-order-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || _anon_key
      ),
      body    := jsonb_build_object(
        'record',     row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Créer le trigger sur la table orders
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;

CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();


-- 5. Mettre à jour les valeurs de statut pour correspondre aux clés de l'Edge Function
-- Les statuts dans la BD doivent utiliser des underscores (ex: en_attente_paiement)
COMMENT ON COLUMN public.orders.status IS 
  'Valeurs possibles: en_attente_paiement | paiement_en_verification | paiement_verifie | en_preparation | expediee | livree';

COMMENT ON COLUMN public.orders.customer_email IS
  'Email du client pour recevoir les notifications de statut de commande';
