export interface Product {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  priceFCFA: number;
  priceGros: number;
  minGros: number;
  images: string[];
  inStock: boolean;
  rating: number;
  reviews: number;
}

const EURO_RATE = 655.957;

export const fcfaToEuro = (fcfa: number) => (fcfa / EURO_RATE).toFixed(2);

export const formatFCFA = (amount: number) =>
  new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

export const products: Product[] = [
  {
    id: "1", name: "Ciment CEM II 42.5 (50kg)", slug: "ciment-cem-ii", categorySlug: "materiaux-construction",
    description: "Sac de ciment haute résistance, idéal pour les constructions durables. Qualité certifiée, adapté aux conditions climatiques africaines.",
    priceFCFA: 5500, priceGros: 4800, minGros: 50, images: [], inStock: true, rating: 4.8, reviews: 124,
  },
  {
    id: "2", name: "Fer à béton Ø12mm (barre 12m)", slug: "fer-beton-12mm", categorySlug: "materiaux-construction",
    description: "Barre de fer à béton de haute qualité pour armature. Résistance optimale pour fondations et dalles.",
    priceFCFA: 4200, priceGros: 3600, minGros: 100, images: [], inStock: true, rating: 4.6, reviews: 89,
  },
  {
    id: "3", name: "Câble électrique 2.5mm² (100m)", slug: "cable-electrique-2-5mm", categorySlug: "electricite",
    description: "Câble électrique rigide en cuivre, norme NF. Parfait pour installations résidentielles et commerciales.",
    priceFCFA: 35000, priceGros: 30000, minGros: 10, images: [], inStock: true, rating: 4.7, reviews: 56,
  },
  {
    id: "4", name: "Robinet mitigeur chromé", slug: "robinet-mitigeur", categorySlug: "plomberie",
    description: "Robinet mitigeur en laiton chromé, finition brillante. Installation facile, garantie 2 ans.",
    priceFCFA: 18000, priceGros: 14500, minGros: 20, images: [], inStock: true, rating: 4.5, reviews: 34,
  },
  {
    id: "5", name: "Filtre à huile universel", slug: "filtre-huile", categorySlug: "pieces-detachees",
    description: "Filtre à huile compatible avec la plupart des véhicules. Haute capacité de filtration.",
    priceFCFA: 3500, priceGros: 2800, minGros: 30, images: [], inStock: true, rating: 4.4, reviews: 67,
  },
  {
    id: "6", name: "Semences de maïs (5kg)", slug: "semences-mais", categorySlug: "agriculture",
    description: "Semences certifiées, haut rendement. Adaptées au climat sahélien.",
    priceFCFA: 12000, priceGros: 9500, minGros: 20, images: [], inStock: true, rating: 4.9, reviews: 45,
  },
  {
    id: "7", name: "Huile d'arachide (20L)", slug: "huile-arachide", categorySlug: "agro-alimentaire",
    description: "Huile d'arachide pure, première pression. Qualité premium pour usage domestique et professionnel.",
    priceFCFA: 25000, priceGros: 21000, minGros: 10, images: [], inStock: true, rating: 4.7, reviews: 78,
  },
  {
    id: "8", name: "Boubou brodé homme", slug: "boubou-brode", categorySlug: "vetements",
    description: "Boubou traditionnel en bazin riche, broderie fine. Élégance et confort pour toutes les occasions.",
    priceFCFA: 35000, priceGros: 28000, minGros: 10, images: [], inStock: true, rating: 4.8, reviews: 92,
  },
  {
    id: "9", name: "Crème éclaircissante naturelle", slug: "creme-eclaircissante", categorySlug: "beaute",
    description: "Crème à base d'ingrédients naturels. Sans hydroquinone. Résultat visible en 2 semaines.",
    priceFCFA: 8500, priceGros: 6500, minGros: 24, images: [], inStock: true, rating: 4.3, reviews: 156,
  },
  {
    id: "10", name: "Ventilateur sur pied 18\"", slug: "ventilateur-pied", categorySlug: "electromenager",
    description: "Ventilateur 3 vitesses, oscillation 90°. Silencieux et puissant. Idéal pour les grandes pièces.",
    priceFCFA: 22000, priceGros: 18000, minGros: 10, images: [], inStock: true, rating: 4.6, reviews: 43,
  },
  {
    id: "11", name: "Briques creuses 15x20x40", slug: "briques-creuses", categorySlug: "materiaux-construction",
    description: "Briques creuses de qualité supérieure. Résistantes et légères pour murs porteurs et cloisons.",
    priceFCFA: 350, priceGros: 280, minGros: 500, images: [], inStock: true, rating: 4.5, reviews: 67,
  },
  {
    id: "12", name: "Disjoncteur 20A", slug: "disjoncteur-20a", categorySlug: "electricite",
    description: "Disjoncteur modulaire 20 ampères. Protection fiable pour circuits électriques résidentiels.",
    priceFCFA: 8500, priceGros: 7000, minGros: 20, images: [], inStock: false, rating: 4.7, reviews: 38,
  },
];
