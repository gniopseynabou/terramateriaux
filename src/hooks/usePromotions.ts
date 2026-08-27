import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { PromotionWithTargets } from "@/lib/promotions";

export type DbPromotion = Tables<"promotions">;

export const usePromotions = () => {
  return useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select(`
          *,
          categories (name),
          promotion_products (product_id)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PromotionWithTargets[];
    },
  });
};

export const useActivePromotions = () => {
  return useQuery({
    queryKey: ["promotions", "active"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("promotions")
        .select(`
          *,
          categories (name),
          promotion_products (product_id)
        `)
        .eq("status", "ACTIVE")
        .lte("start_date", now)
        .gte("end_date", now);

      if (error) throw error;
      return data as PromotionWithTargets[];
    },
  });
};

export interface CreatePromotionPayload {
  name: string;
  description?: string | null;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT";
  discount_value: number;
  target_type: "ALL_PRODUCTS" | "CATEGORY" | "SPECIFIC_PRODUCTS";
  category_id?: string | null;
  start_date: string;
  end_date: string;
  status?: "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "DISABLED";
  product_ids?: string[];
}

export const useCreatePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ product_ids, ...payload }: CreatePromotionPayload) => {
      const { data: promo, error: promoErr } = await supabase
        .from("promotions")
        .insert(payload)
        .select()
        .single();

      if (promoErr) throw promoErr;

      if (payload.target_type === "SPECIFIC_PRODUCTS" && product_ids && product_ids.length > 0) {
        const rows = product_ids.map((pid) => ({
          promotion_id: promo.id,
          product_id: pid,
        }));
        const { error: prodErr } = await supabase
          .from("promotion_products")
          .insert(rows);
        if (prodErr) throw prodErr;
      }

      return promo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export interface UpdatePromotionPayload extends Partial<CreatePromotionPayload> {
  id: string;
}

export const useUpdatePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, product_ids, ...payload }: UpdatePromotionPayload) => {
      const { data: promo, error: promoErr } = await supabase
        .from("promotions")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (promoErr) throw promoErr;

      if (payload.target_type === "SPECIFIC_PRODUCTS" && product_ids !== undefined) {
        // Delete previous associations
        await supabase.from("promotion_products").delete().eq("promotion_id", id);

        if (product_ids.length > 0) {
          const rows = product_ids.map((pid) => ({
            promotion_id: id,
            product_id: pid,
          }));
          const { error: prodErr } = await supabase
            .from("promotion_products")
            .insert(rows);
          if (prodErr) throw prodErr;
        }
      }

      return promo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDeletePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
