import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Truck, Store, ArrowRight, MapPin, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useCart } from "@/contexts/CartContext";
import { formatFCFA } from "@/hooks/useProducts";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useDeliverySettings } from "@/hooks/useDeliveries";

const Delivery = () => {
  const {
    subtotal, rawSubtotal, discountTotal, deliveryFee, deliveryMethod, setDeliveryMethod,
    total, setDeliveryFee, customer, setCustomer,
  } = useCart();
  const { data: zones = [] } = useDeliveryZones();
  const { data: deliverySettings } = useDeliverySettings();

  const [selectedRegion, setSelectedRegion] = useState(customer.region || "");
  const [selectedCity, setSelectedCity] = useState(customer.ville || "");

  const freeDeliveryThreshold = deliverySettings?.free_delivery_min_amount ?? 50000;
  const isFreeDeliveryEligible = Boolean(
    deliverySettings?.free_delivery_enabled && subtotal >= freeDeliveryThreshold
  );

  const regions = useMemo(() => {
    const unique = [...new Set(zones.map((z) => z.region))];
    return unique.sort();
  }, [zones]);

  const cities = useMemo(() => {
    return zones.filter((z) => z.region === selectedRegion);
  }, [zones, selectedRegion]);

  useEffect(() => {
    if (deliveryMethod === "retrait") {
      setDeliveryFee(0);
      return;
    }
    if (isFreeDeliveryEligible) {
      setDeliveryFee(0);
      return;
    }
    const zone = zones.find((z) => z.region === selectedRegion && z.city === selectedCity);
    setDeliveryFee(zone?.fee ?? 0);
  }, [selectedRegion, selectedCity, deliveryMethod, zones, isFreeDeliveryEligible]);

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setSelectedCity("");
    setCustomer({ ...customer, region, ville: "" });
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setCustomer({ ...customer, ville: city });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-6">Mode de livraison</h1>

        {/* Free delivery banner */}
        {deliverySettings?.free_delivery_enabled && (
          <div className={`p-4 rounded-lg mb-6 border flex items-center gap-3 ${
            isFreeDeliveryEligible
              ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300"
              : "bg-accent/50 border-primary/20"
          }`}>
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              {isFreeDeliveryEligible ? (
                <p className="font-bold">
                  🎉 Félicitations ! Votre commande est éligible à la <strong>Livraison Gratuite</strong> (montant ≥ {formatFCFA(freeDeliveryThreshold)}).
                </p>
              ) : (
                <p>
                  Offre Spéciale : <strong>Livraison Gratuite</strong> à partir de {formatFCFA(freeDeliveryThreshold)} d'achats !
                  {" "}(Encore {formatFCFA(freeDeliveryThreshold - subtotal)} pour en bénéficier).
                </p>
              )}
            </div>
          </div>
        )}

        {/* Method selection */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setDeliveryMethod("livraison")}
            className={`p-6 rounded-lg border-2 text-left transition-all ${
              deliveryMethod === "livraison" ? "border-primary bg-accent" : "border-border hover:border-primary/50"
            }`}
          >
            <Truck className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-heading font-semibold">Livraison à domicile / chantier</h3>
            <p className="text-sm text-muted-foreground mt-1">Tarifs fixés par zone géographique</p>
          </button>
          <button
            onClick={() => setDeliveryMethod("retrait")}
            className={`p-6 rounded-lg border-2 text-left transition-all ${
              deliveryMethod === "retrait" ? "border-primary bg-accent" : "border-border hover:border-primary/50"
            }`}
          >
            <Store className="h-8 w-8 text-secondary mb-3" />
            <h3 className="font-heading font-semibold">Retrait en magasin</h3>
            <p className="text-sm text-muted-foreground mt-1">Gratuit - Kédougou Centre</p>
          </button>
        </div>

        {deliveryMethod === "livraison" && (
          <div className="space-y-5 mb-8">
            <h3 className="font-heading font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Destination de livraison
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Région</Label>
                <Select value={selectedRegion} onValueChange={handleRegionChange}>
                  <SelectTrigger><SelectValue placeholder="Choisir une région" /></SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ville / Zone</Label>
                <Select value={selectedCity} onValueChange={handleCityChange} disabled={!selectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedRegion ? "Choisir une ville" : "Choisissez d'abord une région"} />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.city}>
                        {c.city} - {isFreeDeliveryEligible ? "Gratuit" : formatFCFA(c.fee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCity && (
              <div className="bg-accent/50 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                <Truck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Livraison vers {selectedCity} ({selectedRegion})</p>
                  <p className="text-primary font-heading font-bold text-lg">
                    {isFreeDeliveryEligible ? "Gratuit (Offre promotionnelle)" : formatFCFA(deliveryFee)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Les frais de livraison sont calculés automatiquement selon la zone et confirmés avant paiement.</p>
            </div>
          </div>
        )}

        {deliveryMethod === "retrait" && (
          <div className="mb-8 bg-accent/50 border border-primary/20 rounded-lg p-4">
            <p className="text-sm font-medium">📍 Retrait à notre magasin - Kédougou Centre</p>
            <p className="text-xs text-muted-foreground mt-1">Frais de livraison : <strong className="text-foreground">0 FCFA</strong></p>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-card p-6 rounded-lg border border-border space-y-3">
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
            <span className="text-muted-foreground">Sous-total produits</span>
            <span>{formatFCFA(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frais de livraison</span>
            <span className={deliveryFee === 0 ? "text-green-600 font-medium" : ""}>
              {deliveryFee === 0 ? "Gratuit" : formatFCFA(deliveryFee)}
            </span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between font-heading font-bold text-lg">
            <span>Total</span>
            <span className="text-primary">{formatFCFA(total)}</span>
          </div>
          <Link to="/commande" className="block">
            <Button className="w-full" size="lg" disabled={deliveryMethod === "livraison" && !selectedCity}>
              Continuer <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default Delivery;
