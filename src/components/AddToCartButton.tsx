import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import type { Tables } from "@/integrations/supabase/types";

type DbProduct = Tables<"products">;

interface Props {
  product: DbProduct;
  quantity?: number;
  isGros?: boolean;
  size?: "sm" | "lg" | "default";
  className?: string;
}

/**
 * Smart add-to-cart button.
 * States: Ajouter au panier → Ajout en cours… → ✓ Déjà dans le panier (clic = ouvre le panier).
 */
const AddToCartButton = ({ product, quantity = 1, isGros = false, size = "default", className }: Props) => {
  const { addItem, isInCart } = useCart();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const inCart = isInCart(product.id);

  if (!product.in_stock) {
    return (
      <Button size={size} className={className} disabled variant="secondary">
        Produit indisponible
      </Button>
    );
  }

  if (inCart) {
    return (
      <Button
        size={size}
        className={className}
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          navigate("/panier");
        }}
      >
        <Check className="h-4 w-4 mr-1.5 text-success" /> Déjà dans le panier
      </Button>
    );
  }

  const handleAdd = async () => {
    setAdding(true);
    addItem(product, quantity, isGros);
    toast.success("Produit ajouté au panier avec succès.", {
      description: product.name,
      action: { label: "Voir le panier", onClick: () => navigate("/panier") },
    });
    window.setTimeout(() => setAdding(false), 300);
  };

  return (
    <Button size={size} className={className} disabled={adding} onClick={handleAdd}>
      {adding ? (
        <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Ajout en cours...</>
      ) : (
        <><ShoppingCart className="h-4 w-4 mr-1.5" /> Ajouter au panier</>
      )}
    </Button>
  );
};

export default AddToCartButton;