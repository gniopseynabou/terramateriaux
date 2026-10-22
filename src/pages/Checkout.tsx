import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import {
  ArrowRight,
  Info,
  ShoppingBag,
  Tag,
  MapPin,
  CheckCircle2,
  Navigation,
  Route,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useCart } from "@/contexts/CartContext";
import { formatFCFA } from "@/hooks/useProducts";
import { useCreateOrder } from "@/hooks/useOrders";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { useActivePromotions } from "@/hooks/usePromotions";
import { useDeliverySettings } from "@/hooks/useDeliveries";
import { getBestPromotionForProduct } from "@/lib/promotions";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { DeliveryLocationPicker, type SelectedLocationData } from "@/components/delivery/DeliveryLocationPicker";

const SENEGAL_PHONE_REGEX = /^(?:\+221|00221)?\s*(7[05678]\s*\d{3}\s*\d{2}\s*\d{2}|7[05678]\d{7})$/;

const checkoutSchema = z.object({
  nom: z.string().trim().min(2, "Nom trop court").max(100),
  tel: z.string().trim().regex(SENEGAL_PHONE_REGEX, "Numéro de téléphone invalide (ex: 771234567 ou +221 771234567)"),
  email: z.union([z.string().trim().email("Email invalide").max(255), z.literal("")]),
  region: z.string().trim().max(100).optional(),
  ville: z.string().trim().max(100).optional(),
  commune: z.string().trim().max(100).optional(),
  quartier: z.string().trim().max(100).optional(),
  adresse: z.string().trim().min(2, "Adresse ou description du lieu requise").max(255),
  repere: z.string().trim().max(255).optional(),
  instructions: z.string().trim().max(1000).optional(),
  commentaire: z.string().trim().max(1000).optional(),
});

type StringCustomerKeys =
  | "nom"
  | "tel"
  | "email"
  | "region"
  | "ville"
  | "commune"
  | "quartier"
  | "adresse"
  | "repere"
  | "instructions"
  | "commentaire";

