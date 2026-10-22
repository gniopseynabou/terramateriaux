import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  MapPin,
  Phone,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
  AlertCircle,
  LogOut,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  User,
  Radio,
  MessageCircle,
  ShieldAlert,
  Route,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  useDriverDeliveries,
  useUpdateDeliveryStatusSimple,
  useDriverUpdateLiveLocation,
  useDeliverySettings,
  type DeliveryWithDetails,
} from "@/hooks/useDeliveries";
import { formatFCFA } from "@/hooks/useProducts";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { DeliveryRouteViewer } from "@/components/delivery/DeliveryRouteViewer";
import { DEFAULT_TMI_DEPOT, getGoogleMapsNavigationUrl, getWazeNavigationUrl, getWhatsAppContactUrl } from "@/lib/geo";

const DELIVERY_STATUS = [
  { value: "AFFECTEE", label: "Affectée à préparer", icon: CheckCircle2, color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/30" },
  { value: "EN_COURS", label: "En cours d'acheminement", icon: Navigation, color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30" },
  { value: "LIVREE", label: "Livrée ✓", icon: CheckCircle2, color: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-400/30" },
  { value: "CLIENT_ABSENT", label: "Client absent", icon: AlertCircle, color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/30" },
  { value: "ADRESSE_INCORRECTE", label: "Adresse introuvable", icon: MapPin, color: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-400/30" },
  { value: "ECHEC", label: "Échec de livraison", icon: XCircle, color: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "REPORTEE", label: "Livraison reportée", icon: Clock, color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/30" },
];

const getStatusConfig = (status: string) =>
  DELIVERY_STATUS.find((s) => s.value === status) || DELIVERY_STATUS[0];

const NEXT_STATUS_OPTIONS: Record<string, string[]> = {
  AFFECTEE: ["EN_COURS"],
  EN_COURS: ["LIVREE", "CLIENT_ABSENT", "ADRESSE_INCORRECTE", "REPORTEE", "ECHEC"],
  CLIENT_ABSENT: ["EN_COURS", "REPORTEE"],
  ADRESSE_INCORRECTE: ["EN_COURS", "REPORTEE"],
  REPORTEE: ["EN_COURS"],
  ECHEC: ["REPORTEE"],
  LIVREE: [],
};

const DriverDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: deliveries = [], isLoading, refetch } = useDriverDeliveries();
  const { data: deliverySettings } = useDeliverySettings();
  const updateStatus = useUpdateDeliveryStatusSimple();
  const updateLiveLocation = useDriverUpdateLiveLocation();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; delivery: DeliveryWithDetails | null }>({
    open: false,
    delivery: null,
  });
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");

  // Suivi GPS en direct (consentement du livreur requis)
  const [isLiveGpsActive, setIsLiveGpsActive] = useState(false);
  const [currentDeliveryTracking, setCurrentDeliveryTracking] = useState<string | null>(null);
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const gpsWatchIdRef = useRef<number | null>(null);

  const depotCoords = {
    lat: deliverySettings?.departure_lat ?? DEFAULT_TMI_DEPOT.lat,
    lng: deliverySettings?.departure_lng ?? DEFAULT_TMI_DEPOT.lng,
  };
  const depotName = deliverySettings?.departure_name || DEFAULT_TMI_DEPOT.name;

  const handleSignOut = async () => {
    stopLiveGps();
    await signOut();
    navigate("/auth");
  };

  const stopLiveGps = () => {
    if (gpsWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }
    setIsLiveGpsActive(false);
    setCurrentDeliveryTracking(null);
  };

  const startLiveGps = (deliveryId: string) => {
    if (!navigator.geolocation) {
      toast.error("Votre navigateur ne supporte pas la géolocalisation GPS.");
      return;
    }

    if (
      !confirm(
        "Autorisez-vous l'envoi de votre position GPS en temps réel à l'équipe logistique pendant le trajet ?"
      )
    ) {
      return;
    }

    setIsLiveGpsActive(true);
    setCurrentDeliveryTracking(deliveryId);

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setDriverCoords(coords);

        updateLiveLocation.mutate({
          delivery_id: deliveryId,
          lat: coords.lat,
          lng: coords.lng,
        });
      },
      (err) => {
        console.warn("Erreur GPS suivi live", err);
        toast.warning("Signal GPS faible ou indisponible.");
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    toast.success("Suivi GPS actif pour cette livraison.");
  };

  useEffect(() => {
    return () => {
      stopLiveGps();
    };
  }, []);

  const openStatusDialog = (delivery: DeliveryWithDetails) => {
    const options = NEXT_STATUS_OPTIONS[delivery.status] || [];
    if (options.length === 0) {
      toast.info("Le statut de cette livraison est finalisé.");
      return;
    }
    setNewStatus(options[0]);
    setNotes("");
    setStatusDialog({ open: true, delivery });
  };

  const handleUpdateStatus = async () => {
    if (!statusDialog.delivery || !newStatus) return;
    try {
      await updateStatus.mutateAsync({
        deliveryId: statusDialog.delivery.id,
        status: newStatus as DeliveryWithDetails["status"],
        notes: notes.trim() || undefined,
      });

      // Si la livraison est finalisée, arrêter le suivi GPS
      if (["LIVREE", "ECHEC", "CLIENT_ABSENT", "REPORTEE"].includes(newStatus)) {
        if (currentDeliveryTracking === statusDialog.delivery.id) {
          stopLiveGps();
        }
      }

      toast.success(`Statut mis à jour : ${getStatusConfig(newStatus).label}`);
      setStatusDialog({ open: false, delivery: null });
    } catch (e) {
      toast.error("Mise à jour impossible", { description: getFriendlyErrorMessage(e) });
    }
  };

  const stats = {
    total: deliveries.length,
    en_transit: deliveries.filter((d) => d.status === "EN_COURS").length,
    livrees: deliveries.filter((d) => d.status === "LIVREE").length,
    en_attente: deliveries.filter((d) => d.status === "AFFECTEE").length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4 max-w-lg mx-auto">
        <Skeleton className="h-20 w-full rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* En-tête mobile */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xs border-b border-border shadow-xs">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm leading-tight">Espace Livreur T.M.I.</p>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()} title="Actualiser">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Grille des statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "En cours", value: stats.en_transit, color: "text-amber-600 dark:text-amber-400" },
            { label: "Livrées", value: stats.livrees, color: "text-green-600 dark:text-green-400" },
            { label: "À faire", value: stats.en_attente, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center shadow-2xs">
              <p className={`font-heading font-bold text-xl ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Indicateur de suivi GPS actif */}
        {isLiveGpsActive && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-blue-800 dark:text-blue-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-blue-600 animate-pulse shrink-0" />
              <span>Suivi GPS en direct activé pour votre livraison en cours.</span>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs border-blue-500/30" onClick={stopLiveGps}>
              Arrêter
            </Button>
          </div>
        )}

        {/* Liste des livraisons assignées */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-base">Mes courses à livrer ({deliveries.length})</h2>
            <Badge variant="outline" className="text-xs">
              Triées par urgence
            </Badge>
          </div>

          {deliveries.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center space-y-2">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="font-medium text-foreground text-sm">Aucune livraison assignée pour l'instant.</p>
              <p className="text-xs text-muted-foreground">
                Dès qu'une commande vous est affectée par l'administrateur, elle apparaîtra directement ici.
              </p>
            </div>
          ) : (
            deliveries.map((delivery) => {
              const statusCfg = getStatusConfig(delivery.status);
              const StatusIcon = statusCfg.icon;
              const isExpanded = expanded === delivery.id;
              const nextOptions = NEXT_STATUS_OPTIONS[delivery.status] || [];
              const canUpdate = nextOptions.length > 0;
              const order = delivery.orders;

              const hasCoords = order?.delivery_lat != null && order?.delivery_lng != null;
              const destinationCoords = hasCoords
                ? { lat: order.delivery_lat!, lng: order.delivery_lng! }
                : null;

              const googleMapsUrl = destinationCoords
                ? getGoogleMapsNavigationUrl(destinationCoords.lat, destinationCoords.lng, depotCoords.lat, depotCoords.lng)
                : null;

              const wazeUrl = destinationCoords
                ? getWazeNavigationUrl(destinationCoords.lat, destinationCoords.lng)
                : null;

              return (
                <div
                  key={delivery.id}
                  className="bg-card border border-border rounded-xl shadow-xs overflow-hidden transition-all"
                >
                  {/* Entête de carte rétractable */}
                  <button
                    type="button"
                    className="w-full p-4 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : delivery.id)}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border ${statusCfg.color}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-bold text-sm">
                          {order?.order_number || delivery.id.slice(0, 8)}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-0.5 truncate">
                        {order?.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        📍 {order?.delivery_quarter || order?.delivery_city || "Zone de livraison"}
                        {order?.estimated_distance_km ? ` • ${order.estimated_distance_km} km` : ""}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    )}
                  </button>

                  {/* Détails étendus */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      {/* Carte Leaflet et Itinéraire si géolocalisé */}
                      {destinationCoords ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Route className="h-3.5 w-3.5 text-primary" />
                            Itinéraire et Guidage GPS
                          </p>
                          <DeliveryRouteViewer
                            destination={destinationCoords}
                            customerName={order?.customer_name}
                            customerPhone={order?.customer_phone}
                            deliveryAddress={order?.delivery_address || undefined}
                            deliveryCommune={order?.delivery_commune || undefined}
                            deliveryQuarter={order?.delivery_quarter || undefined}
                            deliveryInstructions={order?.delivery_instructions || order?.customer_comment || undefined}
                            depotCoords={depotCoords}
                            depotName={depotName}
                            driverLiveCoords={currentDeliveryTracking === delivery.id ? driverCoords : null}
                            height="240px"
                            showNavigationActions={true}
                          />
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
                          <p className="font-semibold mb-0.5">Localisation textuelle :</p>
                          <p>{order?.delivery_address || "Adresse non renseignée"}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Cette commande n'a pas de coordonnées GPS précises enregistrées.
                          </p>
                        </div>
                      )}

                      {/* Coordonnées Client & Contact direct */}
                      <div className="bg-muted/30 rounded-xl p-3.5 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-primary" /> {order?.customer_name}
                          </span>
                          {order?.customer_phone && (
                            <div className="flex items-center gap-2">
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1 border-primary/30">
                                <a href={`tel:${order.customer_phone}`}>
                                  <Phone className="h-3 w-3" /> Appeler
                                </a>
                              </Button>
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-500/30 text-green-700 dark:text-green-300">
                                <a href={getWhatsAppContactUrl(order.customer_phone)} target="_blank" rel="noopener noreferrer">
                                  <MessageCircle className="h-3 w-3 text-green-600" /> WhatsApp
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>

                        {order?.customer_comment && (
                          <div className="bg-card rounded-md p-2 border border-border">
                            <p className="font-semibold text-muted-foreground text-[11px]">Instructions client :</p>
                            <p className="text-foreground mt-0.5">{order.customer_comment}</p>
                          </div>
                        )}
                      </div>

                      {/* Détail financier */}
                      {order && (
                        <div className="bg-muted/40 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Total à encaisser :</span>
                          <span className="font-heading font-bold text-sm text-primary">
                            {formatFCFA(order.final_total ?? order.estimated_total ?? order.total)}
                          </span>
                        </div>
                      )}

                      {/* Bouton de bascule GPS en temps réel */}
                      {delivery.status === "EN_COURS" && (
                        <div className="pt-1">
                          {currentDeliveryTracking === delivery.id ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full text-xs gap-2 border-red-500/30 text-destructive hover:bg-destructive/10"
                              onClick={stopLiveGps}
                            >
                              <Radio className="h-3.5 w-3.5 animate-pulse" />
                              Arrêter mon partage GPS
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full text-xs gap-2 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10"
                              onClick={() => startLiveGps(delivery.id)}
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              Activer mon partage GPS en direct (Livreur en route)
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Actions de mise à jour de statut */}
                      {canUpdate && (
                        <Button
                          className="w-full gap-2 text-sm font-semibold"
                          onClick={() => openStatusDialog(delivery)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Mettre à jour l'état de la livraison
                        </Button>
                      )}

                      {!canUpdate && (
                        <div className="text-center text-xs text-muted-foreground py-1.5 bg-muted/20 rounded-md">
                          ✓ Livraison finalisée.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dialogue de mise à jour de statut */}
      <Dialog open={statusDialog.open} onOpenChange={(o) => !o && setStatusDialog({ open: false, delivery: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Mettre à jour le statut de livraison
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {statusDialog.delivery && (
              <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-foreground">
                  Commande : {statusDialog.delivery.orders?.order_number}
                </p>
                <p className="text-muted-foreground">Client : {statusDialog.delivery.orders?.customer_name}</p>
                <p className="text-muted-foreground">
                  Adresse : {statusDialog.delivery.orders?.delivery_address}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Nouveau statut *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(NEXT_STATUS_OPTIONS[statusDialog.delivery?.status || "AFFECTEE"] || []).map((s) => {
                    const cfg = getStatusConfig(s);
                    return (
                      <SelectItem key={s} value={s}>
                        {cfg.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="update-notes" className="text-xs">
                Observation ou motif (obligatoire en cas de problème ou report)
              </Label>
              <Textarea
                id="update-notes"
                rows={3}
                placeholder="Ex: Livrée en main propre au client. Ou: Client injoignable après 3 appels, reporté à demain matin."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStatusDialog({ open: false, delivery: null })}>
              Annuler
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Mise à jour..." : "Confirmer le statut"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDashboard;
