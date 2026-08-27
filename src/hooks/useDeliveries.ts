import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type DbDelivery = Tables<"deliveries">;
export type DbDeliveryHistory = Tables<"delivery_history">;
export type DbDeliverySettings = Tables<"delivery_settings">;

export interface DeliveryWithDetails extends DbDelivery {
  orders?: Tables<"orders"> & {
    order_items?: Tables<"order_items">[];
  };
  delivery_drivers?: Tables<"delivery_drivers"> | null;
}

export const useDeliveries = () => {
  return useQuery({
    queryKey: ["deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          orders (*, order_items (*)),
          delivery_drivers (*)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DeliveryWithDetails[];
    },
  });
};

export const useDeliveryHistory = (deliveryId?: string) => {
  return useQuery({
    queryKey: ["delivery_history", deliveryId],
    queryFn: async () => {
      if (!deliveryId) return [];
      const { data, error } = await supabase
        .from("delivery_history")
        .select("*")
        .eq("delivery_id", deliveryId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DbDeliveryHistory[];
    },
    enabled: !!deliveryId,
  });
};

export const useDeliverySettings = () => {
  return useQuery({
    queryKey: ["delivery_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as DbDeliverySettings) || { free_delivery_min_amount: 50000, free_delivery_enabled: true };
    },
  });
};

export const useUpdateDeliverySettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { free_delivery_min_amount: number; free_delivery_enabled: boolean }) => {
      const { data: existing } = await supabase.from("delivery_settings").select("id").maybeSingle();
      if (existing) {
        const { data, error } = await supabase
          .from("delivery_settings")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("delivery_settings")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_settings"] });
    },
  });
};

export interface AssignDriverPayload {
  delivery_id?: string;
  order_id: string;
  driver_id: string | null;
  assigned_by_name?: string;
}

export const useAssignDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ delivery_id, order_id, driver_id }: AssignDriverPayload) => {
      let activeDeliveryId = delivery_id;

      // Ensure delivery record exists
      if (!activeDeliveryId) {
        const { data: existing } = await supabase
          .from("deliveries")
          .select("id")
          .eq("order_id", order_id)
          .maybeSingle();

        if (existing) {
          activeDeliveryId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabase
            .from("deliveries")
            .insert({
              order_id,
              driver_id,
              status: driver_id ? "AFFECTEE" : "A_PREPARER",
              assigned_at: driver_id ? new Date().toISOString() : null,
            })
            .select()
            .single();
          if (createErr) throw createErr;
          activeDeliveryId = created.id;
        }
      }

      // Fetch driver details if driver_id is provided
      let driverName = "Non affecté";
      if (driver_id) {
        const { data: driver } = await supabase
          .from("delivery_drivers")
          .select("first_name, last_name")
          .eq("id", driver_id)
          .maybeSingle();
        if (driver) {
          driverName = `${driver.first_name} ${driver.last_name}`;
        }
      }

      // Update delivery record
      const updateData: Partial<DbDelivery> = {
        driver_id,
        assigned_at: driver_id ? new Date().toISOString() : null,
        status: driver_id ? "AFFECTEE" : "A_PREPARER",
      };

      const { data: updatedDelivery, error: updateErr } = await supabase
        .from("deliveries")
        .update(updateData)
        .eq("id", activeDeliveryId)
        .select()
        .single();
      if (updateErr) throw updateErr;

      // Also update orders table for assigned driver name
      await supabase
        .from("orders")
        .update({
          assigned_name: driverName,
          driver_id: driver_id,
          delivery_status: driver_id ? "AFFECTEE" : "A_PREPARER",
        })
        .eq("id", order_id);

      // Record in delivery_history
      await supabase.from("delivery_history").insert({
        delivery_id: activeDeliveryId,
        order_id,
        driver_id,
        status: driver_id ? "AFFECTEE" : "NON_AFFECTEE",
        comment: driver_id ? `Commande affectée à ${driverName}` : "Affectation retirée",
      });

      // Update driver status if driver is assigned
      if (driver_id) {
        await supabase
          .from("delivery_drivers")
          .update({ status: "EN_LIVRAISON" })
          .eq("id", driver_id);
      }

      return updatedDelivery;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery_drivers"] });
    },
  });
};

export interface UpdateDeliveryStatusPayload {
  delivery_id: string;
  order_id: string;
  status:
    | "A_PREPARER"
    | "PRETE"
    | "AFFECTEE"
    | "EN_COURS"
    | "LIVREE"
    | "ANNULEE"
    | "ECHEC"
    | "CLIENT_ABSENT"
    | "ADRESSE_INCORRECTE"
    | "REPORTEE";
  comment?: string;
  issue_reason?: string;
  proof_file?: File | null;
  proof_type?: string;
  driver_id?: string | null;
}

