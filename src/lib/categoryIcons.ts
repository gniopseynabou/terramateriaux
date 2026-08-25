import {
  Building2, Zap, Droplets, Wrench, Wheat, UtensilsCrossed, Shirt, Sparkles, Tv,
  Hammer, Truck, Paintbrush, HardHat, Ruler, Sun, Flame, Boxes, ShieldCheck,
  Lightbulb, ShoppingBag, Layers, Scissors, Key, Compass, type LucideIcon
} from "lucide-react";

export interface CategoryIconOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const AVAILABLE_CATEGORY_ICONS: CategoryIconOption[] = [
  { id: "Building2", label: "Bâtiment & Construction", icon: Building2 },
  { id: "Hammer", label: "Outillage & Marteau", icon: Hammer },
  { id: "Wrench", label: "Bricolage & Clé", icon: Wrench },
  { id: "Zap", label: "Électricité & Énergie", icon: Zap },
  { id: "Droplets", label: "Plomberie & Eau", icon: Droplets },
  { id: "Wheat", label: "Agriculture & Élevage", icon: Wheat },
  { id: "HardHat", label: "Équipement de chantier", icon: HardHat },
  { id: "Paintbrush", label: "Peinture & Finition", icon: Paintbrush },
  { id: "Truck", label: "Transport & Matériaux lourds", icon: Truck },
  { id: "Sun", label: "Énergie Solaire", icon: Sun },
  { id: "Flame", label: "Gaz & Chauffage", icon: Flame },
  { id: "Boxes", label: "Stockage & Quincaillerie", icon: Boxes },
  { id: "Lightbulb", label: "Éclairage & Lampes", icon: Lightbulb },
  { id: "Ruler", label: "Mesure & Arpentage", icon: Ruler },
  { id: "ShieldCheck", label: "Sécurité & Protection", icon: ShieldCheck },
  { id: "Layers", label: "Revêtements & Sols", icon: Layers },
  { id: "ShoppingBag", label: "Produits divers", icon: ShoppingBag },
  { id: "Sparkles", label: "Nouveautés & Offres", icon: Sparkles },
  { id: "Tv", label: "High-Tech & Électronique", icon: Tv },
  { id: "UtensilsCrossed", label: "Alimentation / Restauration", icon: UtensilsCrossed },
  { id: "Shirt", label: "Vêtements & Protection", icon: Shirt },
];

const iconMap: Record<string, LucideIcon> = AVAILABLE_CATEGORY_ICONS.reduce((acc, curr) => {
  acc[curr.id] = curr.icon;
  return acc;
}, {} as Record<string, LucideIcon>);

export const getCategoryIcon = (iconName: string | null): LucideIcon => {
  if (!iconName || !iconMap[iconName]) return Building2;
  return iconMap[iconName];
};
