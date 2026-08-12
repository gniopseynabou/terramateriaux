import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export const useProfile = (userId?: string) =>
  useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

export const useUpdateProfile = (userId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Profile>) => {
      if (!userId) throw new Error("Non connecté");
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from("profiles").update(values).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({ ...values, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });
};
