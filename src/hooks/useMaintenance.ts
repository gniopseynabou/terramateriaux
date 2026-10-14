import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceSettings {
  id: string;
  is_enabled: boolean;
  title: string;
  message: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  enabled_by: string | null;
  enabled_by_email: string | null;
  updated_at: string;
}

/**
 * Hook de consultation du statut global de maintenance.
 * Utilise un polling léger (30 s) plutôt qu'un WebSocket dédié afin
 * d'éviter les collisions de channels Realtime lorsque le hook est
 * consommé par plusieurs composants simultanément.
 */
export const useMaintenanceStatus = () =>
  useQuery({
    queryKey: ["maintenance-settings"],
    queryFn: async (): Promise<MaintenanceSettings | null> => {
      const { data, error } = await supabase
        .from("maintenance_settings" as never)
        .select("*")
        .maybeSingle();

      if (error) {
        // Table absente (migration non appliquée) ou erreur réseau :
        // on ne bloque JAMAIS l'application sur cette erreur.
        if (
          error.code === "PGRST116" ||
          error.code === "42P01" ||
          error.message?.includes("does not exist") ||
          error.message?.includes("schema cache")
        ) {
          return null;
        }
        console.warn("Statut de maintenance indisponible :", error.message);
        return null;
      }

      return data as MaintenanceSettings | null;
    },
    // Polling toutes les 30 secondes — suffisant pour un état de maintenance
    // qui ne change que sur intervention volontaire du Super-Admin.
    refetchInterval: 30 * 1000,
    // En cas d'erreur, ne pas logger dans la console React Query
    throwOnError: false,
  });

/**
 * Hook de bascule du mode maintenance (réservé au Super-Admin).
 * La RPC `set_maintenance_mode` vérifie elle-même le rôle côté serveur.
 */
export const useToggleMaintenance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      isEnabled,
      message,
      scheduledEnd,
    }: {
      isEnabled: boolean;
      message?: string;
      scheduledEnd?: string | null;
    }) => {
      const { data, error } = await supabase.rpc(
        "set_maintenance_mode" as never,
        {
          _is_enabled: isEnabled,
          _message: message ?? null,
          _scheduled_end: scheduledEnd ?? null,
        } as never
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-settings"] });
    },
  });
};
