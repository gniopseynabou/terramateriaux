import { useState } from "react";
import { UserPlus, UserCheck, Phone, Mail, MapPin, Edit, Power, ShieldAlert, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDrivers, useCreateDriver, useUpdateDriver, useToggleDriverActive, type DbDriver } from "@/hooks/useDrivers";
import { useDeliveries } from "@/hooks/useDeliveries";

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  DISPONIBLE: { label: "Disponible", badge: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30" },
  EN_LIVRAISON: { label: "En livraison", badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  INDISPONIBLE: { label: "Indisponible", badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30" },
  DESACTIVE: { label: "Désactivé", badge: "bg-destructive/15 text-destructive border-destructive/30" },
};

const AdminDrivers = () => {
  const { data: drivers = [], isLoading } = useDrivers();
  const { data: deliveries = [] } = useDeliveries();
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const toggleActive = useToggleDriverActive();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DbDriver | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    main_zone: "",
    status: "DISPONIBLE" as "DISPONIBLE" | "EN_LIVRAISON" | "INDISPONIBLE" | "DESACTIVE",
  });

  const openCreate = () => {
    setEditingDriver(null);
    setForm({
      first_name: "",
      last_name: "",
      phone: "",
      email: "",
      main_zone: "",
      status: "DISPONIBLE",
    });
    setDialogOpen(true);
  };

  const openEdit = (driver: DbDriver) => {
    setEditingDriver(driver);
    setForm({
      first_name: driver.first_name,
      last_name: driver.last_name,
      phone: driver.phone,
      email: driver.email || "",
      main_zone: driver.main_zone || "",
      status: driver.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      toast.error("Veuillez remplir les champs obligatoires (Prénom, Nom, Téléphone).");
      return;
    }

    try {
      if (editingDriver) {
        await updateDriver.mutateAsync({
          id: editingDriver.id,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          main_zone: form.main_zone.trim() || null,
          status: form.status,
        });
        toast.success("Informations du livreur mises à jour.");
      } else {
        await createDriver.mutateAsync({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          main_zone: form.main_zone.trim() || null,
          status: form.status,
        });
        toast.success("Nouveau livreur enregistré.");
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error("Erreur d'enregistrement", { description: (e as Error).message });
    }
  };

  const handleToggleStatus = async (driver: DbDriver) => {
    try {
      const active = !driver.is_active;
      await toggleActive.mutateAsync({ id: driver.id, is_active: active });
      toast.success(active ? "Livreur réactivé." : "Livreur désactivé.");
    } catch (e) {
      toast.error("Action impossible", { description: (e as Error).message });
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-lg" />;

  const term = search.trim().toLowerCase();
  const filtered = drivers.filter((d) => {
    const nameMatch = `${d.first_name} ${d.last_name}`.toLowerCase().includes(term) || d.phone.includes(term);
    const statusMatch = statusFilter === "ALL" || d.status === statusFilter;
    return nameMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-xl">Gestion des Livreurs</h2>
          <p className="text-sm text-muted-foreground">Enregistrez, affectez et gérez l'équipe de livreurs.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" /> Ajouter un livreur
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Rechercher par nom, téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="DISPONIBLE">Disponible</SelectItem>
            <SelectItem value="EN_LIVRAISON">En livraison</SelectItem>
            <SelectItem value="INDISPONIBLE">Indisponible</SelectItem>
            <SelectItem value="DESACTIVE">Désactivé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Driver Cards / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => {
          const driverDeliveries = deliveries.filter((del) => del.driver_id === d.id);
          const activeDeliveries = driverDeliveries.filter((del) => ["AFFECTEE", "EN_COURS"].includes(del.status)).length;
          const completedDeliveries = driverDeliveries.filter((del) => del.status === "LIVREE").length;
          const statusInfo = STATUS_LABELS[d.status] || STATUS_LABELS.DISPONIBLE;

          return (
            <div
              key={d.id}
              className={`bg-card border rounded-lg p-5 space-y-4 shadow-xs transition-all ${
                !d.is_active ? "opacity-60 bg-muted/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading font-bold text-base">
                    {d.first_name} {d.last_name}
                  </h3>
                  {d.main_zone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-primary" /> {d.main_zone}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusInfo.badge}`}>
                  {statusInfo.label}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground border-y border-border py-3">
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <a href={`tel:${d.phone}`} className="hover:underline font-medium text-foreground">{d.phone}</a>
                </p>
                {d.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {d.email}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs text-center">
                <div className="bg-muted/40 p-2 rounded">
                  <span className="block font-bold text-sm text-primary">{activeDeliveries}</span>
                  <span className="text-muted-foreground">En cours</span>
                </div>
                <div className="bg-muted/40 p-2 rounded">
                  <span className="block font-bold text-sm text-green-600">{completedDeliveries}</span>
                  <span className="text-muted-foreground">Terminées</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(d)}>
                  <Edit className="h-3.5 w-3.5" /> Modifier
                </Button>
                <Button
                  variant={d.is_active ? "ghost" : "outline"}
                  size="sm"
                  className={d.is_active ? "text-destructive hover:bg-destructive/10" : "text-green-600 hover:bg-green-50"}
                  onClick={() => handleToggleStatus(d)}
                >
                  <Power className="h-3.5 w-3.5 mr-1" />
                  {d.is_active ? "Désactiver" : "Réactiver"}
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-lg border">
            <UserCheck className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
            <p>Aucun livreur ne correspond à votre recherche.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDriver ? "Modifier le livreur" : "Ajouter un nouveau livreur"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  placeholder="Mamadou"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  placeholder="Diallo"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Numéro de téléphone *</Label>
              <Input
                id="phone"
                placeholder="+221 77 000 00 00"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optionnel)</Label>
              <Input
                id="email"
                type="email"
                placeholder="livreur@tmi.sn"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="main_zone">Zone principale</Label>
              <Input
                id="main_zone"
                placeholder="Dakar, Guédiawaye, Pikine, Rufisque..."
                value={form.main_zone}
                onChange={(e) => setForm({ ...form, main_zone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Statut initial / actuel</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    status: v as "DISPONIBLE" | "EN_LIVRAISON" | "INDISPONIBLE" | "DESACTIVE",
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                  <SelectItem value="EN_LIVRAISON">En livraison</SelectItem>
                  <SelectItem value="INDISPONIBLE">Indisponible</SelectItem>
                  <SelectItem value="DESACTIVE">Désactivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={createDriver.isPending || updateDriver.isPending}>
              {createDriver.isPending || updateDriver.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDrivers;