const Checkout = () => {
  const {
    items,
    rawSubtotal,
    discountTotal,
    subtotal,
    deliveryFee,
    total,
    deliveryMethod,
    customer,
    setCustomer,
    setDeliveryFee,
    clearCart,
  } = useCart();
  const { data: promotions = [] } = useActivePromotions();
  const { data: deliverySettings } = useDeliverySettings();
  const pricePerKm = deliverySettings?.price_per_km ?? 200;
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const { data: paymentMethods = [] } = usePaymentSettings();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(!customer.deliveryLat);

  const field = (key: StringCustomerKeys) => ({
    value: (customer[key] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCustomer({ ...customer, [key]: e.target.value }),
  });

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/40 mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Votre panier est vide</h1>
          <Link to="/catalogue">
            <Button>Parcourir le catalogue</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const options = [
    ...paymentMethods.map((m) => ({ key: m.method_key, label: m.label, hint: m.account_name ?? "" })),
    { key: "cash_on_delivery", label: "Paiement à la livraison", hint: "Réglez à la réception" },
  ];

  const handleLocationConfirmedOnCheckout = (data: SelectedLocationData) => {
    setCustomer({
      ...customer,
      deliveryLat: data.lat,
      deliveryLng: data.lng,
      adresse: data.address || customer.adresse,
      region: data.region || customer.region,
      ville: data.city || customer.ville,
      commune: data.commune || customer.commune,
      quartier: data.quartier || customer.quartier,
      estimatedDistanceKm: data.distanceKm,
      estimatedDurationMinutes: data.durationMinutes,
      pricingMethod: data.pricingMethod,
      routeGeometry: data.routeGeometry,
    });
    setDeliveryFee(data.fee);
    setIsMapExpanded(false);
    toast.success("Position et itinéraire de livraison confirmés !");
  };

  const handleSubmit = async () => {
    if (isSubmitting || createOrder.isPending) return;

    const parsed = checkoutSchema.safeParse(customer);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[String(i.path[0])] = i.message;
      });
      setErrors(fieldErrors);
      toast.error("Veuillez corriger les informations de livraison.");
      return;
    }

    if (deliveryMethod === "livraison" && (!customer.deliveryLat || !customer.estimatedDistanceKm || customer.estimatedDistanceKm <= 0)) {
      toast.error("Veuillez sélectionner votre lieu de livraison sur la carte pour calculer la distance et les frais au kilomètre.");
      setIsMapExpanded(true);
      return;
    }

    if (!paymentMethod) {
      toast.error("Choisissez un moyen de paiement.");
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const accessInstructions = [
      parsed.data.repere && `Point de repère : ${parsed.data.repere}`,
      parsed.data.instructions && `Instructions d'accès : ${parsed.data.instructions}`,
      parsed.data.commentaire,
    ]
      .filter(Boolean)
      .join(" - ");

    try {
      const order = await createOrder.mutateAsync({
        customer_name: parsed.data.nom,
        customer_phone: parsed.data.tel,
        customer_email: parsed.data.email || undefined,
        customer_comment: accessInstructions || undefined,
        delivery_method: deliveryMethod,
        delivery_address: parsed.data.adresse,
        delivery_region: parsed.data.region,
        delivery_city: parsed.data.ville,
        delivery_quarter: parsed.data.quartier,
        delivery_commune: parsed.data.commune || undefined,
        delivery_instructions: parsed.data.instructions || undefined,
        delivery_lat: customer.deliveryLat ?? null,
        delivery_lng: customer.deliveryLng ?? null,
        estimated_distance_km: customer.estimatedDistanceKm ?? null,
        estimated_duration_minutes: customer.estimatedDurationMinutes ?? null,
        pricing_method: customer.pricingMethod || "DISTANCE_ROAD",
        pricing_params: customer.pricingParams || undefined,
        route_geometry: customer.routeGeometry || undefined,
        delivery_fee: deliveryFee,
        subtotal,
        discount_total: discountTotal,
        total,
        payment_method: paymentMethod,
        items: items.map((item) => {
          const promo = !item.isGros ? getBestPromotionForProduct(item.product, promotions) : null;
          const origPrice = item.isGros ? item.product.price_gros : item.product.price_fcfa;
          const finalUnitPrice = item.isGros
            ? item.product.price_gros
            : promo
            ? promo.discountedPrice
            : item.product.price_fcfa;
          const itemDiscount = promo ? promo.discountAmount : 0;

          return {
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: finalUnitPrice,
            original_price: origPrice,
            discount_amount: itemDiscount * item.quantity,
            is_gros: item.isGros,
            subtotal: finalUnitPrice * item.quantity,
          };
        }),
      });

      clearCart();
      navigate(`/confirmation/${order.order_number}`);
    } catch (e) {
      toast.error("Enregistrement impossible", { description: getFriendlyErrorMessage(e) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-6">Finaliser ma commande</h1>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            {/* 1. SECTION LOCALISATION & COORDONNÉES DE LIVRAISON */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Localisation et adresse de livraison
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permet au livreur d'accéder directement à votre chantier ou domicile.
                  </p>
                </div>
                {deliveryMethod === "livraison" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                  >
                    <Navigation className="h-3.5 w-3.5 text-primary" />
                    <span>{isMapExpanded ? "Masquer la carte" : "Ouvrir la carte"}</span>
                    {isMapExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>

              {/* Statut GPS si coordonnées déjà définies */}
              {deliveryMethod === "livraison" && customer.deliveryLat && customer.deliveryLng && !isMapExpanded && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <div>
                      <span className="font-semibold text-foreground">Position GPS enregistrée : </span>
                      <span className="text-muted-foreground font-mono">
                        {customer.deliveryLat.toFixed(5)}, {customer.deliveryLng.toFixed(5)}
                      </span>
                      {customer.estimatedDistanceKm != null && (
                        <span className="ml-2 font-medium text-primary">
                          ({customer.estimatedDistanceKm} km • ~{customer.estimatedDurationMinutes} min)
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setIsMapExpanded(true)}
                  >
                    Modifier
                  </Button>
                </div>
              )}

              {/* Carte interactive dépliable */}
              {deliveryMethod === "livraison" && isMapExpanded && (
                <div className="border border-border/80 rounded-xl p-3 bg-muted/20 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Sélectionnez votre position sur la carte :
                  </p>
                  <DeliveryLocationPicker
                    initialLat={customer.deliveryLat}
                    initialLng={customer.deliveryLng}
                    subtotal={subtotal}
                    pricingSettings={deliverySettings}
                    onLocationConfirmed={handleLocationConfirmedOnCheckout}
                  />
                </div>
              )}

              {/* Formulaire des adresses */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nom">Nom complet *</Label>
                  <Input id="nom" maxLength={100} {...field("nom")} />
                  {err("nom")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tel">Téléphone (joignable lors de la livraison) *</Label>
                  <Input id="tel" maxLength={30} placeholder="77 123 45 67" {...field("tel")} />
                  {err("tel")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <Input id="email" type="email" maxLength={255} {...field("email")} />
                  {err("email")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region">Région *</Label>
                  <Input id="region" maxLength={100} placeholder="ex: Kédougou ou Dakar" {...field("region")} />
                  {err("region")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input id="ville" maxLength={100} placeholder="ex: Kédougou" {...field("ville")} />
                  {err("ville")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="commune">Commune (optionnelle)</Label>
                  <Input id="commune" maxLength={100} placeholder="ex: Commune de Kédougou" {...field("commune")} />
                  {err("commune")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quartier">Quartier *</Label>
                  <Input id="quartier" maxLength={100} placeholder="ex: Dandé Mayo, Lawol Tamba" {...field("quartier")} />
                  {err("quartier")}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="adresse">Adresse ou description du lieu *</Label>
                  <Input id="adresse" maxLength={255} placeholder="ex: Route nationale, près du stade" {...field("adresse")} />
                  {err("adresse")}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="repere">Point de repère visuel (bâtiment, pharmacie, boutique)</Label>
                  <Input id="repere" maxLength={255} placeholder="ex: En face de la station Total, portail bleu" {...field("repere")} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="instructions">Instructions d'accès pour le livreur (optionnel)</Label>
                  <Textarea
                    id="instructions"
                    rows={2}
                    maxLength={1000}
                    placeholder="ex: Chantier accessible par camionnette, appeler 15 min avant votre arrivée..."
                    {...field("instructions")}
                  />
                </div>
              </div>
            </section>

            {/* 2. SECTION MOYEN DE PAIEMENT */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
              <h2 className="font-heading font-semibold text-lg">Moyen de paiement</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid sm:grid-cols-2 gap-3">
                {options.map((o) => (
                  <label
                    key={o.key}
                    htmlFor={`pm-${o.key}`}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      paymentMethod === o.key ? "border-primary bg-accent/40 shadow-xs" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem id={`pm-${o.key}`} value={o.key} className="mt-1" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{o.label}</span>
                      {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                    </span>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Les instructions complètes de paiement s'afficheront immédiatement après confirmation de votre commande.
              </p>
            </section>
          </div>

          {/* RÉCAPITULATIF COMMANDE */}
          <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
            <section className="bg-card border border-border rounded-xl p-5 space-y-3.5 shadow-sm">
              <h2 className="font-heading font-semibold text-lg">Récapitulatif de commande</h2>
              <ul className="space-y-2 text-sm divide-y divide-border/50">
                {items.map((i) => {
                  const promo = !i.isGros ? getBestPromotionForProduct(i.product, promotions) : null;
                  const unit = i.isGros ? i.product.price_gros : promo ? promo.discountedPrice : i.product.price_fcfa;
                  return (
                    <li key={i.product.id} className="flex justify-between gap-3 pt-2 first:pt-0">
                      <span className="min-w-0">
                        <span className="font-medium text-foreground">{i.product.name}</span> × {i.quantity}
                        <span className="block text-xs text-muted-foreground">{formatFCFA(unit)} / unité</span>
                      </span>
                      <span className="whitespace-nowrap font-medium">{formatFCFA(unit * i.quantity)}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total brut</span>
                  <span>{formatFCFA(rawSubtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-destructive font-medium">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> Réduction promotion
                    </span>
                    <span>-{formatFCFA(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Montant des produits</span>
                  <span>{formatFCFA(subtotal)}</span>
                </div>

                {deliveryMethod === "livraison" && customer.estimatedDistanceKm != null && customer.estimatedDistanceKm > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Route className="h-3.5 w-3.5 text-primary" /> Distance routière estimée
                      </span>
                      <span className="font-semibold text-foreground">{customer.estimatedDistanceKm} km</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Prix du kilomètre</span>
                      <span className="font-semibold text-foreground">{formatFCFA(pricePerKm)} / km</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <span>Frais de livraison calculés</span>
                  <span className={deliveryFee === 0 ? "text-green-600 dark:text-green-400 font-bold" : "font-semibold text-primary"}>
                    {deliveryMethod === "retrait"
                      ? "0 FCFA (Retrait magasin)"
                      : deliveryFee === 0
                      ? "Gratuit (Offre T.M.I.)"
                      : customer.estimatedDistanceKm
                      ? `${formatFCFA(deliveryFee)} (${customer.estimatedDistanceKm} km × ${formatFCFA(pricePerKm)})`
                      : formatFCFA(deliveryFee)}
                  </span>
                </div>

                <div className="flex justify-between font-heading font-bold text-lg pt-2 border-t border-border">
                  <span>Montant total à payer</span>
                  <span className="text-primary">{formatFCFA(total)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs bg-accent/60 rounded-lg p-3 text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <p>
                  Les frais de livraison sont calculés selon le barème kilométrique officiel T.M.I. et confirmés par notre
                  service logistique.
                </p>
              </div>

              <Button
                className="w-full text-base h-12"
                size="lg"
                disabled={createOrder.isPending || isSubmitting}
                onClick={handleSubmit}
              >
                {createOrder.isPending || isSubmitting ? "Enregistrement en cours..." : "Confirmer ma commande"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </section>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
