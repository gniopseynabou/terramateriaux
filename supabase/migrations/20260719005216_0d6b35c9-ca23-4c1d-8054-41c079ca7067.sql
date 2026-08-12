
-- Payment status enum
DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending','proof_uploaded','verified','rejected','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  reference TEXT,
  proof_url TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  admin_comment TEXT,
  validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT SELECT, INSERT ON public.payments TO anon;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users view own payments" ON public.payments
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Anyone can insert a payment (guest checkout supported)
CREATE POLICY "Anyone can insert payment" ON public.payments
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Users can update their own payment (upload proof), admins update all
CREATE POLICY "Users update own payment" ON public.payments
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Admin delete
CREATE POLICY "Admins delete payments" ON public.payments
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE TRIGGER trg_payments_updated
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Extend orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

-- Storage policies for payment-proofs bucket (path: <user_id_or_'guest'>/<order_id>/<filename>)
CREATE POLICY "Users upload own proofs" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Users read own proofs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs' AND (
    public.has_role(auth.uid(),'admin')
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Admins manage proofs" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(),'admin'));
