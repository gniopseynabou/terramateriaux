import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbProduct = Tables<"products"> & {
  categories?: Tables<"categories"> | null;
};

const EURO_RATE = 655.957;
export const fcfaToEuro = (fcfa: number) => (fcfa / EURO_RATE).toFixed(2);
export const formatFCFA = (amount: number) =>
  new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";

export const useProducts = (categorySlug?: string) => {
  return useQuery({
    queryKey: ["products", categorySlug],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(*)");

      if (categorySlug) {
        // First get category id from slug
        const { data: cat } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", categorySlug)
          .maybeSingle();
        if (cat) {
          query = query.eq("category_id", cat.id);
        } else {
          return [];
        }
      }

      const { data, error } = await query.order("reviews_count", { ascending: false });
      if (error) throw error;
      return data as DbProduct[];
    },
  });
};

export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(*)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as DbProduct | null;
    },
    enabled: !!slug,
  });
};
