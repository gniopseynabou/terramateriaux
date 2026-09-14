import { useState } from "react";
import {
  Tag, Plus, Edit, Trash2, Calendar, ToggleLeft, ToggleRight, Search, X, Check
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion, type DbPromotion } from "@/hooks/usePromotions";
import { useCategories } from "@/hooks/useCategories";
import { useProducts, formatFCFA } from "@/hooks/useProducts";
import { getEffectivePromotionStatus, isPromotionActive } from "@/lib/promotions";
import type { PromotionWithTargets } from "@/lib/promotions";

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  DRAFT: { label: "Brouillon", badge: "bg-gray-500/15 text-gray-600 dark:text-gray-300 border-gray-500/30" },
  SCHEDULED: { label: "Programmée", badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  ACTIVE: { label: "Active", badge: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30" },
  EXPIRED: { label: "Expirée", badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  DISABLED: { label: "Désactivée", badge: "bg-destructive/15 text-destructive border-destructive/30" },
};

interface PromotionForm {
  name: string;
  description: string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number;
  target_type: "ALL_PRODUCTS" | "CATEGORY" | "SPECIFIC_PRODUCTS";
  category_id: string;
  start_date: string;
  end_date: string;
  status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "DISABLED";
  selected_products: string[];
}

const toLocalDateInput = (iso: string) => iso ? iso.slice(0, 16) : "";

const AdminPromotions = () => {
  const { data: promotions = [], isLoading } = usePromotions();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const deletePromotion = useDeletePromotion();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionWithTargets | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [productSearch, setProductSearch] = useState("");

  const defaultForm: PromotionForm = {
    name: "",
    description: "",
    discount_type: "PERCENTAGE",
    discount_value: 10,
    target_type: "ALL_PRODUCTS",
    category_id: "",
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    status: "ACTIVE",
    selected_products: [],
  };

  const [form, setForm] = useState<PromotionForm>(defaultForm);

  const openCreate = () => {
    setEditingPromo(null);
    setForm(defaultForm);
    setProductSearch("");
    setDialogOpen(true);
  };

  const openEdit = (promo: PromotionWithTargets) => {
    setEditingPromo(promo);
    setForm({
      name: promo.name,
      description: promo.description || "",
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      target_type: promo.target_type,
      category_id: promo.category_id || "",
      start_date: toLocalDateInput(promo.start_date),
      end_date: toLocalDateInput(promo.end_date),
      status: promo.status,
      selected_products: promo.promotion_products?.map((pp) => pp.product_id) || [],
    });
    setProductSearch("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Le nom de la promotion est obligatoire.");
      return;
    }
    if (form.discount_value <= 0) {
      toast.error("La valeur de la réduction doit être supérieure à 0.");
      return;
    }
    if (form.discount_type === "PERCENTAGE" && form.discount_value > 100) {
      toast.error("Le pourcentage ne peut pas dépasser 100%.");
      return;
    }
    if (!form.start_date || !form.end_date) {
      toast.error("Les dates de début et de fin sont obligatoires.");
      return;
    }
    if (new Date(form.start_date) >= new Date(form.end_date)) {
      toast.error("La date de fin doit être postérieure à la date de début.");
      return;
    }
    if (form.target_type === "CATEGORY" && !form.category_id) {
      toast.error("Sélectionnez une catégorie pour ce type de promotion.");
      return;
    }
    if (form.target_type === "SPECIFIC_PRODUCTS" && form.selected_products.length === 0) {
      toast.error("Sélectionnez au moins un produit.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      target_type: form.target_type,
      category_id: form.target_type === "CATEGORY" ? form.category_id || null : null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      status: form.status,
      product_ids: form.target_type === "SPECIFIC_PRODUCTS" ? form.selected_products : [],
    };

    try {
      if (editingPromo) {
        await updatePromotion.mutateAsync({ id: editingPromo.id, ...payload });
        toast.success("Promotion mise à jour.");
      } else {
        await createPromotion.mutateAsync(payload);
        toast.success("Promotion créée avec succès.");
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error("Erreur d'enregistrement", { description: (e as Error).message });
    }
  };

  const handleDelete = async (promo: PromotionWithTargets) => {
    if (!confirm(`Supprimer la promotion "${promo.name}" ? Cette action est irréversible.`)) return;
    try {
      await deletePromotion.mutateAsync(promo.id);
      toast.success("Promotion supprimée.");
    } catch (e) {
      toast.error("Suppression impossible", { description: (e as Error).message });
    }
  };

  const handleToggleStatus = async (promo: PromotionWithTargets) => {
    const newStatus = promo.status === "DISABLED" ? "ACTIVE" : "DISABLED";
    try {
      await updatePromotion.mutateAsync({ id: promo.id, status: newStatus });
      toast.success(newStatus === "ACTIVE" ? "Promotion réactivée." : "Promotion désactivée.");
    } catch (e) {
      toast.error("Action impossible", { description: (e as Error).message });
    }
  };

  const toggleProductSelection = (productId: string) => {
    setForm((prev) => ({
      ...prev,
      selected_products: prev.selected_products.includes(productId)
        ? prev.selected_products.filter((id) => id !== productId)
        : [...prev.selected_products, productId],
    }));
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-lg" />;

  const term = search.trim().toLowerCase();
  const filtered = promotions.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(term);
    const effectiveStatus = getEffectivePromotionStatus(p);
    const statusMatch = statusFilter === "ALL" || effectiveStatus === statusFilter || p.status === statusFilter;
    return nameMatch && statusMatch;
  });

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading font-bold text-xl">Gestion des Promotions</h2>
          <p className="text-sm text-muted-foreground">Créez et gérez des promotions sur les produits, catégories ou toute la boutique.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Créer une promotion
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher une promotion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SCHEDULED">Programmée</SelectItem>
            <SelectItem value="EXPIRED">Expirée</SelectItem>
            <SelectItem value="DISABLED">Désactivée</SelectItem>
            <SelectItem value="DRAFT">Brouillon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Promotions table */}
      <div className="bg-card border rounded-lg overflow-x-auto shadow-xs">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
              <th className="p-3.5">Promotion</th>
              <th className="p-3.5">Réduction</th>
              <th className="p-3.5">Cible</th>
              <th className="p-3.5">Période</th>
              <th className="p-3.5">Statut</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const effectiveStatus = getEffectivePromotionStatus(p);
              const statusCfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.DRAFT;
              const targetLabel =
                p.target_type === "ALL_PRODUCTS" ? "Tous les produits" :
                p.target_type === "CATEGORY" ? `Catégorie : ${p.categories?.name || "—"}` :
                `${p.promotion_products?.length || 0} produit(s)`;
              const discountLabel = p.discount_type === "PERCENTAGE"
                ? `-${p.discount_value}%`
                : `-${formatFCFA(p.discount_value)}`;

              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold">{p.name}</div>
                    {p.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</div>}
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded text-sm">
                      {discountLabel}
                    </span>
                  </td>
                  <td className="p-3.5 text-muted-foreground text-xs">{targetLabel}</td>
                  <td className="p-3.5 text-xs text-muted-foreground">
                    <div>{new Date(p.start_date).toLocaleDateString("fr-FR")}</div>
                    <div>→ {new Date(p.end_date).toLocaleDateString("fr-FR")}</div>
                  </td>
                  <td className="p-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusCfg.badge}`}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={p.status === "DISABLED" ? "Réactiver" : "Désactiver"}
                        onClick={() => handleToggleStatus(p)}
                      >
                        {p.status === "DISABLED"
                          ? <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          : <ToggleRight className="h-4 w-4 text-primary" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-muted-foreground">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p>Aucune promotion ne correspond à votre recherche.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {editingPromo ? "Modifier la promotion" : "Créer une nouvelle promotion"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name + Description */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="promo-name">Nom de la promotion *</Label>
                <Input
                  id="promo-name"
                  placeholder="Ex: Promo Rentrée, Offre Ramadan, -15% Plomberie..."
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="promo-desc">Description (optionnelle)</Label>
                <Textarea
                  id="promo-desc"
                  rows={2}
                  placeholder="Description courte de la promotion..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            {/* Discount Type & Value */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type de réduction *</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm({ ...form, discount_type: v as "PERCENTAGE" | "FIXED_AMOUNT" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Pourcentage (%)</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">Montant fixe (FCFA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discount-value">
                  Valeur de la réduction * {form.discount_type === "PERCENTAGE" ? "(%)" : "(FCFA)"}
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  min={1}
                  max={form.discount_type === "PERCENTAGE" ? 100 : undefined}
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Target Type */}
            <div className="space-y-1.5">
              <Label>Cible de la promotion *</Label>
              <Select
                value={form.target_type}
                onValueChange={(v) => setForm({ ...form, target_type: v as PromotionForm["target_type"], category_id: "", selected_products: [] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_PRODUCTS">Tous les produits</SelectItem>
                  <SelectItem value="CATEGORY">Une catégorie entière</SelectItem>
                  <SelectItem value="SPECIFIC_PRODUCTS">Produits spécifiques</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category selector */}
            {form.target_type === "CATEGORY" && (
              <div className="space-y-1.5">
                <Label>Catégorie concernée *</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Choisir une catégorie..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Product multi-select */}
            {form.target_type === "SPECIFIC_PRODUCTS" && (
              <div className="space-y-2">
                <Label>Produits concernés * ({form.selected_products.length} sélectionné{form.selected_products.length > 1 ? "s" : ""})</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 text-sm h-9"
                    placeholder="Rechercher un produit..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-52 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {filteredProducts.map((prod) => {
                    const selected = form.selected_products.includes(prod.id);
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => toggleProductSelection(prod.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
                          selected ? "bg-primary/10" : "hover:bg-muted/40"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                          selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                        }`}>
                          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="flex-1 truncate">{prod.name}</span>
                        <span className="text-muted-foreground text-xs shrink-0">{formatFCFA(prod.price_fcfa)}</span>
                      </button>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground text-sm">Aucun produit trouvé.</p>
                  )}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start-date">Date de début *</Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date">Date de fin *</Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Statut initial</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as PromotionForm["status"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active (démarre immédiatement)</SelectItem>
                  <SelectItem value="DRAFT">Brouillon (non appliquée)</SelectItem>
                  <SelectItem value="DISABLED">Désactivée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            <div className="bg-muted/40 border border-border rounded-lg p-4 text-sm space-y-1">
              <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mb-2">Aperçu de la réduction</p>
              <p>
                Exemple : produit à <strong>{formatFCFA(100000)}</strong>
                {" "}→{" "}
                <strong className="text-destructive">
                  {form.discount_type === "PERCENTAGE"
                    ? `${formatFCFA(100000 - Math.round(100000 * form.discount_value / 100))} (-${form.discount_value}%)`
                    : `${formatFCFA(100000 - form.discount_value)} (-${formatFCFA(form.discount_value)})`}
                </strong>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={createPromotion.isPending || updatePromotion.isPending}
            >
              {createPromotion.isPending || updatePromotion.isPending
                ? "Enregistrement..."
                : editingPromo ? "Mettre à jour" : "Créer la promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPromotions;
