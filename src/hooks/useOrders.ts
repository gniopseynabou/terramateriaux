import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useEffect } from "react";
import { ORDER_STATUS_NOTIFICATIONS, canTransition, type OrderStatus } from "@/lib/orderStatus";
import { pushNotification } from "@/hooks/useNotifications";

export type DbOrder = Tables<"orders">;
export type DbOrderItem = Tables<"order_items">;
export type DbOrderHistory = Tables<"order_history">;
export type DbPayment = Tables<"payments">;

export type OrderWithDetails = DbOrder & {
  order_items: DbOrderItem[];
  order_history: DbOrderHistory[];
  payments: DbPayment[];
};

const ORDER_DETAIL_SELECT =
  "*, order_items(*), order_history(*), payments:payments!payments_order_id_fkey(*)";

export interface CreateOrderItemInput {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  is_gros: boolean;
  subtotal: number;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_comment?: string;
  delivery_method: string;
  delivery_address?: string;
  delivery_region?: string;
  delivery_city?: string;
  delivery_quarter?: string;
  delivery_fee: number;
  subtotal: number;
  total: number;
  payment_method: string;
  items: CreateOrderItemInput[];
}

const generateOrderNumber = () =>
  `TMI-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/**
 * Creates an order without any online payment.
 * Status starts at EN_ATTENTE_PAIEMENT; the customer pays externally then declares it.
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const orderNumber = generateOrderNumber();

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user?.id ?? null,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          customer_email: input.customer_email ?? null,
          customer_comment: input.customer_comment ?? null,
          delivery_method: input.delivery_method,
          delivery_address: input.delivery_address ?? null,
          delivery_region: input.delivery_region ?? null,
          delivery_city: input.delivery_city ?? null,
          delivery_quarter: input.delivery_quarter ?? null,
          delivery_fee: input.delivery_fee,
          subtotal: input.subtotal,
          total: input.total,
          estimated_total: input.total,
          payment_method: input.payment_method,
          status: "en cours",
          order_status: "EN_ATTENTE_PAIEMENT",
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const { error: itemsError } = await supabase.from("order_items").insert(
        input.items.map((item) => ({ ...item, order_id: order.id }))
      );
      if (itemsError) throw itemsError;

      await supabase.from("order_history").insert({
        order_id: order.id,
        status: "EN_ATTENTE_PAIEMENT",
        comment: `Commande enregistrée par le client (paiement choisi : ${input.payment_method}).`,
        created_by: user?.id ?? null,
      });

      await pushNotification({
        user_id: user?.id ?? null,
        order_id: order.id,
        ...ORDER_STATUS_NOTIFICATIONS.EN_ATTENTE_PAIEMENT,
      });

      return order as DbOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

/** Order lookup by public order number (used on the confirmation page). */
export const useOrderByNumber = (orderNumber?: string) =>
  useQuery({
    queryKey: ["order", orderNumber],
    enabled: !!orderNumber,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_DETAIL_SELECT)
        .eq("order_number", orderNumber!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as OrderWithDetails | null;
    },
  });

/** Orders of the signed-in customer. */
export const useMyOrders = (enabled: boolean) =>
  useQuery({
    queryKey: ["orders", "mine"],
    enabled,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_DETAIL_SELECT)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderWithDetails[];
    },
  });

/** All orders, for the admin dashboard. */
export const useAdminOrders = () =>
  useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(ORDER_DETAIL_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OrderWithDetails[];
    },
  });

export interface UpdateOrderInput {
  order_id: string;
  current_status?: OrderStatus;
  user_id: string | null;
  order_status?: OrderStatus;
  delivery_fee?: number;
  final_total?: number;
  assigned_name?: string | null;
  comment?: string;
}

/** Admin update: status, fees, final amount, assignment + history & notification. */
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateOrderInput) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Guardrail: refuse invalid status transitions before hitting the database.
      if (
        input.order_status &&
        input.current_status &&
        !canTransition(input.current_status, input.order_status)
      ) {
        throw new Error("Transition de statut non autorisée.");
      }

      const patch: Record<string, unknown> = {};
      if (input.order_status) patch.order_status = input.order_status;
      if (input.delivery_fee !== undefined) patch.delivery_fee = input.delivery_fee;
      if (input.final_total !== undefined) patch.final_total = input.final_total;
      if (input.assigned_name !== undefined) patch.assigned_name = input.assigned_name;
      patch.updated_at = new Date().toISOString();

      const { error } = await supabase.from("orders").update(patch).eq("id", input.order_id);
      if (error) throw error;

      if (input.order_status || input.comment) {
        await supabase.from("order_history").insert({
          order_id: input.order_id,
          status: input.order_status ?? "EN_ATTENTE_PAIEMENT",
          comment: input.comment ?? null,
          created_by: user?.id ?? null,
        });
      }

      if (input.order_status) {
        await pushNotification({
          user_id: input.user_id,
          order_id: input.order_id,
          ...ORDER_STATUS_NOTIFICATIONS[input.order_status],
        });
      }

      if (input.assigned_name) {
        await supabase.from("staff_assignments").insert({
          order_id: input.order_id,
          staff_name: input.assigned_name,
          assigned_by: user?.id ?? null,
          note: input.comment ?? null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
/**
 * Live order tracking: refreshes the cached orders whenever the backend pushes
 * a change on orders / order_history / payments.
 */
export const useRealtimeOrders = (enabled: boolean, queryKeys: string[] = ["orders", "admin-orders"]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`orders-live-${queryKeys.join("-")}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_history" }, () => {
        queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, queryClient, queryKeys.join("-")]);
};
