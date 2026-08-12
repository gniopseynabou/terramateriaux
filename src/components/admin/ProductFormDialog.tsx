import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import type { DbCategory } from "@/hooks/useCategories";

type DbProduct = Tables<"products">;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: DbProduct | null;
  categories: DbCategory[];
  onSubmit: (data: ProductFormData) => void;
  isLoading?: boolean;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price_fcfa: number;
  price_gros: number;
  min_gros: number;
  category_id: string | null;
  in_stock: boolean;
  image_url: string;
}

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const ProductFormDialog = ({ open, onOpenChange, product, categories, onSubmit, isLoading }: ProductFormDialogProps) => {
  const [form, setForm] = useState<ProductFormData>({
    name: "",
    slug: "",
    description: "",
    price_fcfa: 0,
    price_gros: 0,
    min_gros: 1,
    category_id: null,
    in_stock: true,
    image_url: "",
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        price_fcfa: product.price_fcfa,
        price_gros: product.price_gros,
        min_gros: product.min_gros,
        category_id: product.category_id,
        in_stock: product.in_stock,
        image_url: product.image_url || "",
      });
    } else {
      setForm({
        name: "",
        slug: "",
        description: "",
        price_fcfa: 0,
        price_gros: 0,
        min_gros: 1,
        category_id: null,
        in_stock: true,
        image_url: "",
      });
    }
  }, [product, open]);

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: product ? f.slug : generateSlug(name),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" value={form.name} onChange={(e) => handleNameChange(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="price_fcfa">Prix détail (FCFA) *</Label>
              <Input id="price_fcfa" type="number" min={0} value={form.price_fcfa} onChange={(e) => setForm((f) => ({ ...f, price_fcfa: Number(e.target.value) }))} required />
            </div>
            <div>
              <Label htmlFor="price_gros">Prix gros (FCFA) *</Label>
              <Input id="price_gros" type="number" min={0} value={form.price_gros} onChange={(e) => setForm((f) => ({ ...f, price_gros: Number(e.target.value) }))} required />
            </div>
          </div>
          <div>
            <Label htmlFor="min_gros">Quantité min. gros</Label>
            <Input id="min_gros" type="number" min={1} value={form.min_gros} onChange={(e) => setForm((f) => ({ ...f, min_gros: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? null : v }))}>
              <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="image_url">URL de l'image</Label>
            <Input id="image_url" value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="in_stock" checked={form.in_stock} onCheckedChange={(v) => setForm((f) => ({ ...f, in_stock: v }))} />
            <Label htmlFor="in_stock">En stock</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>{product ? "Enregistrer" : "Créer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
