import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Truck, Shield, CreditCard, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { getCategoryIcon } from "@/lib/categoryIcons";
import ProductCard from "@/components/ProductCard";
import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import heroImage from "@/assets/hero-materials.jpg?w=1280&format=webp";
import heroSrcSet from "@/assets/hero-materials.jpg?w=640;1024;1600;1920&format=webp&as=srcset";

const Index = () => {
  const { data: categories = [], isLoading: catLoading } = useCategories();
  const { data: products = [], isLoading: prodLoading } = useProducts();
  const popularProducts = products.slice(0, 6);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroImage}
          srcSet={heroSrcSet}
          sizes="100vw"
          alt="Dépôt de matériaux de construction T.M.I : ciment, fer à béton, carrelage et engrais"
          width={1920}
          height={1088}
          loading="eager"
          // @ts-expect-error - attribut fetchpriority non encore supporté officiellement par les types React
          fetchpriority="high"
          decoding="sync"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 via-secondary/80 to-primary/60" />
        <div className="container mx-auto px-4 py-10 sm:py-14 md:py-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto space-y-5 md:space-y-6 text-center flex flex-col items-center"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold text-primary-foreground leading-[1.1] text-balance text-center">
              Votre partenaire matériaux & commerce en Afrique
            </h1>
            <p className="text-primary-foreground/90 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed text-center mx-auto">
              Matériaux de construction, agriculture, électroménager et bien plus — des tarifs transparents
              en FCFA et une livraison fiable jusqu'à votre chantier.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center w-full pt-2">
              <Link to="/catalogue?mode=gros" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto min-h-12 font-heading font-semibold tmi-shadow">
                  Acheter en Gros <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/catalogue?mode=detail" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto min-h-12 font-heading font-semibold bg-primary-foreground/10 text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/20 hover:text-primary-foreground backdrop-blur-sm"
                >
                  Acheter en Détail <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-8">
          Nos Catégories
        </h2>
        {catLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat, i) => {
              const Icon = getCategoryIcon(cat.icon_name);
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                >
                  <Link
                    to={`/catalogue/${cat.slug}`}
                    className="flex flex-col items-center p-4 rounded-lg bg-card border border-border hover:border-primary hover:shadow-md transition-all text-center group"
                  >
                    <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs md:text-sm font-medium">{cat.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Popular Products */}
      <section className="bg-muted/50">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-heading font-bold">Produits Populaires</h2>
            <Link to="/catalogue">
              <Button variant="ghost" className="text-primary">
                Voir tout <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          {prodLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {popularProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Advantages */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-8">
          Pourquoi choisir T.M.I ?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Shield, title: "Qualité garantie", desc: "Produits certifiés et contrôlés" },
            { icon: Truck, title: "Livraison fiable", desc: "Partout au Sénégal et en Afrique" },
            { icon: CreditCard, title: "Paiement sécurisé", desc: "Wave, Orange Money, Carte bancaire" },
            { icon: Star, title: "Meilleurs prix", desc: "Tarifs compétitifs gros et détail" },
          ].map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="text-center p-6 rounded-lg bg-card border border-border"
            >
              <div className="w-14 h-14 rounded-full tmi-gradient-green flex items-center justify-center mx-auto mb-4">
                <a.icon className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="font-heading font-semibold mb-2">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Index;
