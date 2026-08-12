import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbDeliveryZone = Tables<"delivery_zones">;

export const useDeliveryZones = () => {
  return useQuery({
    queryKey: ["delivery_zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_zones")
        .select("*")
        .order("region")
        .order("city");
      if (error) throw error;
      return data as DbDeliveryZone[];
    },
  });
};