export const useUpdateDeliveryStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      delivery_id,
      order_id,
      status,
      comment,
      issue_reason,
      proof_file,
      proof_type,
      driver_id,
    }: UpdateDeliveryStatusPayload) => {
      let proof_url: string | null = null;

      // Handle proof upload if file provided
      if (proof_file) {
        const fileExt = proof_file.name.split(".").pop();
        const filePath = `${order_id}_${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from("delivery-proofs")
          .upload(filePath, proof_file, { upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("delivery-proofs")
          .getPublicUrl(filePath);
        proof_url = urlData.publicUrl;
      }

      const now = new Date().toISOString();
      const updates: Partial<DbDelivery> = {
        status,
        updated_at: now,
      };

      if (issue_reason) updates.issue_reason = issue_reason;
      if (proof_url) {
        updates.proof_url = proof_url;
        updates.proof_type = proof_type || "photo";
      }
      if (status === "EN_COURS" && !updates.started_at) {
        updates.started_at = now;
      }
      if (status === "LIVREE") {
        updates.completed_at = now;
      }

      const { data: updated, error: deliveryErr } = await supabase
        .from("deliveries")
        .update(updates)
        .eq("id", delivery_id)
        .select()
        .single();
      if (deliveryErr) throw deliveryErr;

      // Keep orders table delivery status in sync
      await supabase
        .from("orders")
        .update({ delivery_status: status })
        .eq("id", order_id);

      // Audit trail
      await supabase.from("delivery_history").insert({
        delivery_id,
        order_id,
        driver_id: driver_id || updated.driver_id,
        status,
        comment: comment || issue_reason || `Statut mis à jour : ${status}`,
        proof_url,
      });

      // Update driver status back to DISPONIBLE if delivery is completed or failed/cancelled
      if (["LIVREE", "ECHEC", "ANNULEE"].includes(status) && updated.driver_id) {
        // Check if driver has any other active deliveries
        const { data: otherActive } = await supabase
          .from("deliveries")
          .select("id")
          .eq("driver_id", updated.driver_id)
          .in("status", ["AFFECTEE", "EN_COURS"]);

        if (!otherActive || otherActive.length === 0) {
          await supabase
            .from("delivery_drivers")
            .update({ status: "DISPONIBLE" })
            .eq("id", updated.driver_id);
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery_history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["delivery_drivers"] });
    },
  });
};

/**
 * Hook for drivers: fetch only their own assigned deliveries.
 */
export const useDriverDeliveries = () => {
  return useQuery({
    queryKey: ["driver-deliveries"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Find the driver record associated with the current user
      const { data: driver } = await supabase
        .from("delivery_drivers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!driver) return [];

      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          orders (*),
          delivery_drivers (*)
        `)
        .eq("driver_id", driver.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DeliveryWithDetails[];
    },
    refetchInterval: 60 * 1000, // Auto-refresh every 60s
  });
};

/**
 * Simplified mutation for drivers to update delivery status from their dashboard.
 */
export const useUpdateDeliveryStatusSimple = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deliveryId,
      status,
      notes,
    }: {
      deliveryId: string;
      status: string;
      notes?: string;
    }) => {
      const now = new Date().toISOString();

      // Fetch current delivery to get order_id and driver_id
      const { data: current, error: fetchErr } = await supabase
        .from("deliveries")
        .select("order_id, driver_id")
        .eq("id", deliveryId)
        .single();
      if (fetchErr) throw fetchErr;

      const updates: Record<string, unknown> = { status, updated_at: now };
      if (status === "EN_TRANSIT" || status === "EN_COURS") updates.started_at = now;
      if (status === "LIVREE") updates.completed_at = now;
      if (notes) updates.notes = notes;

      const { data: updated, error: updateErr } = await supabase
        .from("deliveries")
        .update(updates)
        .eq("id", deliveryId)
        .select()
        .single();
      if (updateErr) throw updateErr;

      // Sync orders table
      await supabase
        .from("orders")
        .update({ delivery_status: status })
        .eq("id", current.order_id);

      // Audit trail
      await supabase.from("delivery_history").insert({
        delivery_id: deliveryId,
        order_id: current.order_id,
        driver_id: current.driver_id,
        status,
        comment: notes || `Statut mis à jour par le livreur : ${status}`,
      });

      // Free driver if finished
      if (["LIVREE", "ECHOUEE", "RETOURNEE"].includes(status) && current.driver_id) {
        const { data: otherActive } = await supabase
          .from("deliveries")
          .select("id")
          .eq("driver_id", current.driver_id)
          .in("status", ["AFFECTEE", "ACCEPTEE", "EN_TRANSIT", "EN_COURS"]);

        if (!otherActive || otherActive.length === 0) {
          await supabase
            .from("delivery_drivers")
            .update({ status: "DISPONIBLE" })
            .eq("id", current.driver_id);
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["delivery_history"] });
      queryClient.invalidateQueries({ queryKey: ["delivery_drivers"] });
    },
  });
};

