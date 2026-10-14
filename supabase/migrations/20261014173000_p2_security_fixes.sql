-- ============================================================
-- Migration: P2 Security Fixes (SEC-012)
-- Description: Durcissement de la fonction notify_order_status_change
--              en fixant explicitement search_path = public
-- Date: 2026-10-14
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _project_ref TEXT;
  _webhook_secret TEXT;
BEGIN
  _project_ref := current_setting('app.settings.project_ref', true);
  _webhook_secret := current_setting('app.settings.webhook_secret', true);

  IF _webhook_secret IS NULL OR _webhook_secret = '' THEN
    _webhook_secret := current_setting('app.settings.service_role_key', true);
  END IF;

  IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    PERFORM net.http_post(
      url     := 'https://' || _project_ref || '.supabase.co/functions/v1/send-order-email',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || _webhook_secret
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
