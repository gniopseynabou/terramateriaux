CREATE OR REPLACE FUNCTION public.admin_mark_cash_payment(
  _order_id uuid,
  _proof_url text DEFAULT NULL::text,
  _comment text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o public.orders%ROWTYPE;
  _payment_id uuid;
  _proof text := NULLIF(btrim(COALESCE(_proof_url, '')), '');
  _cmt text := NULLIF(btrim(COALESCE(_comment, '')), '');
  _amount numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès réservé aux administrateurs';
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;
  IF o.payment_method <> 'cash_on_delivery' THEN
    RAISE EXCEPTION 'Cette commande n''est pas en paiement à la livraison';
  END IF;
  IF EXISTS (SELECT 1 FROM public.payments p WHERE p.order_id = _order_id AND p.status IN ('paid', 'verified')) THEN
    RAISE EXCEPTION 'Le paiement de cette commande est déjà enregistré';
  END IF;

  _amount := COALESCE(NULLIF(o.final_total, 0), NULLIF(o.estimated_total, 0), o.total, 0);
  INSERT INTO public.payments (order_id, user_id, payment_method, amount, currency, reference, proof_url, status, admin_comment, validated_by, validated_at)
  VALUES (_order_id, o.user_id, 'cash_on_delivery', _amount, 'FCFA', o.order_number, _proof, 'paid', _cmt, auth.uid(), now())
  RETURNING id INTO _payment_id;

  UPDATE public.orders
     SET payment_status = 'paid',
         payment_id = _payment_id,
         status = 'confirmée',
         order_status = 'PAIEMENT_RECU',
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.order_history (order_id, status, comment, created_by)
  VALUES (_order_id, 'PAIEMENT_RECU', COALESCE(_cmt, 'Paiement à la livraison encaissé par un administrateur.'), auth.uid());

  RETURN _payment_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_mark_cash_payment(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_cash_payment(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.require_payment_proof_before_validation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('verified', 'paid')
     AND NULLIF(btrim(COALESCE(NEW.proof_url, '')), '') IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.orders o
       WHERE o.id = NEW.order_id AND o.payment_method = 'cash_on_delivery'
     ) THEN
    RAISE EXCEPTION 'Impossible de valider un paiement sans preuve';
  END IF;
  RETURN NEW;
END;
$function$;