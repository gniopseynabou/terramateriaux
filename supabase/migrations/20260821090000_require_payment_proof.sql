CREATE OR REPLACE FUNCTION public.declare_payment(
  _order_id uuid,
  _payment_method text,
  _amount numeric,
  _reference text DEFAULT NULL::text,
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
  _new_payment_id uuid;
  _expected numeric;
  _ref text := NULLIF(btrim(COALESCE(_reference, '')), '');
  _cmt text := NULLIF(btrim(COALESCE(_comment, '')), '');
  _proof text := NULLIF(btrim(COALESCE(_proof_url, '')), '');
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

  IF _proof IS NULL THEN
    RAISE EXCEPTION 'La preuve de paiement est obligatoire';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.payment_settings ps WHERE ps.method_key = _payment_method AND ps.is_active) THEN
    RAISE EXCEPTION 'Moyen de paiement invalide ou indisponible';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Le montant payé doit être supérieur à 0';
  END IF;

  _expected := COALESCE(NULLIF(o.final_total, 0), NULLIF(o.estimated_total, 0), o.total, 0);
  IF _expected > 0 AND _amount > _expected * 1.5 THEN
    RAISE EXCEPTION 'Le montant déclaré (%) dépasse largement le total de la commande (%)', _amount, _expected;
  END IF;

  IF _ref IS NOT NULL AND length(_ref) > 100 THEN
    RAISE EXCEPTION 'La référence de transaction ne doit pas dépasser 100 caractères';
  END IF;

  IF _cmt IS NOT NULL AND length(_cmt) > 500 THEN
    RAISE EXCEPTION 'Le commentaire ne doit pas dépasser 500 caractères';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.order_id = _order_id
      AND p.status IN ('pending','proof_uploaded')
  ) THEN
    RAISE EXCEPTION 'Un paiement est déjà en attente de vérification pour cette commande';
  END IF;

  INSERT INTO public.payments (order_id, user_id, payment_method, amount, currency, reference, proof_url, status)
  VALUES (_order_id, o.user_id, _payment_method, _amount, 'FCFA', _ref, _proof, 'proof_uploaded'::payment_status)
  RETURNING id INTO _new_payment_id;

  UPDATE public.orders
     SET order_status = 'PAIEMENT_EN_ATTENTE_VERIFICATION',
         payment_status = 'proof_uploaded',
         payment_method = _payment_method,
         payment_id = _new_payment_id,
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.order_history (order_id, status, comment, created_by)
  VALUES (_order_id, 'PAIEMENT_EN_ATTENTE_VERIFICATION',
          'Paiement déclaré par le client (' || _payment_method || ') - référence : ' || COALESCE(_ref, 'non renseignée')
          || COALESCE(' - ' || _cmt, ''),
          auth.uid());

  INSERT INTO public.notifications (user_id, order_id, title, message, type)
  VALUES (o.user_id, _order_id, 'Paiement déclaré',
          'Votre paiement a bien été enregistré. Notre équipe le vérifie dans les meilleurs délais.', 'payment');

  RETURN _new_payment_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.declare_payment(uuid, text, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.declare_payment(uuid, text, numeric, text, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.require_payment_proof_before_validation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('verified', 'paid')
     AND NULLIF(btrim(COALESCE(NEW.proof_url, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Impossible de valider un paiement sans preuve';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_require_payment_proof_before_validation ON public.payments;
CREATE TRIGGER trg_require_payment_proof_before_validation
BEFORE INSERT OR UPDATE OF status, proof_url ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.require_payment_proof_before_validation();