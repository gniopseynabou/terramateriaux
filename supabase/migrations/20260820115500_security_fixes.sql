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
BEGIN
  -- Generate secure order number: TMI-YYYY-XXXXXX
  _order_number := 'TMI-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 6));

  -- Insert order
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
    (payload->>'delivery_fee')::numeric,
    (payload->>'subtotal')::numeric,
    (payload->>'total')::numeric,
    (payload->>'total')::numeric,
    payload->>'payment_method',
    'en cours',
    'EN_ATTENTE_PAIEMENT'
  ) RETURNING id INTO _order_id;

  -- Insert items
  FOR _item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    INSERT INTO public.order_items (
      order_id, product_id, product_name, quantity, unit_price, is_gros, subtotal
    ) VALUES (
      _order_id,
      (_item->>'product_id')::uuid,
      _item->>'product_name',
      (_item->>'quantity')::int,
      (_item->>'unit_price')::numeric,
      (_item->>'is_gros')::boolean,
      (_item->>'subtotal')::numeric
    );
  END LOOP;

  -- Insert history
  INSERT INTO public.order_history (order_id, status, comment, created_by)
  VALUES (
    _order_id,
    'EN_ATTENTE_PAIEMENT',
    'Commande enregistrée par le client (paiement choisi : ' || (payload->>'payment_method') || ').',
    _user_id
  );

  -- Insert notification
  INSERT INTO public.notifications (user_id, order_id, title, message, type)
  VALUES (
    _user_id,
    _order_id,
    'Commande confirmée',
    'Votre commande ' || _order_number || ' est en attente de paiement.',
    'order'
  );

  -- Return order details to frontend
  SELECT json_build_object(
    'id', _order_id,
    'order_number', _order_number,
    'user_id', _user_id
  ) INTO _res;

  RETURN _res;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_order_v2(jsonb) TO anon, authenticated;

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
  WHERE o.order_number = _order_number AND (o.user_id IS NULL OR o.user_id = auth.uid());
  
  RETURN res;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_order_details_by_number(text) TO anon, authenticated;

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
