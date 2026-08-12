import { useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { Skeleton } from "@/components/ui/skeleton";

const Catalogue = () => {
  const { categorySlug } = useParams();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [stockFilter, setStockFilter] = useState("all");

  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading } = useProducts(categorySlug);

  const currentCategory = categories.find((c) => c.slug === categorySlug);

  const filtered = useMemo(() => {
    let result = [...products];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)
      );
    }

    if (stockFilter === "inStock") result = result.filter((p) => p.in_stock);

    if (sortBy === "price-asc") result.sort((a, b) => a.price_fcfa - b.price_fcfa);
    else if (sortBy === "price-desc") result.sort((a, b) => b.price_fcfa - a.price_fcfa);
    else result.sort((a, b) => b.reviews_count - a.reviews_count);

    return result;
  }, [products, search, sortBy, stockFilter]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-2">
          {currentCategory ? currentCategory.name : "Tous les produits"}
        </h1>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link to="/catalogue">
            <Button variant={!categorySlug ? "default" : "outline"} size="sm">Tous</Button>
          </Link>
          {categories.map((c) => (
            <Link key={c.id} to={`/catalogue/${c.slug}`}>
              <Button variant={categorySlug === c.slug ? "default" : "outline"} size="sm">{c.name}</Button>
            </Link>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Trier par" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Populaires</SelectItem>
              <SelectItem value="price-asc">Prix croissant</SelectItem>
              <SelectItem value="price-desc">Prix décroissant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Disponibilité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="inStock">En stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filtered.length} produit(s)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">Aucun produit trouvé.</div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Catalogue;
