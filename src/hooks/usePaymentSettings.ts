import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PaymentSetting = Tables<"payment_settings">;

export const usePaymentSettings = (activeOnly = true) =>
  useQuery({
    queryKey: ["payment-settings", activeOnly],
    queryFn: async () => {
      let query = supabase.from("payment_settings").select("*").order("sort_order");
      if (activeOnly) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentSetting[];
    },
  });