import { useState } from "react";
import {
  Truck,
  UserCheck,
  PackageCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  FileText,
  History,
  ExternalLink,
  RefreshCw,
  XCircle,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Map as MapIcon,
  List,
  Edit,
  Route,
  ShieldCheck,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useDeliveries,
  useAssignDriver,
  useUpdateDeliveryStatus,
  useDeliveryHistory,
  useAdminUpdateOrderDelivery,
  useDeliverySettings,
  type DeliveryWithDetails,
} from "@/hooks/useDeliveries";
import { useActiveDrivers } from "@/hooks/useDrivers";
import { formatFCFA } from "@/hooks/useProducts";
import { AdminDeliveriesMap } from "@/components/delivery/AdminDeliveriesMap";
import { DeliveryRouteViewer } from "@/components/delivery/DeliveryRouteViewer";
import { DEFAULT_TMI_DEPOT } from "@/lib/geo";

const DELIVERY_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  A_PREPARER: { label: "À préparer", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  PRETE: { label: "Prête à expédier", badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" },
  AFFECTEE: { label: "Livreur affecté", badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  EN_COURS: { label: "En cours de livraison", badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30" },
  LIVREE: { label: "Livrée", badge: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30" },
  ANNULEE: { label: "Livraison annulée", badge: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-500/30" },
  ECHEC: { label: "Échec de livraison", badge: "bg-destructive/15 text-destructive border-destructive/30" },
  CLIENT_ABSENT: { label: "Client absent", badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30" },
  ADRESSE_INCORRECTE: { label: "Adresse incorrecte", badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30" },
  REPORTEE: { label: "Livraison reportée", badge: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" },
};

const AdminDeliveries = () => {
  const { data: deliveries = [], isLoading } = useDeliveries();
  const { data: activeDrivers = [] } = useActiveDrivers();
  const { data: deliverySettings } = useDeliverySettings();
  const assignDriver = useAssignDriver();
  const updateStatus = useUpdateDeliveryStatus();
  const adminUpdateDelivery = useAdminUpdateOrderDelivery();

  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [driverFilter, setDriverFilter] = useState<string>("ALL");

  // Affectation
  const [assignModalDelivery, setAssignModalDelivery] = useState<DeliveryWithDetails | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  // Changement de statut
  const [statusModalDelivery, setStatusModalDelivery] = useState<DeliveryWithDetails | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [issueReason, setIssueReason] = useState("");

  // Visualisation d'itinéraire modal
  const [routeViewerDelivery, setRouteViewerDelivery] = useState<DeliveryWithDetails | null>(null);

  // Correction manuelle d'adresse / distance
  const [manualOverrideDelivery, setManualOverrideDelivery] = useState<DeliveryWithDetails | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    address: "",
    commune: "",
    quarter: "",
    instructions: "",
    distanceKm: 0,
    deliveryFee: 0,
    lat: 0,
    lng: 0,
    reason: "",
  });

  // Historique
  const [historyDeliveryId, setHistoryDeliveryId] = useState<string | null>(null);
  const { data: history = [] } = useDeliveryHistory(historyDeliveryId || undefined);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;

  const depotCoords = {
    lat: deliverySettings?.departure_lat ?? DEFAULT_TMI_DEPOT.lat,
    lng: deliverySettings?.departure_lng ?? DEFAULT_TMI_DEPOT.lng,
  };
  const depotName = deliverySettings?.departure_name || DEFAULT_TMI_DEPOT.name;

  // KPIs
  const aPreparer = deliveries.filter((d) => d.status === "A_PREPARER").length;
  const pretes = deliveries.filter((d) => d.status === "PRETE").length;
  const enCours = deliveries.filter((d) => ["AFFECTEE", "EN_COURS"].includes(d.status)).length;
  const livreesToday = deliveries.filter((d) => {
    if (d.status !== "LIVREE" || !d.completed_at) return false;
    return new Date(d.completed_at).toDateString() === new Date().toDateString();
  }).length;
  const echecs = deliveries.filter((d) => ["ECHEC", "CLIENT_ABSENT", "ADRESSE_INCORRECTE"].includes(d.status)).length;
  const totalFeesCalculated = deliveries.reduce((acc, d) => acc + (d.orders?.delivery_fee ?? 0), 0);

  const term = search.trim().toLowerCase();
  const filtered = deliveries.filter((d) => {
    const orderNum = d.orders?.order_number?.toLowerCase() || "";
    const customer = d.orders?.customer_name?.toLowerCase() || "";
    const phone = d.orders?.customer_phone || "";
    const city = d.orders?.delivery_city?.toLowerCase() || "";
    const commune = d.orders?.delivery_commune?.toLowerCase() || "";
    const driver = d.delivery_drivers ? `${d.delivery_drivers.first_name} ${d.delivery_drivers.last_name}`.toLowerCase() : "";

    const searchMatch =
      !term ||
      orderNum.includes(term) ||
      customer.includes(term) ||
      phone.includes(term) ||
      city.includes(term) ||
      commune.includes(term) ||
      driver.includes(term);

    const statusMatch = statusFilter === "ALL" || d.status === statusFilter;
    const driverMatch = driverFilter === "ALL" || d.driver_id === driverFilter;
    return searchMatch && statusMatch && driverMatch;
  });

  const openAssignModal = (delivery: DeliveryWithDetails) => {
    setAssignModalDelivery(delivery);
    setSelectedDriverId(delivery.driver_id || "");
  };

  const handleAssignSave = async () => {
    if (!assignModalDelivery) return;
    try {
      await assignDriver.mutateAsync({
        delivery_id: assignModalDelivery.id,
        order_id: assignModalDelivery.order_id,
        driver_id: selectedDriverId || null,
      });
      toast.success(selectedDriverId ? "Livreur affecté avec succès." : "Affectation retirée.");
      setAssignModalDelivery(null);
    } catch (e) {
      toast.error("Erreur d'affectation", { description: (e as Error).message });
    }
  };

  const openStatusModal = (delivery: DeliveryWithDetails) => {
    setStatusModalDelivery(delivery);
    setTargetStatus(delivery.status);
    setCommentText("");
    setIssueReason("");
  };

  const handleStatusSave = async () => {
    if (!statusModalDelivery || !targetStatus) return;
    try {
      await updateStatus.mutateAsync({
        delivery_id: statusModalDelivery.id,
        order_id: statusModalDelivery.order_id,
        status: targetStatus as never,
        comment: commentText.trim() || undefined,
        issue_reason: issueReason.trim() || undefined,
      });
      toast.success("Statut de livraison mis à jour.");
      setStatusModalDelivery(null);
    } catch (e) {
      toast.error("Mise à jour impossible", { description: (e as Error).message });
    }
  };

  const openOverrideModal = (delivery: DeliveryWithDetails) => {
    const o = delivery.orders;
    setManualOverrideDelivery(delivery);
    setOverrideForm({
      address: o?.delivery_address || "",
      commune: o?.delivery_commune || "",
      quarter: o?.delivery_quarter || "",
      instructions: o?.delivery_instructions || "",
      distanceKm: o?.estimated_distance_km ?? 0,
      deliveryFee: o?.delivery_fee ?? 0,
      lat: o?.delivery_lat ?? 0,
      lng: o?.delivery_lng ?? 0,
      reason: "",
    });
  };

  const handleSaveOverride = async () => {
    if (!manualOverrideDelivery) return;
    if (!overrideForm.reason.trim()) {
      toast.error("Le motif de modification est obligatoire pour l'audit.");
      return;
    }

    try {
      await adminUpdateDelivery.mutateAsync({
        order_id: manualOverrideDelivery.order_id,
        new_address: overrideForm.address.trim(),
        new_commune: overrideForm.commune.trim(),
        new_quarter: overrideForm.quarter.trim(),
        new_instructions: overrideForm.instructions.trim(),
        new_distance_km: Number(overrideForm.distanceKm) || 0,
        new_delivery_fee: Number(overrideForm.deliveryFee) || 0,
        new_lat: overrideForm.lat || 0,
        new_lng: overrideForm.lng || 0,
        override_reason: overrideForm.reason.trim(),
      });
      toast.success("Ajustement de livraison enregistré avec traçabilité.");
      setManualOverrideDelivery(null);
    } catch (e) {
      toast.error("Erreur de modification", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec bascule de vue Tableau / Carte */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Gestion Logistique & Livraisons
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Point de départ configuré : <strong>{depotName}</strong> ({depotCoords.lat.toFixed(4)}, {depotCoords.lng.toFixed(4)})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === "table" ? "default" : "outline"}
            className="text-xs gap-1.5"
            onClick={() => setViewMode("table")}
          >
            <List className="h-4 w-4" />
            <span>Tableau</span>
          </Button>
          <Button
            size="sm"
            variant={viewMode === "map" ? "default" : "outline"}
            className="text-xs gap-1.5"
            onClick={() => setViewMode("map")}
          >
            <MapIcon className="h-4 w-4" />
            <span>Vue Carte ({deliveries.filter((d) => d.orders?.delivery_lat).length})</span>
          </Button>
        </div>
      </div>

      {/* Cartes d'indicateurs clés */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <p className="text-xs text-muted-foreground">À préparer / Prêtes</p>
          <p className="text-2xl font-heading font-bold text-amber-600 mt-1">{aPreparer + pretes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <p className="text-xs text-muted-foreground">En cours d'acheminement</p>
          <p className="text-2xl font-heading font-bold text-indigo-600 mt-1">{enCours}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <p className="text-xs text-muted-foreground">Livrées aujourd'hui</p>
          <p className="text-2xl font-heading font-bold text-green-600 mt-1">{livreesToday}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs">
          <p className="text-xs text-muted-foreground">Problèmes signalés</p>
          <p className="text-2xl font-heading font-bold text-destructive mt-1">{echecs}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3.5 shadow-2xs col-span-2 md:col-span-1">
          <p className="text-xs text-muted-foreground">Total Frais Livraisons</p>
          <p className="text-xl font-heading font-bold text-primary mt-1">{formatFCFA(totalFeesCalculated)}</p>
        </div>
      </div>

      {/* VUE CARTE INTERACTIVE */}
      {viewMode === "map" && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Cartographie des livraisons en temps réel (Sénégal)
          </h3>
          <AdminDeliveriesMap
            deliveries={filtered}
            depotCoords={depotCoords}
            depotName={depotName}
            onSelectDelivery={(delivery) => setRouteViewerDelivery(delivery)}
            height="500px"
          />
        </div>
      )}

      {/* VUE TABLEAU AVEC RECHERCHE ET FILTRES */}
      {viewMode === "table" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° commande, client, téléphone, commune ou livreur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] text-xs">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {Object.entries(DELIVERY_STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-full sm:w-[200px] text-xs">
                <SelectValue placeholder="Filtrer par livreur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les livreurs</SelectItem>
                {activeDrivers.map((dr) => (
                  <SelectItem key={dr.id} value={dr.id}>
                    {dr.first_name} {dr.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tableau des courses */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-3.5 py-3 text-left">Commande</th>
                  <th className="px-3.5 py-3 text-left">Client & Contact</th>
                  <th className="px-3.5 py-3 text-left">Destination & Coordonnées</th>
                  <th className="px-3.5 py-3 text-left">Distance & Frais</th>
                  <th className="px-3.5 py-3 text-left">Livreur</th>
                  <th className="px-3.5 py-3 text-left">Statut</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune livraison ne correspond aux critères sélectionnés.
                    </td>
                  </tr>
                ) : (
                  filtered.map((d) => {
                    const order = d.orders;
                    const statusCfg = DELIVERY_STATUS_CONFIG[d.status] || {
                      label: d.status,
                      badge: "bg-muted text-muted-foreground",
                    };
                    const hasCoords = order?.delivery_lat != null && order?.delivery_lng != null;

                    return (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3.5 py-3 font-semibold text-foreground whitespace-nowrap">
                          {order?.order_number || d.id.slice(0, 8)}
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            {new Date(d.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </td>

                        <td className="px-3.5 py-3">
                          <p className="font-medium text-foreground">{order?.customer_name}</p>
                          {order?.customer_phone && (
                            <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" /> {order.customer_phone}
                            </a>
                          )}
                        </td>

                        <td className="px-3.5 py-3 max-w-[200px]">
                          <p className="truncate font-medium">{order?.delivery_address || "—"}</p>
                          <p className="text-muted-foreground truncate">
                            {[order?.delivery_commune, order?.delivery_quarter, order?.delivery_city].filter(Boolean).join(" • ")}
                          </p>
                          {hasCoords ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-green-700 dark:text-green-300 font-mono mt-0.5">
                              <MapPin className="h-2.5 w-2.5" /> GPS vérifié
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600">Adresse textuelle</span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="font-semibold text-foreground">
                            {order?.estimated_distance_km ? `${order.estimated_distance_km} km` : "—"}
                          </div>
                          <div className="text-primary font-bold">{formatFCFA(order?.delivery_fee ?? 0)}</div>
                        </td>

                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {d.delivery_drivers ? (
                            <span className="font-medium text-foreground">
                              {d.delivery_drivers.first_name} {d.delivery_drivers.last_name}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                              Non affecté
                            </Badge>
                          )}
                        </td>

                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.badge}`}>
                            {statusCfg.label}
                          </span>
                          {d.issue_reason && (
                            <span className="block text-[10px] text-destructive truncate max-w-[120px] mt-0.5" title={d.issue_reason}>
                              Motif : {d.issue_reason}
                            </span>
                          )}
                        </td>

                        <td className="px-3.5 py-3 text-right whitespace-nowrap space-x-1">
                          {hasCoords && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              onClick={() => setRouteViewerDelivery(d)}
                              title="Voir l'itinéraire sur carte"
                            >
                              <Route className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => openAssignModal(d)}
                            title="Affecter un livreur"
                          >
                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => openStatusModal(d)}
                            title="Changer le statut"
                          >
                            <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => openOverrideModal(d)}
                            title="Corriger l'adresse / distance"
                          >
                            <Edit className="h-3.5 w-3.5 text-foreground" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setHistoryDeliveryId(d.id)}
                            title="Historique de livraison"
                          >
                            <History className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DIALOGUE VISUALISATION D'ITINÉRAIRE */}
      <Dialog open={!!routeViewerDelivery} onOpenChange={(o) => !o && setRouteViewerDelivery(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              Itinéraire de livraison — {routeViewerDelivery?.orders?.order_number}
            </DialogTitle>
          </DialogHeader>

          {routeViewerDelivery && routeViewerDelivery.orders?.delivery_lat && routeViewerDelivery.orders?.delivery_lng && (
            <DeliveryRouteViewer
              destination={{
                lat: routeViewerDelivery.orders.delivery_lat,
                lng: routeViewerDelivery.orders.delivery_lng,
              }}
              customerName={routeViewerDelivery.orders.customer_name}
              customerPhone={routeViewerDelivery.orders.customer_phone}
              deliveryAddress={routeViewerDelivery.orders.delivery_address || undefined}
              deliveryCommune={routeViewerDelivery.orders.delivery_commune || undefined}
              deliveryQuarter={routeViewerDelivery.orders.delivery_quarter || undefined}
              deliveryInstructions={routeViewerDelivery.orders.delivery_instructions || undefined}
              depotCoords={depotCoords}
              depotName={depotName}
              driverLiveCoords={
                routeViewerDelivery.driver_lat && routeViewerDelivery.driver_lng
                  ? { lat: routeViewerDelivery.driver_lat, lng: routeViewerDelivery.driver_lng }
                  : null
              }
              driverName={
                routeViewerDelivery.delivery_drivers
                  ? `${routeViewerDelivery.delivery_drivers.first_name} ${routeViewerDelivery.delivery_drivers.last_name}`
                  : "Livreur"
              }
              height="360px"
              showNavigationActions={true}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteViewerDelivery(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOGUE AFFECTATION LIVREUR */}
      <Dialog open={!!assignModalDelivery} onOpenChange={(o) => !o && setAssignModalDelivery(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Affecter la livraison à un livreur
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold">{assignModalDelivery?.orders?.order_number}</p>
              <p className="text-muted-foreground">Client : {assignModalDelivery?.orders?.customer_name}</p>
              <p className="text-muted-foreground">Destination : {assignModalDelivery?.orders?.delivery_address}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Sélectionner un livreur actif</Label>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Choisir un livreur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Aucun (Retirer l'affectation) --</SelectItem>
                  {activeDrivers.map((dr) => (
                    <SelectItem key={dr.id} value={dr.id}>
                      {dr.first_name} {dr.last_name} ({dr.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAssignModalDelivery(null)}>
              Annuler
            </Button>
            <Button onClick={handleAssignSave} disabled={assignDriver.isPending}>
              {assignDriver.isPending ? "Enregistrement..." : "Confirmer l'affectation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOGUE CHANGEMENT DE STATUT ADMIN */}
      <Dialog open={!!statusModalDelivery} onOpenChange={(o) => !o && setStatusModalDelivery(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Modifier le statut de livraison
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nouveau statut</Label>
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DELIVERY_STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {["ECHEC", "CLIENT_ABSENT", "ADRESSE_INCORRECTE", "REPORTEE"].includes(targetStatus) && (
              <div className="space-y-1.5">
                <Label htmlFor="issue-reason" className="text-xs">
                  Motif du problème / incident *
                </Label>
                <Input
                  id="issue-reason"
                  placeholder="Ex: Client indisponible au numéro indiqué"
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="comment-text" className="text-xs">
                Commentaire d'audit interne (optionnel)
              </Label>
              <Textarea
                id="comment-text"
                rows={2}
                placeholder="Précisions administratives..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStatusModalDelivery(null)}>
              Annuler
            </Button>
            <Button onClick={handleStatusSave} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOGUE CORRECTION MANUELLE D'ADRESSE / DISTANCE AVEC AUDIT TRAIL */}
      <Dialog open={!!manualOverrideDelivery} onOpenChange={(o) => !o && setManualOverrideDelivery(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Correction manuelle de livraison & Audit
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-800 dark:text-amber-200">
              Chaque ajustement manuel est tracé avec votre identifiant administrateur, l'horodatage et la justification.
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Adresse textuelle</Label>
                <Input
                  value={overrideForm.address}
                  onChange={(e) => setOverrideForm({ ...overrideForm, address: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Commune</Label>
                <Input
                  value={overrideForm.commune}
                  onChange={(e) => setOverrideForm({ ...overrideForm, commune: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quartier</Label>
                <Input
                  value={overrideForm.quarter}
                  onChange={(e) => setOverrideForm({ ...overrideForm, quarter: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Distance routière (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={overrideForm.distanceKm}
                  onChange={(e) => setOverrideForm({ ...overrideForm, distanceKm: parseFloat(e.target.value) || 0 })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Frais de livraison ajustés (FCFA)</Label>
                <Input
                  type="number"
                  step="100"
                  value={overrideForm.deliveryFee}
                  onChange={(e) => setOverrideForm({ ...overrideForm, deliveryFee: parseFloat(e.target.value) || 0 })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Instructions d'accès</Label>
                <Input
                  value={overrideForm.instructions}
                  onChange={(e) => setOverrideForm({ ...overrideForm, instructions: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-xs font-semibold text-destructive">
                Motif obligatoire de la modification *
              </Label>
              <Textarea
                rows={2}
                placeholder="Ex: Rectification de l'adresse suite à appel téléphonique du client..."
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setManualOverrideDelivery(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveOverride} disabled={adminUpdateDelivery.isPending}>
              {adminUpdateDelivery.isPending ? "Enregistrement..." : "Valider l'ajustement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOGUE HISTORIQUE DE LIVRAISON */}
      <Dialog open={!!historyDeliveryId} onOpenChange={(o) => !o && setHistoryDeliveryId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Journal des étapes de livraison
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[360px] overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucun événement d'historique consigné.
              </p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="border-l-2 border-primary/40 pl-3 py-1 space-y-0.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{h.status}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  {h.comment && <p className="text-muted-foreground">{h.comment}</p>}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDeliveryId(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeliveries;
