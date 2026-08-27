import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useCart } from "@/contexts/CartContext";
import { formatFCFA, fcfaToEuro } from "@/hooks/useProducts";
import { resolveProductImage } from "@/data/productImages";
import SmartImage from "@/components/SmartImage";
import { useActivePromotions } from "@/hooks/usePromotions";
import { getBestPromotionForProduct } from "@/lib/promotions";

const Cart = () => {
  const { items, updateQuantity, removeItem, rawSubtotal, discountTotal, subtotal, totalItems } = useCart();
  const { data: promotions = [] } = useActivePromotions();

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/40 mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Votre panier est vide</h1>
          <p className="text-muted-foreground">Ajoutez des produits pour commencer vos achats.</p>
          <Link to="/catalogue"><Button>Parcourir le catalogue</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-6">
          Panier ({totalItems} article{totalItems > 1 ? "s" : ""})
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const promo = !item.isGros ? getBestPromotionForProduct(item.product, promotions) : null;
              const unitPrice = item.isGros ? item.product.price_gros : (promo ? promo.discountedPrice : item.product.price_fcfa);
              const originalUnitPrice = item.isGros ? item.product.price_gros : item.product.price_fcfa;
              const { src: imgSrc, srcSet: imgSrcSet } = resolveProductImage(item.product.slug, item.product.image_url);

              return (
                <div key={item.product.id} className="flex gap-4 bg-card p-4 rounded-lg border border-border">
                  <SmartImage
                    src={imgSrc}
                    srcSet={imgSrcSet}
                    sizes="80px"
                    alt={item.product.name}
                    wrapperClassName="w-20 h-20 rounded-md flex-shrink-0"
                    className="w-full h-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <Link to={`/produit/${item.product.slug}`}>
                      <h3 className="font-medium text-sm line-clamp-1 hover:text-primary">{item.product.name}</h3>
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-0.5">
                      <span>{item.isGros ? "Achat en gros" : "Détail"}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">{formatFCFA(unitPrice)} / unité</span>
                      {promo && (
                        <span className="text-destructive font-bold flex items-center gap-0.5 bg-destructive/10 px-1.5 py-0.5 rounded text-[11px]">
                          <Tag className="h-3 w-3" /> {promo.badgeLabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive ml-auto" onClick={() => removeItem(item.product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-start">
                    <span className="font-heading font-bold text-sm text-primary">
                      {formatFCFA(unitPrice * item.quantity)}
                    </span>
                    {promo && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatFCFA(originalUnitPrice * item.quantity)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-card p-6 rounded-lg border border-border h-fit sticky top-20">
            <h3 className="font-heading font-semibold text-lg mb-4">Résumé</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total bruts</span>
                <span>{formatFCFA(rawSubtotal)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-destructive font-medium">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> Réduction promotion
                  </span>
                  <span>-{formatFCFA(discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
                <span>Sous-total produits</span>
                <span>{formatFCFA(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>≈</span>
                <span>{fcfaToEuro(subtotal)} €</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Livraison</span>
                <span className="text-xs text-muted-foreground italic">Calculée à l'étape suivante</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
              Les frais de livraison sont calculés automatiquement en fonction de votre zone géographique.
            </p>
            <div className="border-t border-border mt-4 pt-4">
              <Link to="/livraison">
                <Button className="w-full" size="lg">
                  Continuer <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
