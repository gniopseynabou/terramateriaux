import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbDriver = Tables<"delivery_drivers">;

export const useDrivers = () => {
  return useQuery({
    queryKey: ["delivery_drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_drivers")
        .select("*")
        .order("first_name");
      if (error) throw error;
      return data as DbDriver[];
    },
  });
};

export const useActiveDrivers = () => {
  return useQuery({
    queryKey: ["delivery_drivers", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("is_active", true)
        .order("first_name");
      if (error) throw error;
      return data as DbDriver[];
    },
  });
};

export interface CreateDriverPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  main_zone?: string | null;
  status?: "DISPONIBLE" | "EN_LIVRAISON" | "INDISPONIBLE" | "DESACTIVE";
}

export const useCreateDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDriverPayload) => {
      const { data, error } = await supabase
        .from("delivery_drivers")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as DbDriver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_drivers"] });
    },
  });
};

export interface UpdateDriverPayload {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string | null;
  main_zone?: string | null;
  status?: "DISPONIBLE" | "EN_LIVRAISON" | "INDISPONIBLE" | "DESACTIVE";
  is_active?: boolean;
}

export const useUpdateDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateDriverPayload) => {
      const { data, error } = await supabase
        .from("delivery_drivers")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as DbDriver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_drivers"] });
    },
  });
};

export const useToggleDriverActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const status = is_active ? "DISPONIBLE" : "DESACTIVE";
      const { data, error } = await supabase
        .from("delivery_drivers")
        .update({ is_active, status })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as DbDriver;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_drivers"] });
    },
  });
};
