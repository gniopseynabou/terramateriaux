-- 1. Order status enum
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'EN_ATTENTE_VALIDATION','EN_COURS_ANALYSE','CLIENT_CONTACTE','PAIEMENT_EN_ATTENTE',
    'PAIEMENT_RECU','PREPARATION','EXPEDIEE','LIVREE','TERMINEE','ANNULEE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Orders extensions
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS delivery_quarter text,
  ADD COLUMN IF NOT EXISTS customer_comment text,
  ADD COLUMN IF NOT EXISTS estimated_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_total integer,
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS assigned_name text,
  ADD COLUMN IF NOT EXISTS order_status public.order_status NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION';

UPDATE public.orders SET estimated_total = total WHERE estimated_total = 0;

CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- 3. Order history
CREATE TABLE IF NOT EXISTS public.order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  comment text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_history TO authenticated;
GRANT SELECT, INSERT ON public.order_history TO anon;
GRANT ALL ON public.order_history TO service_role;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert history" ON public.order_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners and admins read history" ON public.order_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_history.order_id AND (o.user_id = auth.uid() OR o.user_id IS NULL))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins manage history" ON public.order_history FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON public.order_history(order_id);

-- 4. Payment settings
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  method_key text NOT NULL UNIQUE,
  label text NOT NULL,
  account_name text,
  account_number text,
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO anon;
GRANT SELECT ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payment settings publicly readable" ON public.payment_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage payment settings" ON public.payment_settings FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_payment_settings_updated BEFORE UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.payment_settings (method_key, label, account_name, account_number, instructions, sort_order) VALUES
  ('wave','Wave','TERRA MATERIAUX INTL','+221 77 000 00 00','Envoyez le montant via l''application Wave puis conservez la capture.',1),
  ('orange_money','Orange Money','TERRA MATERIAUX INTL','+221 78 000 00 00','Composez #144# ou utilisez l''application Orange Money.',2),
  ('free_money','Free Money','TERRA MATERIAUX INTL','+221 76 000 00 00','Paiement via l''application Free Money.',3),
  ('bank_transfer','Virement bancaire','TERRA MATERIAUX INTERNATIONAL','SN000 00000 000000000000 00','Indiquez le numéro de commande en référence du virement.',4)
ON CONFLICT (method_key) DO NOTHING;

-- 5. Staff assignments
CREATE TABLE IF NOT EXISTS public.staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  staff_user_id uuid,
  staff_name text NOT NULL,
  note text,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_assignments TO authenticated;
GRANT ALL ON public.staff_assignments TO service_role;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage staff assignments" ON public.staff_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_staff_assignments_order_id ON public.staff_assignments(order_id);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'order',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO anon;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
