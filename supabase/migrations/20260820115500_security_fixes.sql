-- ============================================================
-- Migration: Security Fixes (P0/P1)
-- ============================================================

-- 1. Create a secure RPC for order creation (Replaces client-side inserts)
CREATE OR REPLACE FUNCTION public.create_order_v2(payload jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _order_number text;
  _order_id uuid;
  _item jsonb;
  _res json;
  _order_subtotal numeric := 0;
  _delivery_fee numeric := COALESCE((payload->>'delivery_fee')::numeric, 0);
  _actual_price numeric;
  _product_name text;
  _qty int;
  _item_subtotal numeric;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF jsonb_array_length(payload->'items') = 0 THEN
    RAISE EXCEPTION 'Le panier est vide';
  END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    _qty := (_item->>'quantity')::int;
    IF _qty IS NULL OR _qty <= 0 OR _qty > 100000 THEN
      RAISE EXCEPTION 'Quantité invalide';
    END IF;
    SELECT price_fcfa, name INTO _actual_price, _product_name FROM public.products WHERE id = (_item->>'product_id')::uuid;
    IF _actual_price IS NULL THEN
      RAISE EXCEPTION 'Produit introuvable';
    END IF;
    _order_subtotal := _order_subtotal + (_actual_price * _qty);
  END LOOP;

  IF _delivery_fee < 0 THEN
    RAISE EXCEPTION 'Frais de livraison invalides';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.payment_settings
    WHERE method_key = payload->>'payment_method' AND is_active
  ) AND payload->>'payment_method' <> 'cash_on_delivery' THEN
    RAISE EXCEPTION 'Moyen de paiement invalide ou indisponible';
  END IF;

  IF payload->>'delivery_method' = 'livraison'
     AND to_regclass('public.delivery_zones') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.delivery_zones
       WHERE region = payload->>'delivery_region'
         AND city = payload->>'delivery_city'
     ) THEN
    RAISE EXCEPTION 'Zone de livraison invalide';
  END IF;

  _order_number := 'TMI-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 6));

  INSERT INTO public.orders (
    order_number, user_id, customer_name, customer_phone, customer_email, customer_comment,
    delivery_method, delivery_address, delivery_region, delivery_city, delivery_quarter,
    delivery_fee, subtotal, total, estimated_total, payment_method, status, order_status
  ) VALUES (
    _order_number,
    _user_id,
    payload->>'customer_name',
    payload->>'customer_phone',
    payload->>'customer_email',
    payload->>'customer_comment',
    payload->>'delivery_method',
    payload->>'delivery_address',
    payload->>'delivery_region',
    payload->>'delivery_city',
    payload->>'delivery_quarter',
    _delivery_fee,
    _order_subtotal,
    _order_subtotal + _delivery_fee,
    _order_subtotal + _delivery_fee,
    payload->>'payment_method',
    'en cours',
    'EN_ATTENTE_PAIEMENT'
  ) RETURNING id INTO _order_id;

  IF to_regclass('public.deliveries') IS NOT NULL THEN
    INSERT INTO public.deliveries (order_id, status)
    VALUES (_order_id, 'A_PREPARER');
  END IF;

  FOR _item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    _qty := (_item->>'quantity')::int;
    IF _qty IS NULL OR _qty <= 0 OR _qty > 100000 THEN
      RAISE EXCEPTION 'Quantité invalide';
    END IF;
    SELECT price_fcfa, name INTO _actual_price, _product_name FROM public.products WHERE id = (_item->>'product_id')::uuid;
    _item_subtotal := _actual_price * _qty;

    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, is_gros, subtotal
    ) VALUES (
      _order_id,
      (_item->>'product_id')::uuid,
      _product_name,
      _qty,
      _actual_price,
      COALESCE((_item->>'is_gros')::boolean, false),
      _item_subtotal
    );
  END LOOP;

  INSERT INTO public.order_history (order_id, status, comment, created_by)
  VALUES (
    _order_id,
    'EN_ATTENTE_PAIEMENT',
    'Commande enregistrée par le client (paiement choisi : ' || (payload->>'payment_method') || ').',
    _user_id
  );

  INSERT INTO public.notifications (user_id, order_id, title, message, type)
  VALUES (
    _user_id,
    _order_id,
    'Commande confirmée',
    'Votre commande ' || _order_number || ' est en attente de paiement.',
    'order'
  );

  SELECT json_build_object(
    'id', _order_id,
    'order_number', _order_number,
    'user_id', _user_id
  ) INTO _res;

  RETURN _res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_order_v2(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order_v2(jsonb) TO authenticated;

-- 2. Create RPC to fetch order details securely for confirmation page
CREATE OR REPLACE FUNCTION public.get_order_details_by_number(_order_number text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res json;
BEGIN
  SELECT json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'user_id', o.user_id,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'customer_email', o.customer_email,
    'delivery_method', o.delivery_method,
    'delivery_address', o.delivery_address,
    'delivery_region', o.delivery_region,
    'delivery_city', o.delivery_city,
    'delivery_quarter', o.delivery_quarter,
    'delivery_fee', o.delivery_fee,
    'subtotal', o.subtotal,
    'total', o.total,
    'estimated_total', o.estimated_total,
    'final_total', o.final_total,
    'status', o.status,
    'order_status', o.order_status,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'order_items', (SELECT coalesce(json_agg(row_to_json(oi)), '[]'::json) FROM public.order_items oi WHERE oi.order_id = o.id),
    'order_history', (SELECT coalesce(json_agg(row_to_json(oh)), '[]'::json) FROM public.order_history oh WHERE oh.order_id = o.id),
    'payments', (SELECT coalesce(json_agg(row_to_json(p)), '[]'::json) FROM public.payments p WHERE p.order_id = o.id)
  )
  INTO res
  FROM public.orders o
  WHERE o.order_number = _order_number AND o.user_id = auth.uid();
  
  RETURN res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_order_details_by_number(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_order_details_by_number(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_payment_proof_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.proof_url IS NULL OR btrim(NEW.proof_url) = '' THEN
    RETURN NEW;
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin')
     AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Preuve de paiement non autorisée';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin')
     AND position('/' || auth.uid()::text || '/' || NEW.order_id::text || '/' IN NEW.proof_url) = 0 THEN
    RAISE EXCEPTION 'Chemin de preuve de paiement invalide';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payment_proof_owner ON public.payments;
CREATE TRIGGER trg_validate_payment_proof_owner
  BEFORE INSERT OR UPDATE OF proof_url, user_id, order_id ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_proof_owner();

-- 3. Fix RLS on orders
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- 4. Fix RLS on order_items
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 5. Fix RLS on order_history
DROP POLICY IF EXISTS "Anyone can insert history" ON public.order_history;
DROP POLICY IF EXISTS "Anyone can insert order history" ON public.order_history;
DROP POLICY IF EXISTS "Users can create order history" ON public.order_history;

DROP POLICY IF EXISTS "Users can view own order history" ON public.order_history;
CREATE POLICY "Users can view own order history" ON public.order_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_history.order_id AND o.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 6. Fix RLS on payments
DROP POLICY IF EXISTS "Anyone can insert payment" ON public.payments;
CREATE POLICY "payments: Admin INSERT" ON public.payments
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Fix RLS on notifications
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.notifications;
CREATE POLICY "notifications: Admin INSERT" ON public.notifications
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Fix Storage payment-proofs Policy
DROP POLICY IF EXISTS "Users upload own proofs" ON storage.objects;
CREATE POLICY "Users upload own proofs" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = COALESCE(auth.uid()::text, 'guest')
);
