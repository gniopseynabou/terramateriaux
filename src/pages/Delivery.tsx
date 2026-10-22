import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Truck, Store, ArrowRight, MapPin, Sparkles, Route, Navigation, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useCart } from "@/contexts/CartContext";
import { formatFCFA } from "@/hooks/useProducts";
import { useDeliverySettings } from "@/hooks/useDeliveries";
import { DeliveryLocationPicker, type SelectedLocationData } from "@/components/delivery/DeliveryLocationPicker";
import { DEFAULT_TMI_DEPOT } from "@/lib/geo";

const Delivery = () => {
  const {
    subtotal,
    rawSubtotal,
    discountTotal,
    deliveryFee,
    deliveryMethod,
    setDeliveryMethod,
    total,
    setDeliveryFee,
    customer,
    setCustomer,
  } = useCart();
  const { data: deliverySettings } = useDeliverySettings();

  const freeDeliveryThreshold = deliverySettings?.free_delivery_min_amount ?? 50000;
  const isFreeDeliveryEligible = Boolean(
    deliverySettings?.free_delivery_enabled && subtotal >= freeDeliveryThreshold
  );

  const pricePerKm = deliverySettings?.price_per_km ?? 200;
  const depotName = deliverySettings?.departure_name || DEFAULT_TMI_DEPOT.name;
  const depotAddress = deliverySettings?.departure_address || DEFAULT_TMI_DEPOT.address;

  // Si retrait, frais = 0
  useEffect(() => {
    if (deliveryMethod === "retrait") {
      setDeliveryFee(0);
    } else if (isFreeDeliveryEligible) {
      setDeliveryFee(0);
    } else if (customer.estimatedDistanceKm && customer.estimatedDistanceKm > 0) {
      setDeliveryFee(Math.round(customer.estimatedDistanceKm * pricePerKm));
    }
  }, [deliveryMethod, isFreeDeliveryEligible, customer.estimatedDistanceKm, pricePerKm, setDeliveryFee]);

  // Réception de la position confirmée depuis la carte interactive
  const handleLocationConfirmed = (data: SelectedLocationData) => {
    setCustomer({
      ...customer,
      deliveryLat: data.lat,
      deliveryLng: data.lng,
      adresse: data.address || customer.adresse,
      region: data.region || customer.region || "Sénégal",
      ville: data.city || customer.ville || "Zone de livraison",
      commune: data.commune || customer.commune,
      quartier: data.quartier || customer.quartier,
      estimatedDistanceKm: data.distanceKm,
      estimatedDurationMinutes: data.durationMinutes,
      pricingMethod: data.pricingMethod,
      routeGeometry: data.routeGeometry,
    });

    setDeliveryFee(data.fee);
  };

  const isLocationReady = Boolean(
    deliveryMethod === "retrait" || (customer.deliveryLat && customer.estimatedDistanceKm && customer.estimatedDistanceKm > 0)
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-3xl">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-6">Mode de livraison</h1>

        {/* Bannière offre livraison gratuite */}
        {deliverySettings?.free_delivery_enabled && (
          <div
            className={`p-4 rounded-xl mb-6 border flex items-center gap-3 ${
              isFreeDeliveryEligible
                ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300"
                : "bg-accent/50 border-primary/20"
            }`}
          >
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              {isFreeDeliveryEligible ? (
                <p className="font-bold">
                  🎉 Félicitations ! Votre commande bénéficie de la <strong>Livraison Gratuite</strong> (montant ≥{" "}
                  {formatFCFA(freeDeliveryThreshold)}).
                </p>
              ) : (
                <p>
                  Offre Spéciale : <strong>Livraison Gratuite</strong> à partir de{" "}
                  {formatFCFA(freeDeliveryThreshold)} d'achats !{" "}
                  (Plus que {formatFCFA(freeDeliveryThreshold - subtotal)} pour en bénéficier).
                </p>
              )}
            </div>
          </div>
        )}

        {/* Choix de la méthode : Livraison vs Retrait */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setDeliveryMethod("livraison")}
            className={`p-5 rounded-xl border-2 text-left transition-all ${
              deliveryMethod === "livraison"
                ? "border-primary bg-accent/40 shadow-xs"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Truck className="h-7 w-7 text-primary mb-3" />
            <h3 className="font-heading font-semibold text-base">Livraison à domicile / chantier</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Calcul automatique au kilomètre ({formatFCFA(pricePerKm)}/km) via géolocalisation
            </p>
          </button>

          <button
            type="button"
            onClick={() => setDeliveryMethod("retrait")}
            className={`p-5 rounded-xl border-2 text-left transition-all ${
              deliveryMethod === "retrait"
                ? "border-primary bg-accent/40 shadow-xs"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Store className="h-7 w-7 text-secondary mb-3" />
            <h3 className="font-heading font-semibold text-base">Retrait en magasin</h3>
            <p className="text-xs text-muted-foreground mt-1">Gratuit — {depotName}</p>
          </button>
        </div>

        {/* Section Livraison par Géolocalisation */}
        {deliveryMethod === "livraison" && (
          <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Sélectionnez votre lieu sur la carte
              </h3>
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                <Navigation className="h-3 w-3" /> Tarif au km automatique
              </Badge>
            </div>

            {/* Carte interactive avec géolocalisation et tracé d'itinéraire */}
            <div className="bg-card border border-border rounded-xl p-4 md:p-5 space-y-4 shadow-xs">
              <div className="space-y-1">
                <p className="font-medium text-sm">Pointez l'emplacement exact de votre livraison</p>
                <p className="text-xs text-muted-foreground">
                  Le système mesure immédiatement la distance routière depuis notre magasin (
                  <strong>{depotName}</strong>) et calcule vos frais au kilomètre (<strong>{formatFCFA(pricePerKm)}/km</strong>). Aucun tarif par quartier n'est requis.
                </p>
              </div>

              <DeliveryLocationPicker
                initialLat={customer.deliveryLat}
                initialLng={customer.deliveryLng}
                subtotal={subtotal}
                pricingSettings={deliverySettings}
                onLocationConfirmed={handleLocationConfirmed}
              />
            </div>
          </div>
        )}

        {/* Section Retrait en magasin */}
        {deliveryMethod === "retrait" && (
          <div className="mb-8 bg-card border border-border rounded-xl p-5 space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <Store className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-heading font-semibold text-base">{depotName}</h4>
                <p className="text-sm text-muted-foreground mt-0.5">{depotAddress}</p>
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-2">
                  ✓ Frais de retrait : 0 FCFA (Gratuit)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Horaires d'ouverture : Du Lundi au Samedi de 08h00 à 18h30.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Récapitulatif et validation transparente */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-4 shadow-sm">
          <h4 className="font-heading font-semibold text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Récapitulatif de la commande
          </h4>

          {rawSubtotal !== subtotal && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Sous-total brut</span>
              <span>{formatFCFA(rawSubtotal)}</span>
            </div>
          )}
          {discountTotal > 0 && (
            <div className="flex justify-between text-sm text-destructive font-medium">
              <span>Réduction promotion</span>
              <span>-{formatFCFA(discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Montant des produits</span>
            <span className="font-medium">{formatFCFA(subtotal)}</span>
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

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frais de livraison</span>
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

          <div className="border-t border-border pt-3 flex justify-between font-heading font-bold text-lg">
            <span>Montant total à payer</span>
            <span className="text-primary">{formatFCFA(total)}</span>
          </div>

          <Link to="/commande" className="block pt-2">
            <Button
              className="w-full text-base h-12"
              size="lg"
              disabled={!isLocationReady}
            >
              Continuer vers la commande <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>

          {deliveryMethod === "livraison" && !isLocationReady && (
            <p className="text-xs text-destructive text-center font-medium">
              Veuillez sélectionner votre lieu de livraison sur la carte pour calculer la distance et les frais au kilomètre.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Delivery;
