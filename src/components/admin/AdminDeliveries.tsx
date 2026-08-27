import { useState } from "react";
import {
  Truck, UserCheck, PackageCheck, AlertTriangle, CheckCircle2, Clock, MapPin, Phone, User,
  FileText, History, ExternalLink, RefreshCw, XCircle, ChevronDown, ChevronUp, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveries, useAssignDriver, useUpdateDeliveryStatus, useDeliveryHistory, type DeliveryWithDetails } from "@/hooks/useDeliveries";
import { useActiveDrivers } from "@/hooks/useDrivers";
import { formatFCFA } from "@/hooks/useProducts";

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
  const assignDriver = useAssignDriver();
  const updateStatus = useUpdateDeliveryStatus();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [driverFilter, setDriverFilter] = useState<string>("ALL");

  // Assignment Modal State
  const [assignModalDelivery, setAssignModalDelivery] = useState<DeliveryWithDetails | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  // Status Modal State
  const [statusModalDelivery, setStatusModalDelivery] = useState<DeliveryWithDetails | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [issueReason, setIssueReason] = useState("");

  // History Drawer State
  const [historyDeliveryId, setHistoryDeliveryId] = useState<string | null>(null);
  const { data: history = [] } = useDeliveryHistory(historyDeliveryId || undefined);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;

  // KPIs
  const aPreparer = deliveries.filter((d) => d.status === "A_PREPARER").length;
  const pretes = deliveries.filter((d) => d.status === "PRETE").length;
  const enCours = deliveries.filter((d) => ["AFFECTEE", "EN_COURS"].includes(d.status)).length;
  const livreesToday = deliveries.filter((d) => {
    if (d.status !== "LIVREE" || !d.completed_at) return false;
    return new Date(d.completed_at).toDateString() === new Date().toDateString();
  }).length;
  const echecs = deliveries.filter((d) => ["ECHEC", "CLIENT_ABSENT", "ADRESSE_INCORRECTE"].includes(d.status)).length;
  const driversAvailable = activeDrivers.filter((dr) => dr.status === "DISPONIBLE").length;

  const term = search.trim().toLowerCase();
  const filtered = deliveries.filter((d) => {
    const orderNum = d.orders?.order_number?.toLowerCase() || "";
    const customer = d.orders?.customer_name?.toLowerCase() || "";
    const phone = d.orders?.customer_phone || "";
    const searchMatch = !term || orderNum.includes(term) || customer.includes(term) || phone.includes(term);
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
    setIssueReason(delivery.issue_reason || "");
  };

  const handleStatusSave = async () => {
    if (!statusModalDelivery) return;
    try {
      await updateStatus.mutateAsync({
        delivery_id: statusModalDelivery.id,
        order_id: statusModalDelivery.order_id,
        status: targetStatus as any,
        comment: commentText.trim() || undefined,
        issue_reason: issueReason.trim() || undefined,
        driver_id: statusModalDelivery.driver_id,
      });
      toast.success("Statut de livraison mis à jour.");
      setStatusModalDelivery(null);
    } catch (e) {
      toast.error("Mise à jour impossible", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "À préparer", val: aPreparer, icon: PackageCheck, color: "text-amber-500" },
          { label: "Prêtes", val: pretes, icon: CheckCircle2, color: "text-cyan-500" },
          { label: "En livraison", val: enCours, icon: Truck, color: "text-indigo-500" },
          { label: "Livrées (Auj.)", val: livreesToday, icon: CheckCircle2, color: "text-green-600" },
          { label: "Problèmes / Échecs", val: echecs, icon: AlertTriangle, color: "text-destructive" },
          { label: "Livreurs dispo", val: driversAvailable, icon: UserCheck, color: "text-primary" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-card border rounded-lg p-3.5 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
            </div>
            <p className="font-heading font-bold text-xl">{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Rechercher (numéro, client, tél...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            {Object.entries(DELIVERY_STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={driverFilter} onValueChange={setDriverFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par livreur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les livreurs</SelectItem>
            {activeDrivers.map((dr) => (
              <SelectItem key={dr.id} value={dr.id}>{dr.first_name} {dr.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Delivery Cards / Table */}
      <div className="space-y-4">
        {filtered.map((d) => {
          const cfg = DELIVERY_STATUS_CONFIG[d.status] || DELIVERY_STATUS_CONFIG.A_PREPARER;
          const order = d.orders;
          const driver = d.delivery_drivers;

          return (
            <div key={d.id} className="bg-card border border-border rounded-lg p-4 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{order?.order_number || "Commande"}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Créée le {new Date(d.created_at).toLocaleDateString("fr-FR")} à {new Date(d.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setHistoryDeliveryId(d.id)} className="gap-1">
                    <History className="h-3.5 w-3.5" /> Historique
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openAssignModal(d)} className="gap-1">
                    <UserCheck className="h-3.5 w-3.5" /> {driver ? "Changer livreur" : "Affecter livreur"}
                  </Button>
                  <Button size="sm" onClick={() => openStatusModal(d)}>
                    Mettre à jour statut
                  </Button>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="font-medium text-xs uppercase text-muted-foreground tracking-wider mb-1">Informations Client</p>
                  <p className="font-semibold">{order?.customer_name}</p>
                  <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <a href={`tel:${order?.customer_phone}`} className="hover:underline text-foreground font-medium">
                      {order?.customer_phone}
                    </a>
                  </p>
                  {order?.customer_email && <p className="text-xs text-muted-foreground">{order.customer_email}</p>}
                </div>

                <div className="space-y-1">
                  <p className="font-medium text-xs uppercase text-muted-foreground tracking-wider mb-1">Lieu & Frais</p>
                  <p className="flex items-start gap-1 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>
                      {order?.delivery_address || "-"}, {order?.delivery_quarter || "-"} ({order?.delivery_city || "-"}, {order?.delivery_region || "-"})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Frais livraison : <strong className="text-foreground">{formatFCFA(order?.delivery_fee)}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total commande : <strong className="text-primary font-bold">{formatFCFA(order?.final_total ?? order?.estimated_total ?? order?.total)}</strong>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="font-medium text-xs uppercase text-muted-foreground tracking-wider mb-1">Livreur & Suivi</p>
                  {driver ? (
                    <div className="bg-muted/40 p-2 rounded text-xs space-y-1">
                      <p className="font-semibold text-foreground">{driver.first_name} {driver.last_name}</p>
                      <p className="text-muted-foreground font-mono">{driver.phone}</p>
                      {d.assigned_at && (
                        <p className="text-[11px] text-muted-foreground">
                          Affecté le : {new Date(d.assigned_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded inline-block font-medium">
                      Non encore affecté
                    </span>
                  )}
                  {d.issue_reason && (
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded mt-1">
                      ⚠️ Motif problème : {d.issue_reason}
                    </p>
                  )}
                  {d.proof_url && (
                    <a href={d.proof_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 font-medium">
                      <ImageIcon className="h-3.5 w-3.5" /> Voir la preuve de livraison
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground bg-card rounded-lg border">
            <Truck className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
            <p>Aucune livraison ne correspond aux critères sélectionnés.</p>
          </div>
        )}
      </div>

      {/* Assign Driver Modal */}
      <Dialog open={!!assignModalDelivery} onOpenChange={(op) => !op && setAssignModalDelivery(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Affecter un livreur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Commande <strong>{assignModalDelivery?.orders?.order_number}</strong> pour {assignModalDelivery?.orders?.customer_name} ({assignModalDelivery?.orders?.delivery_city}).
            </p>
            <div className="space-y-1.5">
              <Label>Sélectionner un livreur disponible</Label>
              <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <SelectTrigger><SelectValue placeholder="Choisir un livreur..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Non affecté --</SelectItem>
                  {activeDrivers.map((dr) => (
                    <SelectItem key={dr.id} value={dr.id}>
                      {dr.first_name} {dr.last_name} ({dr.status}) - {dr.main_zone || "Zone indéfinie"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalDelivery(null)}>Annuler</Button>
            <Button onClick={handleAssignSave} disabled={assignDriver.isPending}>
              {assignDriver.isPending ? "Enregistrement..." : "Confirmer l'affectation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={!!statusModalDelivery} onOpenChange={(op) => !op && setStatusModalDelivery(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mettre à jour le statut de livraison</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nouveau Statut</Label>
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DELIVERY_STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {["ECHEC", "CLIENT_ABSENT", "ADRESSE_INCORRECTE", "REPORTEE"].includes(targetStatus) && (
              <div className="space-y-1.5">
                <Label htmlFor="issue">Motif / Problème de livraison *</Label>
                <Input
                  id="issue"
                  placeholder="Ex: Client ne répond pas au téléphone..."
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="comment">Commentaire interne (optionnel)</Label>
              <Textarea
                id="comment"
                rows={2}
                placeholder="Remarques pour l'équipe..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalDelivery(null)}>Annuler</Button>
            <Button onClick={handleStatusSave} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Mise à jour..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery History Dialog */}
      <Dialog open={!!historyDeliveryId} onOpenChange={(op) => !op && setHistoryDeliveryId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Historique de la livraison
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun événement enregistré.</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="border-l-2 border-primary pl-3 py-1 space-y-0.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {DELIVERY_STATUS_CONFIG[h.status]?.label || h.status}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("fr-FR")}
                    </span>
                  </div>
                  {h.comment && <p className="text-muted-foreground">{h.comment}</p>}
                  {h.proof_url && (
                    <a href={h.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-block font-medium">
                      Voir la preuve de livraison
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDeliveryId(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeliveries;
