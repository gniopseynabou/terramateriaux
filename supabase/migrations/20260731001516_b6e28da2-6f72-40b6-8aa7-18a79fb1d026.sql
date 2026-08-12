CREATE OR REPLACE FUNCTION public.declare_payment(
  _order_id uuid,
  _payment_method text,
  _amount numeric,
  _reference text DEFAULT NULL,
  _proof_url text DEFAULT NULL,
  _comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders%ROWTYPE;
  payment_id uuid;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF o.user_id IS NOT NULL AND o.user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  IF o.order_status NOT IN ('EN_ATTENTE_PAIEMENT','PAIEMENT_EN_ATTENTE','CLIENT_CONTACTE','EN_ATTENTE_VALIDATION','EN_COURS_ANALYSE','PAIEMENT_EN_ATTENTE_VERIFICATION') THEN
    RAISE EXCEPTION 'Le paiement ne peut plus être déclaré pour cette commande';
  END IF;

  INSERT INTO public.payments (order_id, user_id, payment_method, amount, currency, reference, proof_url, status)
  VALUES (_order_id, o.user_id, _payment_method, _amount, 'FCFA', NULLIF(_reference, ''),
          NULLIF(_proof_url, ''), CASE WHEN _proof_url IS NULL OR _proof_url = '' THEN 'pending'::payment_status ELSE 'proof_uploaded'::payment_status END)
  RETURNING id INTO payment_id;

  UPDATE public.orders
     SET order_status = 'PAIEMENT_EN_ATTENTE_VERIFICATION',
         payment_status = 'proof_uploaded',
         payment_method = _payment_method,
         payment_id = payment_id,
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.order_history (order_id, status, comment, created_by)
  VALUES (_order_id, 'PAIEMENT_EN_ATTENTE_VERIFICATION',
          'Paiement déclaré par le client (' || _payment_method || ') — référence : ' || COALESCE(NULLIF(_reference, ''), 'non renseignée')
          || COALESCE(' — ' || NULLIF(_comment, ''), ''),
          auth.uid());

  INSERT INTO public.notifications (user_id, order_id, title, message, type)
  VALUES (o.user_id, _order_id, 'Paiement déclaré',
          'Votre paiement a bien été enregistré. Notre équipe le vérifie dans les meilleurs délais.', 'payment');

  RETURN payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.declare_payment(uuid, text, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.declare_payment(uuid, text, numeric, text, text, text) TO anon, authenticated;