import type { Tables } from "@/integrations/supabase/types";

export type DbPromotion = Tables<"promotions">;
export type DbPromotionProduct = Tables<"promotion_products">;

export interface PromotionWithTargets extends DbPromotion {
  promotion_products?: { product_id: string }[];
  categories?: { name: string } | null;
}

export interface AppliedPromotionResult {
  promotion: DbPromotion;
  discountedPrice: number;
  discountAmount: number;
  savingsPercent: number;
  badgeLabel: string;
}

/**
 * Resolves the operational status of a promotion based on current date & raw status.
 */
export const getEffectivePromotionStatus = (promo: DbPromotion): string => {
  if (promo.status === "DISABLED" || promo.status === "DRAFT") {
    return promo.status;
  }
  const now = new Date();
  const start = new Date(promo.start_date);
  const end = new Date(promo.end_date);

  if (now < start) return "SCHEDULED";
  if (now > end) return "EXPIRED";
  return "ACTIVE";
};

/**
 * Checks if a promotion is currently active and within valid date range.
 */
export const isPromotionActive = (promo: DbPromotion): boolean => {
  return getEffectivePromotionStatus(promo) === "ACTIVE";
};

/**
 * Evaluate the best promotion for a specific product following priority rule:
 * Specific Product Promotion > Category Promotion > Global Promotion.
 */
export const getBestPromotionForProduct = (
  product: { id: string; price_fcfa: number; category_id?: string | null },
  promotions: PromotionWithTargets[]
): AppliedPromotionResult | null => {
  const activePromos = promotions.filter(isPromotionActive);

  if (activePromos.length === 0) return null;

  // Level 1: Specific product promotions
  const specificPromos = activePromos.filter(
    (p) =>
      p.target_type === "SPECIFIC_PRODUCTS" &&
      p.promotion_products?.some((pp) => pp.product_id === product.id)
  );

  // Level 2: Category promotions
  const categoryPromos = activePromos.filter(
    (p) =>
      p.target_type === "CATEGORY" &&
      product.category_id &&
      p.category_id === product.category_id
  );

  // Level 3: Global (All products) promotions
  const globalPromos = activePromos.filter((p) => p.target_type === "ALL_PRODUCTS");

  // Select candidates by highest priority tier first
  let candidates: PromotionWithTargets[] = [];
  if (specificPromos.length > 0) {
    candidates = specificPromos;
  } else if (categoryPromos.length > 0) {
    candidates = categoryPromos;
  } else if (globalPromos.length > 0) {
    candidates = globalPromos;
  }

  if (candidates.length === 0) return null;

  // Calculate discount for each candidate and select the max discount
  let bestResult: AppliedPromotionResult | null = null;
  const originalPrice = product.price_fcfa;

  for (const promo of candidates) {
    let discountAmount = 0;
    if (promo.discount_type === "PERCENTAGE") {
      discountAmount = Math.round((originalPrice * promo.discount_value) / 100);
    } else if (promo.discount_type === "FIXED_AMOUNT") {
      discountAmount = Math.min(originalPrice, promo.discount_value);
    }

    const discountedPrice = Math.max(0, originalPrice - discountAmount);
    const savingsPercent = originalPrice > 0 ? Math.round((discountAmount / originalPrice) * 100) : 0;
    const badgeLabel =
      promo.discount_type === "PERCENTAGE"
        ? `-${promo.discount_value}%`
        : `-${promo.discount_value.toLocaleString("fr-FR")} FCFA`;

    if (!bestResult || discountAmount > bestResult.discountAmount) {
      bestResult = {
        promotion: promo,
        discountedPrice,
        discountAmount,
        savingsPercent,
        badgeLabel,
      };
    }
  }

  return bestResult;
};

/**
 * Calculates item price after promotion or returns regular unit price.
 */
export const calculateProductPrice = (
  product: { id: string; price_fcfa: number; category_id?: string | null },
  promotions: PromotionWithTargets[]
): {
  originalPrice: number;
  finalPrice: number;
  appliedPromo: AppliedPromotionResult | null;
} => {
  const promoResult = getBestPromotionForProduct(product, promotions);
  if (!promoResult) {
    return {
      originalPrice: product.price_fcfa,
      finalPrice: product.price_fcfa,
      appliedPromo: null,
    };
  }
  return {
    originalPrice: product.price_fcfa,
    finalPrice: promoResult.discountedPrice,
    appliedPromo: promoResult,
  };
};
