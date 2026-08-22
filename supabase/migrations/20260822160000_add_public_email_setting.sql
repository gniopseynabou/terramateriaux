ALTER TABLE public.communication_settings
  ADD COLUMN IF NOT EXISTS public_email text NOT NULL DEFAULT 'contact@tmi-senegal.com';

UPDATE public.communication_settings
SET public_email = 'contact@tmi-senegal.com'
WHERE NULLIF(btrim(public_email), '') IS NULL;

GRANT UPDATE (public_email) ON public.communication_settings TO authenticated;