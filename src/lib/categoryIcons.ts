import { Building2, Zap, Droplets, Wrench, Wheat, UtensilsCrossed, Shirt, Sparkles, Tv, LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Building2,
  Zap,
  Droplets,
  Wrench,
  Wheat,
  UtensilsCrossed,
  Shirt,
  Sparkles,
  Tv,
};

export const getCategoryIcon = (iconName: string | null): LucideIcon => {
  if (!iconName || !iconMap[iconName]) return Building2;
  return iconMap[iconName];
};
