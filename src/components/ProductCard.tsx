import { Link } from "react-router-dom";
import AddToCartButton from "@/components/AddToCartButton";
import SmartImage from "@/components/SmartImage";
import { formatFCFA, fcfaToEuro } from "@/hooks/useProducts";
import { resolveProductImage } from "@/data/productImages";
import type { Tables } from "@/integrations/supabase/types";

type DbProduct = Tables<"products">;

const ProductCard = ({ product, priority = false }: { product: DbProduct; priority?: boolean }) => {
  const { src, srcSet } = resolveProductImage(product.slug, product.image_url);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="aspect-square bg-muted relative overflow-hidden">
        <SmartImage
          src={src}
          srcSet={srcSet}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
          alt={product.name}
          priority={priority}
          wrapperClassName="w-full h-full"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {!product.in_stock && (
          <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-xs font-semibold">
              Rupture de stock
            </span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <Link to={`/produit/${product.slug}`}>
          <h3 className="font-heading font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-primary">{formatFCFA(product.price_fcfa)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            ≈ {fcfaToEuro(product.price_fcfa)} €
          </div>
          <div className="text-xs text-success font-medium">
            Gros : {formatFCFA(product.price_gros)} (min. {product.min_gros})
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {"★".repeat(Math.round(product.rating))} ({product.reviews_count} avis)
        </div>
        <AddToCartButton product={product} size="sm" className="w-full mt-2" />
      </div>
    </div>
  );
};

export default ProductCard;
