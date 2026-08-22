CREATE TABLE IF NOT EXISTS public.communication_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL DEFAULT '',
  whatsapp_message text NOT NULL DEFAULT 'Bonjour Terra Matériaux International, je souhaite obtenir des informations.',
  technical_email text NOT NULL DEFAULT 'support@tmi-senegal.com',
  technical_whatsapp text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.communication_settings TO anon, authenticated;
GRANT ALL ON public.communication_settings TO service_role;
ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Communication settings publicly readable" ON public.communication_settings;
CREATE POLICY "Communication settings publicly readable"
ON public.communication_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins manage communication settings" ON public.communication_settings;
CREATE POLICY "Admins manage communication settings"
ON public.communication_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.communication_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.communication_settings);