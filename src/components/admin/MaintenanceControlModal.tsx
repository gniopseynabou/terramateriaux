import { useState } from "react";
import { Wrench, ShieldAlert, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useMaintenanceStatus, useToggleMaintenance } from "@/hooks/useMaintenance";
import { useAuth } from "@/hooks/useAuth";

export const MaintenanceControlModal = () => {
  const { data: maintenance, isLoading } = useMaintenanceStatus();
  const toggleMaintenance = useToggleMaintenance();
  const { isSuperAdmin } = useAuth();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");

  if (!isSuperAdmin) return null;

  const isEnabled = maintenance?.is_enabled ?? false;

  const handleOpen = () => {
    setMessage(
      maintenance?.message ??
        "Notre équipe technique effectue actuellement une opération de maintenance planifiée afin d'améliorer la qualité de nos services. Le site sera de nouveau accessible dans les plus brefs délais."
    );
    setScheduledEnd(
      maintenance?.scheduled_end
        ? new Date(maintenance.scheduled_end).toISOString().slice(0, 16)
        : ""
    );
    setOpen(true);
  };

  const handleConfirm = async () => {
    try {
      const newStatus = !isEnabled;
      await toggleMaintenance.mutateAsync({
        isEnabled: newStatus,
        message: newStatus ? message : undefined,
        scheduledEnd: newStatus && scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      });

      toast.success(
        newStatus
          ? "Mode Maintenance activé avec succès."
          : "Plateforme rétablie en mode normal (Maintenance désactivée)."
      );
      setOpen(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inattendue";
      toast.error("Impossible de modifier le mode maintenance : " + errorMsg);
    }
  };

  return (
    <>
      <Button
        variant={isEnabled ? "destructive" : "outline"}
        size="sm"
        disabled={isLoading}
        onClick={handleOpen}
        className="gap-2 font-semibold shadow-sm text-xs sm:text-sm"
      >
        <Wrench className="h-4 w-4" />
        {isEnabled ? "Maintenance ACTIVE (Désactiver)" : "Gérer la Maintenance"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className={isEnabled ? "text-primary h-5 w-5" : "text-destructive h-5 w-5"} />
              {isEnabled ? "Désactiver le Mode Maintenance ?" : "Activer le Mode Maintenance ?"}
            </DialogTitle>
            <DialogDescription>
              {isEnabled ? (
                "La plateforme redeviendra instantanément accessible pour tous les clients, acheteurs et livreurs."
              ) : (
                "Les visiteurs et clients standards seront redirigés vers l'écran d'attente technique. Seul le Super-Admin pourra continuer à naviguer."
              )}
            </DialogDescription>
          </DialogHeader>

          {!isEnabled && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="maintenance-msg" className="text-xs font-semibold">
                  Message public affiché aux utilisateurs
                </Label>
                <Textarea
                  id="maintenance-msg"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance-end" className="text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Date / Heure estimée de reprise (optionnel)
                </Label>
                <Input
                  id="maintenance-end"
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={isEnabled ? "default" : "destructive"}
              size="sm"
              disabled={toggleMaintenance.isPending}
              onClick={handleConfirm}
              className="gap-1.5"
            >
              {isEnabled ? (
                <>
                  <CheckCircle className="h-4 w-4" /> Confirmer la réouverture publique
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4" /> Confirmer le passage en maintenance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
