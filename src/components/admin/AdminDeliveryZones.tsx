import { useState, useEffect } from "react";
import {
  MapPin,
  Sparkles,
  Save,
  Building2,
  Calculator,
  Navigation,
  Info,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliverySettings, useUpdateDeliverySettings } from "@/hooks/useDeliveries";
import { formatFCFA } from "@/hooks/useProducts";
import { DEFAULT_TMI_DEPOT } from "@/lib/geo";

const AdminDeliveryZones = () => {
  const { data: settings, isLoading } = useDeliverySettings();
  const updateSettings = useUpdateDeliverySettings();

  // 1. Formulaire Localisation du Magasin T.M.I.
  const [depotForm, setDepotForm] = useState({
    name: settings?.departure_name || DEFAULT_TMI_DEPOT.name,
    address: settings?.departure_address || DEFAULT_TMI_DEPOT.address,
    lat: settings?.departure_lat ?? DEFAULT_TMI_DEPOT.lat,
    lng: settings?.departure_lng ?? DEFAULT_TMI_DEPOT.lng,
  });

  // 2. Formulaire Prix unique au kilomètre
  const [pricePerKm, setPricePerKm] = useState<number>(settings?.price_per_km ?? 200);

  // 3. Optionnel : Livraison Gratuite
  const [freeDeliveryForm, setFreeDeliveryForm] = useState({
    enabled: settings?.free_delivery_enabled ?? false,
    minAmount: settings?.free_delivery_min_amount ?? 50000,
  });

  useEffect(() => {
    if (settings) {
      setDepotForm({
        name: settings.departure_name || DEFAULT_TMI_DEPOT.name,
        address: settings.departure_address || DEFAULT_TMI_DEPOT.address,
        lat: settings.departure_lat ?? DEFAULT_TMI_DEPOT.lat,
        lng: settings.departure_lng ?? DEFAULT_TMI_DEPOT.lng,
      });
      setPricePerKm(settings.price_per_km ?? 200);
      setFreeDeliveryForm({
        enabled: settings.free_delivery_enabled ?? false,
        minAmount: settings.free_delivery_min_amount ?? 50000,
      });
    }
  }, [settings]);

  const handleSaveAll = async () => {
    if (!depotForm.name.trim() || !depotForm.address.trim()) {
      toast.error("Veuillez renseigner le nom et l'adresse du magasin T.M.I.");
      return;
    }

    if (!depotForm.lat || !depotForm.lng) {
      toast.error("Veuillez renseigner les coordonnées GPS du magasin.");
      return;
    }

    if (pricePerKm < 0) {
      toast.error("Le prix par kilomètre ne peut pas être négatif.");
      return;
    }

    try {
      await updateSettings.mutateAsync({
        departure_name: depotForm.name.trim(),
        departure_address: depotForm.address.trim(),
        departure_lat: Number(depotForm.lat),
        departure_lng: Number(depotForm.lng),
        price_per_km: Number(pricePerKm),
        base_fee: 0,
        min_fee: 0,
        free_delivery_enabled: freeDeliveryForm.enabled,
        free_delivery_min_amount: Number(freeDeliveryForm.minAmount) || 0,
      });
      toast.success("Configuration logistique enregistrée avec succès.");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement", { description: (e as Error).message });
    }
  };

  const handleDetectDepotGPS = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée sur ce navigateur.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDepotForm({
          ...depotForm,
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        });
        toast.success("Coordonnées GPS actuelles du magasin détectées.");
      },
      () => {
        toast.error("Impossible d'obtenir la position GPS.");
      },
      { enableHighAccuracy: true }
    );
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-lg" />;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Alerte explicative : système automatique activé */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-sm text-foreground">
            Système de tarification automatique au kilomètre activé
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Vous n'avez plus besoin de configurer manuellement des tarifs par commune, quartier ou zone.
            Chaque commande est géolocalisée sur carte par le client et les frais de livraison sont calculés
            automatiquement en multipliant la distance routière réelle par votre tarif au kilomètre.
          </p>
        </div>
      </div>

      {/* 1. LOCALISATION DU MAGASIN T.M.I. */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-heading font-bold text-base">Localisation du magasin T.M.I.</h2>
              <p className="text-xs text-muted-foreground">Point de départ officiel de toutes les livraisons</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 self-start sm:self-auto"
            onClick={handleDetectDepotGPS}
          >
            <Navigation className="h-3.5 w-3.5 text-primary" />
            <span>Détecter la position GPS actuelle</span>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs">Nom de l'établissement *</Label>
            <Input
              value={depotForm.name}
              onChange={(e) => setDepotForm({ ...depotForm, name: e.target.value })}
              placeholder="Ex: Siège & Dépôt Central T.M.I."
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Adresse textuelle complète *</Label>
            <Input
              value={depotForm.address}
              onChange={(e) => setDepotForm({ ...depotForm, address: e.target.value })}
              placeholder="Ex: Quartier Dandé Mayo, Kédougou, Sénégal"
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Latitude GPS *</Label>
            <Input
              type="number"
              step="0.000001"
              value={depotForm.lat}
              onChange={(e) => setDepotForm({ ...depotForm, lat: parseFloat(e.target.value) || 0 })}
              className="text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Longitude GPS *</Label>
            <Input
              type="number"
              step="0.000001"
              value={depotForm.lng}
              onChange={(e) => setDepotForm({ ...depotForm, lng: parseFloat(e.target.value) || 0 })}
              className="text-sm font-mono"
            />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Ces coordonnées GPS servent de point d'origine pour tracer les itinéraires routiers et mesurer la distance kilométrique exacte jusqu'à chaque client.
        </p>
      </div>

      {/* 2. PRIX DU KILOMÈTRE UNIQUE */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Calculator className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-heading font-bold text-base">Prix de livraison par kilomètre</h2>
            <p className="text-xs text-muted-foreground">Paramètre tarifaire unique appliqué à toute la logistique</p>
          </div>
        </div>

        <div className="max-w-md space-y-2">
          <Label className="text-xs font-semibold">Prix du kilomètre (FCFA / km) *</Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              step={10}
              value={pricePerKm}
              onChange={(e) => setPricePerKm(Number(e.target.value) || 0)}
              className="text-lg font-bold text-primary max-w-[200px]"
            />
            <span className="text-sm font-medium text-muted-foreground">FCFA / km</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Multiplié par la distance routière réelle calculée par géolocalisation.
          </p>
        </div>

        {/* Aperçu en temps réel de la formule */}
        <div className="bg-muted/30 border border-border/80 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Info className="h-4 w-4" />
            <span>Formule appliquée : <strong>Frais de livraison = distance routière (km) × {formatFCFA(pricePerKm)}/km</strong></span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-muted-foreground text-center">
            <div className="bg-card p-2 rounded-lg border border-border">
              <span className="block text-[11px]">Pour 5 km</span>
              <strong className="text-foreground text-xs">{formatFCFA(Math.round(5 * pricePerKm))}</strong>
            </div>
            <div className="bg-card p-2 rounded-lg border border-border">
              <span className="block text-[11px]">Pour 12 km</span>
              <strong className="text-foreground text-xs">{formatFCFA(Math.round(12 * pricePerKm))}</strong>
            </div>
            <div className="bg-card p-2 rounded-lg border border-border">
              <span className="block text-[11px]">Pour 25 km</span>
              <strong className="text-foreground text-xs">{formatFCFA(Math.round(25 * pricePerKm))}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. OPTIONNEL : LIVRAISON GRATUITE */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-heading font-bold text-base">Livraison gratuite (Optionnelle)</h2>
            <p className="text-xs text-muted-foreground">Offrir la livraison à partir d'un certain montant d'achats</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <div className="flex items-center gap-3">
            <Switch
              id="free-shipping-toggle"
              checked={freeDeliveryForm.enabled}
              onCheckedChange={(checked) => setFreeDeliveryForm({ ...freeDeliveryForm, enabled: checked })}
            />
            <Label htmlFor="free-shipping-toggle" className="font-medium cursor-pointer text-xs">
              Activer la gratuité au-delà d'un montant d'achats
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="min-free-amount" className="text-xs">
              Montant minimum de commande (FCFA)
            </Label>
            <Input
              id="min-free-amount"
              type="number"
              min={0}
              step={5000}
              value={freeDeliveryForm.minAmount}
              onChange={(e) => setFreeDeliveryForm({ ...freeDeliveryForm, minAmount: Number(e.target.value) || 0 })}
              disabled={!freeDeliveryForm.enabled}
              className="text-sm font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Bouton de sauvegarde global */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSaveAll}
          disabled={updateSettings.isPending}
          size="lg"
          className="gap-2 text-sm font-semibold h-11"
        >
          <Save className="h-4 w-4" />
          {updateSettings.isPending ? "Enregistrement..." : "Enregistrer la configuration"}
        </Button>
      </div>
    </div>
  );
};

export default AdminDeliveryZones;
