DROP POLICY IF EXISTS "Admins manage communication settings" ON public.communication_settings;
DROP POLICY IF EXISTS "Admins update public WhatsApp settings" ON public.communication_settings;
CREATE POLICY "Admins update public WhatsApp settings"
ON public.communication_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT UPDATE (whatsapp_number, whatsapp_message) ON public.communication_settings TO authenticated;
REVOKE INSERT, DELETE ON public.communication_settings FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_technical_contact_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'admin')
     AND (NEW.technical_email IS DISTINCT FROM OLD.technical_email
       OR NEW.technical_whatsapp IS DISTINCT FROM OLD.technical_whatsapp) THEN
    RAISE EXCEPTION 'Les coordonnées techniques sont en lecture seule';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_technical_contact_changes ON public.communication_settings;
CREATE TRIGGER trg_prevent_technical_contact_changes
BEFORE UPDATE ON public.communication_settings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_technical_contact_changes();