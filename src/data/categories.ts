import { Building2, Zap, Droplets, Wrench, Wheat, UtensilsCrossed, Shirt, Sparkles, Tv } from "lucide-react";

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: any;
  description: string;
  image: string;
}

export const categories: Category[] = [
  { id: "1", name: "Matériaux de construction", slug: "materiaux-construction", icon: Building2, description: "Ciment, fer, briques, sable et plus", image: "" },
  { id: "2", name: "Électricité", slug: "electricite", icon: Zap, description: "Câbles, interrupteurs, tableaux électriques", image: "" },
  { id: "3", name: "Plomberie", slug: "plomberie", icon: Droplets, description: "Tuyaux, robinets, sanitaires", image: "" },
  { id: "4", name: "Pièces détachées", slug: "pieces-detachees", icon: Wrench, description: "Pièces auto, moto et machines", image: "" },
  { id: "5", name: "Agriculture", slug: "agriculture", icon: Wheat, description: "Semences, engrais, outillage agricole", image: "" },
  { id: "6", name: "Agro-alimentaire", slug: "agro-alimentaire", icon: UtensilsCrossed, description: "Produits alimentaires en gros et détail", image: "" },
  { id: "7", name: "Vêtements", slug: "vetements", icon: Shirt, description: "Mode homme, femme et enfant", image: "" },
  { id: "8", name: "Beauté", slug: "beaute", icon: Sparkles, description: "Cosmétiques, soins, parfums", image: "" },
  { id: "9", name: "Électroménager", slug: "electromenager", icon: Tv, description: "Appareils et accessoires pour la maison", image: "" },
];
