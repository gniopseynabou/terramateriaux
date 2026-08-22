import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryIcon } from "@/lib/categoryIcons";

type Category = Tables<"categories">;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const AdminCategories = () => {
  const { data: categories = [] } = useCategories();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", icon_name: "" });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", icon_name: "" });
    setOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, description: c.description ?? "", icon_name: c.icon_name ?? "" });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        slug: (form.slug.trim() || slugify(form.name)),
        description: form.description.trim() || null,
        icon_name: form.icon_name.trim() || null,
      };
      if (!payload.name) throw new Error("Le nom est obligatoire.");
      if (editing) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(editing ? "Catégorie mise à jour" : "Catégorie créée");
      setOpen(false);
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie supprimée");
      setDeleting(null);
    },
    onError: (e: Error) => toast.error("Suppression impossible", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-muted-foreground">{categories.length} catégories</p>
        <Button className="min-h-11" onClick={openCreate}>+ Ajouter une catégorie</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => {
          const Icon = getCategoryIcon(c.icon_name);
          return (
            <div key={c.id} className="bg-card p-4 rounded-lg border border-border flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-full bg-accent flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm truncate">{c.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.description ?? "-"}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="outline" size="icon" className="h-10 w-10" aria-label={`Modifier ${c.name}`} onClick={() => openEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10 text-destructive" aria-label={`Supprimer ${c.name}`} onClick={() => setDeleting(c)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nom</Label>
              <Input id="cat-name" className="h-11" maxLength={80} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">Identifiant URL (laisser vide pour générer)</Label>
              <Input id="cat-slug" className="h-11" maxLength={80} value={form.slug}
                placeholder={slugify(form.name)}
                onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-icon">Icône (ex. hammer, tractor, shirt)</Label>
              <Input id="cat-icon" className="h-11" maxLength={40} value={form.icon_name}
                onChange={(e) => setForm({ ...form, icon_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea id="cat-desc" rows={3} maxLength={300} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="min-h-11" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer « {deleting?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les produits rattachés à cette catégorie ne seront plus classés. Action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground"
              onClick={() => deleting && remove.mutate(deleting.id)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCategories;
