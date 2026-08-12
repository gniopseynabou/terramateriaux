ALTER TABLE public.payment_settings ADD COLUMN IF NOT EXISTS qr_url text;

ALTER TABLE public.orders ALTER COLUMN order_status SET DEFAULT 'EN_ATTENTE_PAIEMENT'::order_status;

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed text[];
BEGIN
  IF NEW.order_status = OLD.order_status THEN
    RETURN NEW;
  END IF;

  IF NEW.order_status = 'ANNULEE' THEN
    IF OLD.order_status IN ('LIVREE', 'TERMINEE') THEN
      RAISE EXCEPTION 'Transition de statut invalide : % -> %', OLD.order_status, NEW.order_status;
    END IF;
    RETURN NEW;
  END IF;

  allowed := CASE OLD.order_status::text
    WHEN 'EN_ATTENTE_PAIEMENT' THEN ARRAY['PAIEMENT_EN_ATTENTE_VERIFICATION','PAIEMENT_RECU']
    WHEN 'EN_ATTENTE_VALIDATION' THEN ARRAY['EN_COURS_ANALYSE','CLIENT_CONTACTE','EN_ATTENTE_PAIEMENT','PAIEMENT_EN_ATTENTE_VERIFICATION']
    WHEN 'EN_COURS_ANALYSE' THEN ARRAY['CLIENT_CONTACTE','EN_ATTENTE_PAIEMENT','PAIEMENT_EN_ATTENTE_VERIFICATION']
    WHEN 'CLIENT_CONTACTE' THEN ARRAY['EN_ATTENTE_PAIEMENT','PAIEMENT_EN_ATTENTE_VERIFICATION']
    WHEN 'PAIEMENT_EN_ATTENTE' THEN ARRAY['PAIEMENT_EN_ATTENTE_VERIFICATION','PAIEMENT_RECU','EN_ATTENTE_PAIEMENT']
    WHEN 'PAIEMENT_EN_ATTENTE_VERIFICATION' THEN ARRAY['PAIEMENT_RECU','EN_ATTENTE_PAIEMENT']
    WHEN 'PAIEMENT_RECU' THEN ARRAY['PREPARATION']
    WHEN 'PREPARATION' THEN ARRAY['EXPEDIEE']
    WHEN 'EXPEDIEE' THEN ARRAY['LIVREE']
    WHEN 'LIVREE' THEN ARRAY['TERMINEE']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (NEW.order_status::text = ANY(allowed)) THEN
    RAISE EXCEPTION 'Transition de statut invalide : % -> %', OLD.order_status, NEW.order_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_status_transition ON public.orders;
CREATE TRIGGER trg_validate_order_status_transition
BEFORE UPDATE OF order_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();

CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON public.order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_history REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.order_history; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;