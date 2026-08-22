import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CommunicationSettings = Tables<"communication_settings">;

export const useCommunicationSettings = () =>
  useQuery({
    queryKey: ["communication-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("communication_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CommunicationSettings | null;
    },
  });