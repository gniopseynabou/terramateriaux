import { useState } from "react";
import { Plus, Edit, Trash2, MapPin, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveryZones, type DbDeliveryZone } from "@/hooks/useDeliveryZones";
import { useDeliverySettings, useUpdateDeliverySettings } from "@/hooks/useDeliveries";
import { formatFCFA } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const AdminDeliveryZones = () => {
  const queryClient = useQueryClient();
  const { data: zones = [], isLoading } = useDeliveryZones();
  const { data: settings } = useDeliverySettings();
  const updateSettings = useUpdateDeliverySettings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DbDeliveryZone | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    region: "",
    city: "",
    fee: 2000,
  });

  const [freeDeliveryForm, setFreeDeliveryForm] = useState({
    enabled: settings?.free_delivery_enabled ?? true,
    minAmount: settings?.free_delivery_min_amount ?? 50000,
  });

  const openCreate = () => {
    setEditingZone(null);
    setForm({ region: "Dakar", city: "", fee: 2000 });
    setDialogOpen(true);
  };

  const openEdit = (zone: DbDeliveryZone) => {
    setEditingZone(zone);
    setForm({ region: zone.region, city: zone.city, fee: zone.fee });
    setDialogOpen(true);
  };

  const handleSaveZone = async () => {
    if (!form.region.trim() || !form.city.trim() || form.fee < 0) {
      toast.error("Veuillez saisir une région, une ville/quartier et un tarif valide.");
      return;
    }

    try {
      if (editingZone) {
        const { error } = await supabase
          .from("delivery_zones")
          .update({ region: form.region.trim(), city: form.city.trim(), fee: form.fee })
          .eq("id", editingZone.id);
        if (error) throw error;
        toast.success("Zone de livraison modifiée.");
      } else {
        const { error } = await supabase
          .from("delivery_zones")
          .insert({ region: form.region.trim(), city: form.city.trim(), fee: form.fee });
        if (error) throw error;
        toast.success("Nouvelle zone ajoutée.");
      }
      queryClient.invalidateQueries({ queryKey: ["delivery_zones"] });
      setDialogOpen(false);
    } catch (e) {
      toast.error("Erreur d'enregistrement", { description: (e as Error).message });
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette zone ?")) return;
    try {
      const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
      if (error) throw error;
      toast.success("Zone supprimée.");
      queryClient.invalidateQueries({ queryKey: ["delivery_zones"] });
    } catch (e) {
      toast.error("Suppression impossible", { description: (e as Error).message });
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        free_delivery_enabled: freeDeliveryForm.enabled,
        free_delivery_min_amount: Number(freeDeliveryForm.minAmount) || 0,
      });
      toast.success("Règles de livraison gratuite mises à jour.");
    } catch (e) {
      toast.error("Mise à jour impossible", { description: (e as Error).message });
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-lg" />;

  const term = search.trim().toLowerCase();
  const filtered = zones.filter(
    (z) => z.region.toLowerCase().includes(term) || z.city.toLowerCase().includes(term)
  );

  return (
    <div className="space-y-6">
      {/* Free Delivery Settings Card */}
      <div className="bg-card border rounded-lg p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">Règles de Livraison Gratuite</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <div className="flex items-center gap-3">
            <Switch
              id="free-enabled"
              checked={freeDeliveryForm.enabled}
              onCheckedChange={(checked) => setFreeDeliveryForm({ ...freeDeliveryForm, enabled: checked })}
            />
            <Label htmlFor="free-enabled" className="font-medium cursor-pointer">
              Activer la livraison gratuite sur la plateforme
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="min-amount">Montant minimum d'éligibilité (FCFA)</Label>
            <div className="flex gap-2">
              <Input
                id="min-amount"
                type="number"
                min={0}
                value={freeDeliveryForm.minAmount}
                onChange={(e) => setFreeDeliveryForm({ ...freeDeliveryForm, minAmount: Number(e.target.value) })}
                disabled={!freeDeliveryForm.enabled}
              />
              <Button onClick={handleSaveSettings} disabled={updateSettings.isPending} className="gap-1">
                <Save className="h-4 w-4" /> Enregistrer
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Exemple : "Livraison gratuite à partir de {formatFCFA(freeDeliveryForm.minAmount)}." Lorsqu'un client atteint ce seuil, ses frais passent automatiquement à 0 FCFA.
        </p>
      </div>

      {/* Zone Management */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-xl">Zones & Tarifs de Livraison</h2>
          <p className="text-sm text-muted-foreground">Définissez les tarifs de livraison par région et ville/quartier.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter une zone
        </Button>
      </div>

      <Input
        className="max-w-xs"
        placeholder="Filtrer par région ou ville..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="bg-card border rounded-lg overflow-x-auto shadow-xs">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
              <th className="p-3.5">Région</th>
              <th className="p-3.5">Ville / Quartier</th>
              <th className="p-3.5">Tarif de livraison</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((z) => (
              <tr key={z.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-3.5 font-medium">{z.region}</td>
                <td className="p-3.5">{z.city}</td>
                <td className="p-3.5 font-bold text-primary">{formatFCFA(z.fee)}</td>
                <td className="p-3.5 text-right space-x-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(z)}>
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteZone(z.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Aucune zone ne correspond à votre filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Zone Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Modifier la zone" : "Ajouter une nouvelle zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="region">Région *</Label>
              <Input
                id="region"
                placeholder="Dakar, Thiès, Saint-Louis..."
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Ville / Quartier *</Label>
              <Input
                id="city"
                placeholder="Dakar-Plateau, Guédiawaye, Pikine, Rufisque..."
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee">Frais de livraison (FCFA) *</Label>
              <Input
                id="fee"
                type="number"
                min={0}
                placeholder="2000"
                value={form.fee}
                onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveZone}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDeliveryZones;
