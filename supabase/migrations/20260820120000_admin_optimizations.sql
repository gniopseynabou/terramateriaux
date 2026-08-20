-- ============================================================
-- Migration: Admin Optimizations & Webhook Security
-- ============================================================

-- 1. Helper function to find user ID by email securely
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(email_addr text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  -- Restrict to admins only
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT id INTO _id FROM auth.users WHERE email = email_addr;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;

-- 2. Secure Webhook call (avoid using anon_key)
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _project_ref TEXT;
  _webhook_secret TEXT;
BEGIN
  _project_ref := current_setting('app.settings.project_ref', true);
  _webhook_secret := current_setting('app.settings.webhook_secret', true);

  IF _webhook_secret IS NULL OR _webhook_secret = '' THEN
    -- Fallback to service_role key to prevent using anon_key publicly
    _webhook_secret := current_setting('app.settings.service_role_key', true);
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
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
