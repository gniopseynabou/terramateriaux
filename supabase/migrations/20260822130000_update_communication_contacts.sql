INSERT INTO public.communication_settings (id, whatsapp_number, technical_whatsapp, technical_email)
SELECT gen_random_uuid(), '786019291', '786019291', 'sdgftech@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM public.communication_settings);

UPDATE public.communication_settings
SET whatsapp_number = '786019291',
    technical_whatsapp = '786019291',
    technical_email = 'sdgftech@gmail.com';

CREATE OR REPLACE FUNCTION public.prevent_technical_contact_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.technical_email IS DISTINCT FROM OLD.technical_email
         OR NEW.technical_whatsapp IS DISTINCT FROM OLD.technical_whatsapp THEN
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