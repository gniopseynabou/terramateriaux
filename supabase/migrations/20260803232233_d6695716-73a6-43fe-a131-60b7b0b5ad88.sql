-- 1. Table des demandes client (modification / annulation)
CREATE TYPE public.order_request_type AS ENUM ('MODIFICATION', 'ANNULATION');
CREATE TYPE public.order_request_status AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'TRAITEE');

CREATE TABLE public.order_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid,
  request_type public.order_request_type NOT NULL,
  reason text NOT NULL,
  admin_response text,
  status public.order_request_status NOT NULL DEFAULT 'EN_ATTENTE',
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.order_requests TO authenticated;
GRANT UPDATE, DELETE ON public.order_requests TO authenticated;
GRANT ALL ON public.order_requests TO service_role;

ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own requests" ON public.order_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own requests" ON public.order_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE POLICY "Admins manage requests" ON public.order_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_order_requests_updated
  BEFORE UPDATE ON public.order_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_order_requests_order ON public.order_requests(order_id);
CREATE INDEX idx_order_requests_status ON public.order_requests(status);

-- 2. Helper : la commande est-elle encore modifiable par le client ?
CREATE OR REPLACE FUNCTION public.order_is_client_editable(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND o.order_status = 'EN_ATTENTE_PAIEMENT'
      AND o.payment_status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.order_id = o.id AND p.status IN ('pending','proof_uploaded','verified','paid')
      )
  )
$$;

-- 3. Recalcul des totaux d'une commande
CREATE OR REPLACE FUNCTION public.recalculate_order_totals(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub integer;
  _fee integer;
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO _sub FROM public.order_items WHERE order_id = _order_id;
  SELECT delivery_fee INTO _fee FROM public.orders WHERE id = _order_id;
  UPDATE public.orders
     SET subtotal = _sub,
         total = _sub + COALESCE(_fee, 0),
         estimated_total = _sub + COALESCE(_fee, 0),
         updated_at = now()
   WHERE id = _order_id;
END;
$$;

-- 4. Annulation par le client (avant paiement)
CREATE OR REPLACE FUNCTION public.client_cancel_order(_order_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF o.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF NOT public.order_is_client_editable(_order_id) THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être annulée directement. Envoyez une demande d''annulation.';
  END IF;

  UPDATE public.orders
     SET order_status = 'ANNULEE', status = 'annulée', updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.order_history (order_id, status, comment, created_by)
  VALUES (_order_id, 'ANNULEE',
          'Commande annulée par le client' || COALESCE(' - ' || NULLIF(btrim(_reason), ''), ''),
          auth.uid());

  INSERT INTO public.notifications (user_id, order_id, title, message, type)
  VALUES (o.user_id, _order_id, 'Commande annulée',
          'Votre commande ' || o.order_number || ' a bien été annulée.', 'order');
END;
$$;

-- 5. Modification d'une ligne de commande par le client (avant paiement)
CREATE OR REPLACE FUNCTION public.client_update_order_item(_item_id uuid, _quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it public.order_items%ROWTYPE;
  o public.orders%ROWTYPE;
  _remaining integer;
BEGIN
  SELECT * INTO it FROM public.order_items WHERE id = _item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Article introuvable'; END IF;

  SELECT * INTO o FROM public.orders WHERE id = it.order_id;
  IF o.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF NOT public.order_is_client_editable(o.id) THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être modifiée directement. Envoyez une demande de modification.';
  END IF;
  IF _quantity IS NULL OR _quantity < 0 OR _quantity > 100000 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  IF _quantity = 0 THEN
    SELECT COUNT(*) INTO _remaining FROM public.order_items WHERE order_id = o.id;
    IF _remaining <= 1 THEN
      RAISE EXCEPTION 'Une commande doit contenir au moins un produit. Annulez la commande à la place.';
    END IF;
    DELETE FROM public.order_items WHERE id = _item_id;
  ELSE
    UPDATE public.order_items
       SET quantity = _quantity, subtotal = _quantity * unit_price
     WHERE id = _item_id;
  END IF;

  PERFORM public.recalculate_order_totals(o.id);

  INSERT INTO public.order_history (order_id, status, comment, created_by)
  VALUES (o.id, o.order_status,
          CASE WHEN _quantity = 0
               THEN 'Article retiré par le client : ' || it.product_name
               ELSE 'Quantité modifiée par le client : ' || it.product_name || ' → ' || _quantity
          END,
          auth.uid());
END;
$$;

-- 6. Modification des informations de livraison par le client (avant paiement)
CREATE OR REPLACE FUNCTION public.client_update_order_delivery(
  _order_id uuid,
  _customer_name text,
  _customer_phone text,
  _delivery_address text DEFAULT NULL,
  _delivery_region text DEFAULT NULL,
  _delivery_city text DEFAULT NULL,
  _delivery_quarter text DEFAULT NULL,
  _customer_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF o.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF NOT public.order_is_client_editable(_order_id) THEN
    RAISE EXCEPTION 'Cette commande ne peut plus être modifiée directement. Envoyez une demande de modification.';
  END IF;

  IF length(btrim(COALESCE(_customer_name,''))) < 2 THEN RAISE EXCEPTION 'Nom invalide'; END IF;
  IF length(btrim(COALESCE(_customer_phone,''))) < 6 THEN RAISE EXCEPTION 'Téléphone invalide'; END IF;

  UPDATE public.orders
     SET customer_name = btrim(_customer_name),
         customer_phone = btrim(_customer_phone),
         delivery_address = NULLIF(btrim(COALESCE(_delivery_address,'')), ''),
         delivery_region = NULLIF(btrim(COALESCE(_delivery_region,'')), ''),
         delivery_city = NULLIF(btrim(COALESCE(_delivery_city,'')), ''),
         delivery_quarter = NULLIF(btrim(COALESCE(_delivery_quarter,'')), ''),
         customer_comment = NULLIF(btrim(COALESCE(_customer_comment,'')), ''),
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.order_history (order_id, status, comment, created_by)
  VALUES (_order_id, o.order_status, 'Informations de livraison mises à jour par le client.', auth.uid());
END;
$$;

-- 7. Création d'une demande après paiement
CREATE OR REPLACE FUNCTION public.create_order_request(
  _order_id uuid,
  _request_type public.order_request_type,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  _id uuid;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commande introuvable'; END IF;
  IF o.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  IF length(btrim(COALESCE(_reason,''))) < 5 THEN
    RAISE EXCEPTION 'Merci de préciser le motif de votre demande (5 caractères minimum).';
  END IF;
  IF length(_reason) > 1000 THEN RAISE EXCEPTION 'Motif trop long (1000 caractères max).'; END IF;
  IF o.order_status IN ('LIVREE','TERMINEE','ANNULEE') THEN
    RAISE EXCEPTION 'Cette commande est clôturée.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.order_requests r
             WHERE r.order_id = _order_id AND r.status = 'EN_ATTENTE') THEN
    RAISE EXCEPTION 'Une demande est déjà en attente de traitement pour cette commande.';
  END IF;

  INSERT INTO public.order_requests (order_id, user_id, request_type, reason)
  VALUES (_order_id, auth.uid(), _request_type, btrim(_reason))
  RETURNING id INTO _id;

  INSERT INTO public.notifications (user_id, order_id, title, message, type)
  VALUES (o.user_id, _order_id,
          CASE WHEN _request_type = 'ANNULATION' THEN 'Demande d''annulation envoyée' ELSE 'Demande de modification envoyée' END,
          'Votre demande concernant la commande ' || o.order_number || ' a été transmise à notre équipe.',
          'order');

  RETURN _id;
END;
$$;