import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Image as ImageIcon, Trash2, Loader2, CheckCircle, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface FormState {
  name: string;
  slug: string;
  description: string;
  price_fcfa: string;
  price_gros: string;
  min_gros: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    description: "",
    price_fcfa: "",
    price_gros: "",
    min_gros: "1",
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
        price_fcfa: product.price_fcfa ? String(product.price_fcfa) : "",
        price_gros: product.price_gros ? String(product.price_gros) : "",
        min_gros: product.min_gros ? String(product.min_gros) : "1",
        category_id: product.category_id,
        in_stock: product.in_stock,
        image_url: product.image_url || "",
      });
    } else {
      setForm({
        name: "",
        slug: "",
        description: "",
        price_fcfa: "",
        price_gros: "",
        min_gros: "1",
        category_id: null,
        in_stock: true,
        image_url: "",
      });
    }
    setUploading(false);
    setShowUrlInput(false);
  }, [product, open]);

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: product ? f.slug : generateSlug(name),
    }));
  };

  // Téléversement d'image produit
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP, etc.).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (maximum 10 Mo).");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrlPromise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const localDataUrl = await dataUrlPromise;

      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      let uploadedUrl = localDataUrl;

      const { error: uploadErr } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, file, { upsert: true });

      if (!uploadErr) {
        const { data: signed } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);
        if (signed?.signedUrl) {
          uploadedUrl = signed.signedUrl;
        }
      }

      setForm((f) => ({ ...f, image_url: uploadedUrl }));
      toast.success("Photo ajoutée avec succès !");
    } catch (err: any) {
      toast.error("Erreur lors de l'ajout de l'image : " + (err.message || "Erreur inconnue"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setForm((f) => ({ ...f, image_url: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPriceFcfa = Number(form.price_fcfa.replace(/[^0-9.]/g, "")) || 0;
    const cleanPriceGros = Number(form.price_gros.replace(/[^0-9.]/g, "")) || 0;
    const cleanMinGros = Number(form.min_gros.replace(/[^0-9]/g, "")) || 1;

    onSubmit({
      name: form.name,
      slug: form.slug,
      description: form.description,
      price_fcfa: cleanPriceFcfa,
      price_gros: cleanPriceGros,
      min_gros: cleanMinGros,
      category_id: form.category_id,
      in_stock: form.in_stock,
      image_url: form.image_url,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold">
            {product ? "Modifier le produit" : "Ajouter un produit"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom du produit *</Label>
            <Input
              id="name"
              className="h-11"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="ex. Ciment Dangote 50kg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                className="h-11 font-mono text-xs"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select
                value={form.category_id || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? null : v }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune catégorie</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Description détaillée du produit..."
            />
          </div>

          {/* ── Saisie directe des prix sans compteur/flèches ── */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="price_fcfa">Prix détail (FCFA) *</Label>
              <Input
                id="price_fcfa"
                type="text"
                inputMode="numeric"
                className="h-11 font-semibold text-base"
                value={form.price_fcfa}
                onChange={(e) => setForm((f) => ({ ...f, price_fcfa: e.target.value }))}
                placeholder="ex. 15000"
                required
              />
            </div>
            <div>
              <Label htmlFor="price_gros">Prix gros (FCFA) *</Label>
              <Input
                id="price_gros"
                type="text"
                inputMode="numeric"
                className="h-11 font-semibold text-base"
                value={form.price_gros}
                onChange={(e) => setForm((f) => ({ ...f, price_gros: e.target.value }))}
                placeholder="ex. 12000"
                required
              />
            </div>
            <div>
              <Label htmlFor="min_gros">Min. gros</Label>
              <Input
                id="min_gros"
                type="text"
                inputMode="numeric"
                className="h-11 text-base"
                value={form.min_gros}
                onChange={(e) => setForm((f) => ({ ...f, min_gros: e.target.value }))}
                placeholder="1"
              />
            </div>
          </div>

          {/* ── Section Photo du produit ── */}
          <div className="space-y-2 border border-border p-3.5 rounded-lg bg-card">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <ImageIcon className="h-4 w-4 text-primary" />
              Photo du produit
            </Label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {form.image_url ? (
              <div className="relative group rounded-md overflow-hidden border border-border bg-muted/40 p-2 flex items-center gap-3">
                <img
                  src={form.image_url}
                  alt="Aperçu du produit"
                  className="h-16 w-16 object-cover rounded-md border border-border bg-background shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-success flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Photo configurée
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-full">
                    {form.image_url.startsWith("data:") ? "Image locale chargée" : form.image_url}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-2.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    Changer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:bg-destructive/10"
                    onClick={handleRemoveImage}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors text-center space-y-2">
                {uploading ? (
                  <div className="py-2 flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Chargement de la photo depuis vos dossiers...</p>
                  </div>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Ajouter une photo depuis vos dossiers</p>
                      <p className="text-xs text-muted-foreground">Formats acceptés : JPG, PNG, WEBP (max 10 Mo)</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1 gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" /> Parcourir mes dossiers
                    </Button>
                  </>
                )}
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setShowUrlInput(!showUrlInput)}
              >
                {showUrlInput ? "Masquer la saisie par URL externe" : "Ou saisir une URL d'image externe..."}
              </button>
              {showUrlInput && (
                <div className="mt-2 space-y-1">
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://exemple.com/image.jpg"
                    className="h-9 text-xs font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Switch
              id="in_stock"
              checked={form.in_stock}
              onCheckedChange={(v) => setForm((f) => ({ ...f, in_stock: v }))}
            />
            <Label htmlFor="in_stock" className="font-medium cursor-pointer">
              Produit disponible en stock
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" className="min-h-10" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="min-h-10" disabled={isLoading || uploading}>
              {isLoading ? "Enregistrement..." : product ? "Enregistrer les modifications" : "Créer le produit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
