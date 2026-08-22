import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Minus, Plus, ArrowLeft } from "lucide-react";
import AddToCartButton from "@/components/AddToCartButton";
import SmartImage from "@/components/SmartImage";
import { resolveProductImage } from "@/data/productImages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Layout from "@/components/Layout";
import { useProduct, formatFCFA, fcfaToEuro } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";

const ProductDetail = () => {
  const { slug } = useParams();
  const { data: product, isLoading } = useProduct(slug || "");
  const [qty, setQty] = useState(1);
  const [isGros, setIsGros] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Produit introuvable.</p>
          <Link to="/catalogue"><Button variant="ghost" className="mt-4">Retour au catalogue</Button></Link>
        </div>
      </Layout>
    );
  }

  const price = isGros ? product.price_gros : product.price_fcfa;
  const { src: imgSrc, srcSet: imgSrcSet } = resolveProductImage(product.slug, product.image_url);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10">
        <Link to="/catalogue" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour au catalogue
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <div className="space-y-3">
            <SmartImage
              src={imgSrc}
              srcSet={imgSrcSet}
              sizes="(max-width: 768px) 100vw, 600px"
              alt={product.name}
              priority
              wrapperClassName="aspect-square rounded-lg"
              className="w-full h-full object-cover"
            />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <SmartImage
                  key={i}
                  src={imgSrc}
                  srcSet={imgSrcSet}
                  sizes="120px"
                  alt={`${product.name} - vue ${i + 1}`}
                  wrapperClassName="aspect-square rounded-md border-2 border-transparent hover:border-primary cursor-pointer transition-colors"
                  className="w-full h-full object-cover"
                />
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold">{product.name}</h1>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span className="text-warning">{"★".repeat(Math.round(product.rating))}</span>
                <span>{product.rating}/5 ({product.reviews_count} avis)</span>
              </div>
            </div>

            <p className="text-muted-foreground">{product.description}</p>

            {/* Price toggle */}
            <div className="flex gap-2">
              <Button variant={!isGros ? "default" : "outline"} size="sm" onClick={() => { setIsGros(false); setQty(1); }}>
                Détail
              </Button>
              <Button
                variant={isGros ? "default" : "outline"}
                size="sm"
                onClick={() => { setIsGros(true); setQty(product.min_gros); }}
                className={isGros ? "tmi-gradient-green border-0" : ""}
              >
                Gros (min. {product.min_gros})
              </Button>
            </div>

            <div className="space-y-1">
              <div className="text-3xl font-heading font-bold text-primary">{formatFCFA(price)}</div>
              <div className="text-sm text-muted-foreground">≈ {fcfaToEuro(price)} €</div>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Quantité :</span>
              <div className="flex items-center border border-border rounded-md">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQty(Math.max(isGros ? product.min_gros : 1, qty - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{qty}</span>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQty(qty + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-lg font-heading font-bold">
              Total : {formatFCFA(price * qty)}
            </div>

            <AddToCartButton product={product} quantity={qty} isGros={isGros} size="lg" className="w-full" />

            {/* Reviews section */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-heading font-semibold text-lg">Avis clients</h3>
              <div className="space-y-3">
                {[
                  { name: "Mamadou D.", rating: 5, text: "Excellent produit, livraison rapide !" },
                  { name: "Fatou S.", rating: 4, text: "Bon rapport qualité-prix. Je recommande." },
                ].map((r, i) => (
                  <div key={i} className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{r.name}</span>
                      <span className="text-warning text-xs">{"★".repeat(r.rating)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.text}</p>
                  </div>
                ))}
              </div>
              <Textarea placeholder="Laissez votre avis..." className="mt-2" />
              <Button variant="outline" size="sm">Publier mon avis</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
