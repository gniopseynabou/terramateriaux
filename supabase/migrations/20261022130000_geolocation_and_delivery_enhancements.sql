-- ============================================================
-- Migration: Geolocation, Road Routing, and Delivery Pricing Engine for TMI
-- Description:
--   1. Adds departure point and distance pricing parameters to delivery_settings.
--   2. Adds geolocation (lat, lng), commune, instructions, road distance, duration,
--      pricing snapshot, and manual override audit fields to orders.
--   3. Adds driver live position coordinates to deliveries.
--   4. Updates create_order_v2 with server-side delivery fee verification.
--   5. Adds admin RPC for manual delivery adjustments with audit logging.
--   6. Adds driver live location update RPC.
-- ============================================================

-- 1. EXTEND DELIVERY_SETTINGS TABLE
ALTER TABLE public.delivery_settings
    ADD COLUMN IF NOT EXISTS base_fee NUMERIC NOT NULL DEFAULT 1500,
    ADD COLUMN IF NOT EXISTS price_per_km NUMERIC NOT NULL DEFAULT 200,
    ADD COLUMN IF NOT EXISTS min_fee NUMERIC NOT NULL DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS departure_name TEXT NOT NULL DEFAULT 'Siège T.M.I. - Kédougou',
    ADD COLUMN IF NOT EXISTS departure_address TEXT NOT NULL DEFAULT 'Quartier Dandé Mayo, Kédougou, Sénégal',
    ADD COLUMN IF NOT EXISTS departure_lat DOUBLE PRECISION NOT NULL DEFAULT 12.5568,
    ADD COLUMN IF NOT EXISTS departure_lng DOUBLE PRECISION NOT NULL DEFAULT -12.1764;

-- Ensure default settings row exists and is populated
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.delivery_settings) THEN
        INSERT INTO public.delivery_settings (
            free_delivery_min_amount,
            free_delivery_enabled,
            base_fee,
            price_per_km,
            min_fee,
            departure_name,
            departure_address,
            departure_lat,
            departure_lng
        ) VALUES (
            50000,
            true,
            1500,
            200,
            1000,
            'Siège T.M.I. - Kédougou',
            'Quartier Dandé Mayo, Kédougou, Sénégal',
            12.5568,
            -12.1764
        );
    END IF;
END $$;

-- 2. EXTEND ORDERS TABLE FOR GEOLOCATION AND PRICING SNAPSHOT
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS delivery_commune TEXT,
    ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
    ADD COLUMN IF NOT EXISTS estimated_distance_km NUMERIC,
    ADD COLUMN IF NOT EXISTS estimated_duration_minutes NUMERIC,
    ADD COLUMN IF NOT EXISTS pricing_method TEXT DEFAULT 'DISTANCE_ROAD',
    ADD COLUMN IF NOT EXISTS pricing_params JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS route_geometry TEXT,
    ADD COLUMN IF NOT EXISTS location_created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS manual_override_reason TEXT,
    ADD COLUMN IF NOT EXISTS manual_override_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS manual_override_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_delivery_coords ON public.orders(delivery_lat, delivery_lng);

-- 3. EXTEND DELIVERIES TABLE FOR LIVE DRIVER TRACKING
ALTER TABLE public.deliveries
    ADD COLUMN IF NOT EXISTS driver_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS driver_lng DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMPTZ;

