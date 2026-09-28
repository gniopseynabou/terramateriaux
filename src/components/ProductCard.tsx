import { Link } from "react-router-dom";
import AddToCartButton from "@/components/AddToCartButton";
import SmartImage from "@/components/SmartImage";
import { formatFCFA, fcfaToEuro } from "@/hooks/useProducts";
import { resolveProductImage } from "@/data/productImages";
import type { Tables } from "@/integrations/supabase/types";
import { useActivePromotions } from "@/hooks/usePromotions";
import { getBestPromotionForProduct } from "@/lib/promotions";
import { Tag } from "lucide-react";

type DbProduct = Tables<"products">;

const ProductCard = ({ product, priority = false }: { product: DbProduct; priority?: boolean }) => {
  const { src, srcSet } = resolveProductImage(product.slug, product.image_url);
  const { data: promotions = [] } = useActivePromotions();
  const promoResult = getBestPromotionForProduct(product, promotions);

  const finalPrice = promoResult ? promoResult.discountedPrice : product.price_fcfa;

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group relative flex flex-col h-full">
      {/* Image */}
      <div className="aspect-square bg-muted relative overflow-hidden flex-shrink-0">
        <SmartImage
          src={src}
          srcSet={srcSet}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
          alt={product.name}
          priority={priority}
          wrapperClassName="w-full h-full"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {promoResult && (
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            <span className="bg-destructive text-destructive-foreground font-bold text-xs px-2 py-0.5 rounded-md shadow-sm flex items-center gap-1">
              <Tag className="h-3 w-3" aria-hidden="true" /> PROMO {promoResult.badgeLabel}
            </span>
          </div>
        )}

        {!product.in_stock && (
          <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
            <span className="bg-destructive text-destructive-foreground px-3 py-1 rounded text-xs font-semibold">
              Rupture de stock
            </span>
          </div>
        )}
      </div>

      {/* Contenu — flex-col + justify-between pour aligner le bas (prix + bouton) */}
      <div className="p-3 flex flex-col flex-1 justify-between gap-3">
        {/* Titre */}
        <Link
          to={`/produit/${product.slug}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          <h3 className="font-heading font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Bas de carte : Prix + Bouton panier alignés en bas */}
        <div className="mt-auto space-y-2 pt-1">
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-heading font-bold text-primary text-base">
                {formatFCFA(finalPrice)}
              </span>
              {promoResult && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatFCFA(product.price_fcfa)}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              ≈ {fcfaToEuro(finalPrice)} €
            </div>
            <div className="text-xs text-secondary font-medium">
              Gros : {formatFCFA(product.price_gros)} (min. {product.min_gros})
            </div>
          </div>

          <div>
            <AddToCartButton product={product} size="sm" className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

