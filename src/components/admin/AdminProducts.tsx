import { useState } from "react";
import { Package, Pencil, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, formatFCFA } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import ProductFormDialog, { type ProductFormData } from "./ProductFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";

type DbProduct = Tables<"products">;

const AdminProducts = () => {
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<DbProduct | null>(null);

  const upsertMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: ProductFormData }) => {
      const payload = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        price_fcfa: data.price_fcfa,
        price_gros: data.price_gros,
        min_gros: data.min_gros,
        category_id: data.category_id,
        in_stock: data.in_stock,
        image_url: data.image_url || null,
      };
      if (id) {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: variables.id ? "Produit mis à jour" : "Produit créé" });
      setFormOpen(false);
      setEditingProduct(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produit supprimé" });
      setDeletingProduct(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const openCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEdit = (p: DbProduct) => {
    setEditingProduct(p);
    setFormOpen(true);
  };

  const handleSubmit = (data: ProductFormData) => {
    upsertMutation.mutate({ id: editingProduct?.id, data });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{products.length} produits</p>
        <Button size="sm" onClick={openCreate}>+ Ajouter un produit</Button>
      </div>
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="p-3 font-medium text-muted-foreground">Produit</th>
              <th className="p-3 font-medium text-muted-foreground">Prix détail</th>
              <th className="p-3 font-medium text-muted-foreground">Prix gros</th>
              <th className="p-3 font-medium text-muted-foreground">Stock</th>
              <th className="p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{formatFCFA(p.price_fcfa)}</td>
                <td className="p-3">{formatFCFA(p.price_gros)}</td>
                <td className="p-3">
                  {p.in_stock ? (
                    <span className="text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> En stock</span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Rupture</span>
                  )}
                </td>
                <td className="p-3 flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingProduct(p)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        categories={categories}
        onSubmit={handleSubmit}
        isLoading={upsertMutation.isPending}
      />

      <AlertDialog open={!!deletingProduct} onOpenChange={(o) => !o && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deletingProduct?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProducts;