-- 4. EXTEND DELIVERY_ZONES TABLE
ALTER TABLE public.delivery_zones
    ADD COLUMN IF NOT EXISTS commune TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 5. UPDATE create_order_v2 RPC WITH SERVER-SIDE PRICING VALIDATION & GEOLOCATION
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
  _actual_price numeric;
  _product_name text;
  _qty int;
  _item_subtotal numeric;
  
  -- Delivery settings & calculation
  _settings record;
  _client_fee numeric := COALESCE((payload->>'delivery_fee')::numeric, 0);
  _verified_delivery_fee numeric := 0;
  _dist_km numeric := NULL;
  _duration_min numeric := NULL;
  _delivery_method text := COALESCE(payload->>'delivery_method', 'livraison');
  _pricing_method text := 'DISTANCE_ROAD';
  _pricing_params jsonb := '{}'::jsonb;
  _lat double precision := NULL;
  _lng double precision := NULL;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  IF jsonb_array_length(payload->'items') = 0 THEN
    RAISE EXCEPTION 'Le panier est vide';
  END IF;

  -- 1. Validate items and compute products subtotal securely on server
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

  -- 2. Validate payment method
  IF NOT EXISTS (
    SELECT 1 FROM public.payment_settings
    WHERE method_key = payload->>'payment_method' AND is_active
  ) AND payload->>'payment_method' <> 'cash_on_delivery' THEN
    RAISE EXCEPTION 'Moyen de paiement invalide ou indisponible';
  END IF;

  -- 3. Calculate and verify delivery fee securely
  IF _delivery_method = 'retrait' THEN
    _verified_delivery_fee := 0;
    _pricing_method := 'STORE_PICKUP';
    _pricing_params := jsonb_build_object('pickup', true, 'fee', 0);
  ELSE
    -- Fetch active delivery settings
    SELECT * INTO _settings FROM public.delivery_settings LIMIT 1;
    IF _settings IS NULL THEN
      _settings.base_fee := 1500;
      _settings.price_per_km := 200;
      _settings.min_fee := 1000;
      _settings.free_delivery_enabled := true;
      _settings.free_delivery_min_amount := 50000;
    END IF;

    -- Extract coordinates if present
    IF (payload->>'delivery_lat') IS NOT NULL AND (payload->>'delivery_lng') IS NOT NULL THEN
      _lat := (payload->>'delivery_lat')::double precision;
      _lng := (payload->>'delivery_lng')::double precision;
    END IF;

    IF (payload->>'estimated_distance_km') IS NOT NULL THEN
      _dist_km := (payload->>'estimated_distance_km')::numeric;
    END IF;

    IF (payload->>'estimated_duration_minutes') IS NOT NULL THEN
      _duration_min := (payload->>'estimated_duration_minutes')::numeric;
    END IF;

    -- Check free delivery eligibility
    IF _settings.free_delivery_enabled AND _order_subtotal >= _settings.free_delivery_min_amount THEN
      _verified_delivery_fee := 0;
      _pricing_method := 'FREE_DELIVERY_PROMO';
      _pricing_params := jsonb_build_object(
        'free_delivery_threshold', _settings.free_delivery_min_amount,
        'order_subtotal', _order_subtotal,
        'standard_fee_waived', true,
        'price_per_km', _settings.price_per_km,
        'distance_km', _dist_km
      );
    ELSE
      -- Calculate fee strictly from road distance: distance_km * price_per_km
      IF _dist_km IS NOT NULL AND _dist_km > 0 THEN
        _verified_delivery_fee := ROUND(_dist_km * _settings.price_per_km);
        _pricing_method := 'DISTANCE_ROAD';

        _pricing_params := jsonb_build_object(
          'price_per_km', _settings.price_per_km,
          'distance_km', _dist_km,
          'departure_name', _settings.departure_name,
          'departure_address', _settings.departure_address
        );
      ELSE
        -- Distance cannot be calculated, prevent order validation with invented fee
        RAISE EXCEPTION 'La distance routière de livraison doit être calculée avec précision par géolocalisation';
      END IF;
    END IF;
  END IF;

  -- Generate order number
  _order_number := 'TMI-' || to_char(now(), 'YYYY') || '-' || upper(substr(md5(random()::text), 1, 6));

  -- Insert order with all geolocation, distance, and pricing snapshot details
  INSERT INTO public.orders (
    order_number, user_id, customer_name, customer_phone, customer_email, customer_comment,
    delivery_method, delivery_address, delivery_region, delivery_city, delivery_quarter,
    delivery_commune, delivery_instructions, delivery_lat, delivery_lng,
    estimated_distance_km, estimated_duration_minutes, pricing_method, pricing_params,
    route_geometry, location_created_at, location_updated_at,
    delivery_fee, subtotal, total, estimated_total, payment_method, status, order_status
  ) VALUES (
    _order_number,
    _user_id,
    payload->>'customer_name',
    payload->>'customer_phone',
    payload->>'customer_email',
    payload->>'customer_comment',
    _delivery_method,
    payload->>'delivery_address',
    payload->>'delivery_region',
    payload->>'delivery_city',
    payload->>'delivery_quarter',
    payload->>'delivery_commune',
    payload->>'delivery_instructions',
    _lat,
    _lng,
    _dist_km,
    _duration_min,
    _pricing_method,
    _pricing_params,
    payload->>'route_geometry',
    now(),
    now(),
    _verified_delivery_fee,
    _order_subtotal,
    _order_subtotal + _verified_delivery_fee,
    _order_subtotal + _verified_delivery_fee,
    payload->>'payment_method',
    'en cours',
    'EN_ATTENTE_PAIEMENT'
  ) RETURNING id INTO _order_id;

  -- Create corresponding delivery record
  IF to_regclass('public.deliveries') IS NOT NULL THEN
    INSERT INTO public.deliveries (order_id, status)
    VALUES (_order_id, 'A_PREPARER');
  END IF;

  -- Insert order items
  FOR _item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    _qty := (_item->>'quantity')::int;
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

  -- Insert order history
  INSERT INTO public.order_history (order_id, status, comment, created_by)
  VALUES (
    _order_id,
    'EN_ATTENTE_PAIEMENT',
    'Commande enregistrée par le client (Livraison : ' || _delivery_method || ', Frais : ' || _verified_delivery_fee || ' FCFA).',
    _user_id
  );

  -- Insert notification
  INSERT INTO public.notifications (user_id, order_id, title, message, type)
  VALUES (
    _user_id,
    _order_id,
    'Commande confirmée',
    'Votre commande ' || _order_number || ' est enregistrée. Frais de livraison : ' || _verified_delivery_fee || ' FCFA.',
    'order'
  );

  SELECT json_build_object(
    'id', _order_id,
    'order_number', _order_number,
    'user_id', _user_id,
    'delivery_fee', _verified_delivery_fee,
    'total', _order_subtotal + _verified_delivery_fee
  ) INTO _res;

  RETURN _res;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_v2(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_order_v2(jsonb) TO authenticated;

-- 6. ADMIN RPC FOR MANUAL DELIVERY ADJUSTMENT WITH MANDATORY AUDIT LOG
CREATE OR REPLACE FUNCTION public.admin_update_order_delivery(
    _order_id UUID,
    _new_lat DOUBLE PRECISION,
    _new_lng DOUBLE PRECISION,
    _new_address TEXT,
    _new_commune TEXT,
    _new_quarter TEXT,
    _new_instructions TEXT,
    _new_distance_km NUMERIC,
    _new_delivery_fee NUMERIC,
    _override_reason TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _admin_id UUID := auth.uid();
    _old_record RECORD;
    _delivery RECORD;
BEGIN
    IF NOT public.has_role(_admin_id, 'admin') THEN
        RAISE EXCEPTION 'Accès réservé aux administrateurs';
    END IF;

    IF _override_reason IS NULL OR trim(_override_reason) = '' THEN
        RAISE EXCEPTION 'Le motif de modification est obligatoire';
    END IF;

    SELECT * INTO _old_record FROM public.orders WHERE id = _order_id;
    IF _old_record IS NULL THEN
        RAISE EXCEPTION 'Commande introuvable';
    END IF;

    SELECT * INTO _delivery FROM public.deliveries WHERE order_id = _order_id;

    -- Update order
    UPDATE public.orders
    SET
        delivery_lat = COALESCE(_new_lat, delivery_lat),
        delivery_lng = COALESCE(_new_lng, delivery_lng),
        delivery_address = COALESCE(_new_address, delivery_address),
        delivery_commune = COALESCE(_new_commune, delivery_commune),
        delivery_quarter = COALESCE(_new_quarter, delivery_quarter),
        delivery_instructions = COALESCE(_new_instructions, delivery_instructions),
        estimated_distance_km = COALESCE(_new_distance_km, estimated_distance_km),
        delivery_fee = COALESCE(_new_delivery_fee, delivery_fee),
        total = subtotal + COALESCE(_new_delivery_fee, delivery_fee),
        manual_override_reason = _override_reason,
        manual_override_by = _admin_id,
        manual_override_at = now(),
        location_updated_at = now(),
        updated_at = now()
    WHERE id = _order_id;

    -- Log to delivery_history
    IF _delivery.id IS NOT NULL THEN
        INSERT INTO public.delivery_history (
            delivery_id,
            order_id,
            driver_id,
            status,
            comment,
            created_by
        ) VALUES (
            _delivery.id,
            _order_id,
            _delivery.driver_id,
            COALESCE(_delivery.status::text, 'MODIFICATION_ADMIN'),
            'Ajustement livraison admin: ' || _override_reason || ' (Frais: ' || _new_delivery_fee || ' FCFA, Dist: ' || COALESCE(_new_distance_km, 0) || ' km)',
            _admin_id
        );
    END IF;

    -- Log to order_history
    INSERT INTO public.order_history (order_id, status, comment, created_by)
    VALUES (
        _order_id,
        _old_record.order_status,
        'Ajustement coordonnées/frais livraison par l''administrateur. Motif : ' || _override_reason,
        _admin_id
    );

    RETURN json_build_object(
        'success', true,
        'order_id', _order_id,
        'delivery_fee', _new_delivery_fee
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_order_delivery(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_delivery(UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO authenticated;

-- 7. DRIVER LIVE LOCATION UPDATE RPC
CREATE OR REPLACE FUNCTION public.driver_update_live_location(
    _delivery_id UUID,
    _lat DOUBLE PRECISION,
    _lng DOUBLE PRECISION
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID := auth.uid();
    _driver_id UUID;
BEGIN
    -- Verify driver identity or admin
    SELECT id INTO _driver_id
    FROM public.delivery_drivers
    WHERE user_id = _user_id;

    IF _driver_id IS NULL AND NOT public.has_role(_user_id, 'admin') THEN
        RAISE EXCEPTION 'Seul le livreur assigné ou un administrateur peut mettre à jour la position';
    END IF;

    -- Verify this driver is assigned to this delivery (unless admin)
    IF NOT public.has_role(_user_id, 'admin') THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.deliveries
            WHERE id = _delivery_id AND driver_id = _driver_id
        ) THEN
            RAISE EXCEPTION 'Vous n''êtes pas assigné à cette livraison';
        END IF;
    END IF;

    UPDATE public.deliveries
    SET
        driver_lat = _lat,
        driver_lng = _lng,
        driver_location_updated_at = now()
    WHERE id = _delivery_id;

    RETURN json_build_object('success', true, 'lat', _lat, 'lng', _lng);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.driver_update_live_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) FROM anon;
GRANT EXECUTE ON FUNCTION public.driver_update_live_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
