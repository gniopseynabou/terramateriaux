import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, MapPin, Phone, Package, CheckCircle2, XCircle, Clock,
  Navigation, AlertCircle, LogOut, RefreshCw, ChevronDown, ChevronUp, User
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useDriverDeliveries, useUpdateDeliveryStatusSimple } from "@/hooks/useDeliveries";
import type { DeliveryWithDetails } from "@/hooks/useDeliveries";
import { formatFCFA } from "@/hooks/useProducts";

const DELIVERY_STATUS = [
  { value: "EN_ATTENTE", label: "En attente", icon: Clock, color: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-400/30" },
  { value: "ACCEPTEE", label: "Acceptée", icon: CheckCircle2, color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/30" },
  { value: "EN_TRANSIT", label: "En transit", icon: Navigation, color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30" },
  { value: "LIVREE", label: "Livrée ✓", icon: CheckCircle2, color: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-400/30" },
  { value: "ECHOUEE", label: "Échec", icon: XCircle, color: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "RETOURNEE", label: "Retournée", icon: AlertCircle, color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/30" },
];

const getStatusConfig = (status: string) =>
  DELIVERY_STATUS.find((s) => s.value === status) || DELIVERY_STATUS[0];

const NEXT_STATUS_OPTIONS: Record<string, string[]> = {
  EN_ATTENTE: ["ACCEPTEE", "ECHOUEE"],
  ACCEPTEE: ["EN_TRANSIT", "ECHOUEE"],
  EN_TRANSIT: ["LIVREE", "ECHOUEE", "RETOURNEE"],
  LIVREE: [],
  ECHOUEE: ["EN_ATTENTE"],
  RETOURNEE: [],
};

const DriverDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: deliveries = [], isLoading, refetch } = useDriverDeliveries();
  const updateStatus = useUpdateDeliveryStatusSimple();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; delivery: DeliveryWithDetails | null }>({
    open: false, delivery: null,
  });
  const [newStatus, setNewStatus] = useState("");
  const [notes, setNotes] = useState("");

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const openStatusDialog = (delivery: DeliveryWithDetails) => {
    const options = NEXT_STATUS_OPTIONS[delivery.status] || [];
    if (options.length === 0) {
      toast.info("Le statut de cette livraison est final.");
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
        status: newStatus,
        notes: notes.trim() || undefined,
      });
      toast.success(`Statut mis à jour : ${getStatusConfig(newStatus).label}`);
      setStatusDialog({ open: false, delivery: null });
    } catch (e) {
      toast.error("Mise à jour impossible", { description: (e as Error).message });
    }
  };

  const stats = {
    total: deliveries.length,
    en_transit: deliveries.filter((d) => d.status === "EN_TRANSIT").length,
    livrees: deliveries.filter((d) => d.status === "LIVREE").length,
    en_attente: deliveries.filter((d) => ["EN_ATTENTE", "ACCEPTEE"].includes(d.status)).length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border shadow-xs">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-heading font-bold text-sm leading-tight">Espace Livreur</p>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()} title="Rafraîchir">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={handleSignOut} title="Déconnexion">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "En cours", value: stats.en_transit, color: "text-amber-600 dark:text-amber-400" },
            { label: "Livrées", value: stats.livrees, color: "text-green-600 dark:text-green-400" },
            { label: "À faire", value: stats.en_attente, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center shadow-xs">
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Deliveries list */}
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-base">Mes livraisons ({deliveries.length})</h2>

          {deliveries.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">Aucune livraison assignée pour l'instant.</p>
            </div>
          ) : (
            deliveries.map((delivery) => {
              const statusCfg = getStatusConfig(delivery.status);
              const StatusIcon = statusCfg.icon;
              const isExpanded = expanded === delivery.id;
              const nextOptions = NEXT_STATUS_OPTIONS[delivery.status] || [];
              const canUpdate = nextOptions.length > 0;
              const order = delivery.orders;

              return (
                <div
                  key={delivery.id}
                  className="bg-card border border-border rounded-xl shadow-xs overflow-hidden"
                >
                  {/* Card Header */}
                  <button
                    className="w-full p-4 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : delivery.id)}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border ${statusCfg.color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-semibold text-sm">{order?.order_number || delivery.id.slice(0, 8)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {order?.customer_name} — {order?.delivery_city || "Zone non précisée"}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      {/* Customer info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</p>
                          <div className="flex items-center gap-1.5 text-sm">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {order?.customer_name || "—"}
                          </div>
                          {order?.customer_phone && (
                            <a
                              href={`tel:${order.customer_phone}`}
                              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {order.customer_phone}
                            </a>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destination</p>
                          <div className="flex items-start gap-1.5 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <span>{order?.delivery_region && `${order.delivery_region}, `}{order?.delivery_city || "—"}</span>
                          </div>
                          {order?.customer_address && (
                            <p className="text-xs text-muted-foreground pl-5">{order.customer_address}</p>
                          )}
                        </div>
                      </div>

                      {/* Order total */}
                      {order && (
                        <div className="bg-muted/40 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total commande</span>
                          <span className="font-heading font-bold text-primary">
                            {formatFCFA(order.final_total ?? order.estimated_total ?? order.total)}
                          </span>
                        </div>
                      )}

                      {/* Notes / history */}
                      {delivery.notes && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
                          <p className="font-semibold mb-0.5">Note :</p>
                          <p>{delivery.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {canUpdate && (
                        <Button
                          className="w-full gap-2"
                          onClick={() => openStatusDialog(delivery)}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Mettre à jour le statut
                        </Button>
                      )}

                      {!canUpdate && (
                        <div className="text-center text-xs text-muted-foreground py-2">
                          ✓ Livraison finalisée — aucune action requise.
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

      {/* Status Update Dialog */}
      <Dialog open={statusDialog.open} onOpenChange={(o) => !o && setStatusDialog({ open: false, delivery: null })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Mettre à jour le statut
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {statusDialog.delivery && (
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm">
                <p className="font-semibold">{statusDialog.delivery.orders?.order_number}</p>
                <p className="text-muted-foreground text-xs">{statusDialog.delivery.orders?.customer_name}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Nouveau statut *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(NEXT_STATUS_OPTIONS[statusDialog.delivery?.status || "EN_ATTENTE"] || []).map((s) => {
                    const cfg = getStatusConfig(s);
                    return <SelectItem key={s} value={s}>{cfg.label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="update-notes">Notes (optionnel)</Label>
              <Textarea
                id="update-notes"
                rows={3}
                placeholder="Ex: Client absent, livraison reportée. Coordonnées confirmées."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setStatusDialog({ open: false, delivery: null })}>Annuler</Button>
            <Button onClick={handleUpdateStatus} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Mise à jour..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverDashboard;
