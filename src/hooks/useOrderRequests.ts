import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OrderRequest = Tables<"order_requests">;
export type OrderRequestType = OrderRequest["request_type"];
export type OrderRequestStatus = OrderRequest["status"];

export type OrderRequestWithOrder = OrderRequest & {
  orders?: { order_number: string; customer_name: string; customer_phone: string } | null;
};

export const REQUEST_TYPE_LABELS: Record<OrderRequestType, string> = {
  MODIFICATION: "Modification",
  ANNULATION: "Annulation",
};

export const REQUEST_STATUS_LABELS: Record<OrderRequestStatus, string> = {
  EN_ATTENTE: "En attente",
  ACCEPTEE: "Acceptée",
  REFUSEE: "Refusée",
  TRAITEE: "Traitée",
};

export const REQUEST_STATUS_CLASSES: Record<OrderRequestStatus, string> = {
  EN_ATTENTE: "bg-warning/10 text-warning",
  ACCEPTEE: "bg-success/10 text-success",
  REFUSEE: "bg-destructive/10 text-destructive",
  TRAITEE: "bg-muted text-muted-foreground",
};

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["orders"] });
  qc.invalidateQueries({ queryKey: ["admin-orders"] });
  qc.invalidateQueries({ queryKey: ["order-requests"] });
  qc.invalidateQueries({ queryKey: ["notifications"] });
};

/** Requests of the signed-in customer. */
export const useMyOrderRequests = (enabled: boolean) =>
  useQuery({
    queryKey: ["order-requests", "mine"],
    enabled,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("order_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderRequest[];
    },
  });

/** All requests, for the admin dashboard. */
export const useAdminOrderRequests = () =>
  useQuery({
    queryKey: ["order-requests", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_requests")
        .select("*, orders(order_number, customer_name, customer_phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderRequestWithOrder[];
    },
  });

/** Customer: cancel an order that has not been paid yet. */
export const useClientCancelOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const { error } = await supabase.rpc("client_cancel_order", {
        _order_id: orderId,
        _reason: reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
};

/** Customer: change the quantity of a line (0 removes it) before payment. */
export const useClientUpdateOrderItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const { error } = await supabase.rpc("client_update_order_item", {
        _item_id: itemId,
        _quantity: quantity,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
};

export interface ClientDeliveryUpdate {
  orderId: string;
  customer_name: string;
  customer_phone: string;
  delivery_address?: string | null;
  delivery_region?: string | null;
  delivery_city?: string | null;
  delivery_quarter?: string | null;
  customer_comment?: string | null;
}

/** Customer: update delivery details before payment. */
export const useClientUpdateDelivery = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClientDeliveryUpdate) => {
      const { error } = await supabase.rpc("client_update_order_delivery", {
        _order_id: input.orderId,
        _customer_name: input.customer_name,
        _customer_phone: input.customer_phone,
        _delivery_address: input.delivery_address ?? null,
        _delivery_region: input.delivery_region ?? null,
        _delivery_city: input.delivery_city ?? null,
        _delivery_quarter: input.delivery_quarter ?? null,
        _customer_comment: input.customer_comment ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
};

/** Customer: ask the team for a change/cancellation once the order is paid. */
export const useCreateOrderRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, type, reason }: { orderId: string; type: OrderRequestType; reason: string }) => {
      const { error } = await supabase.rpc("create_order_request", {
        _order_id: orderId,
        _request_type: type,
        _reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
};

/** Admin: accept / refuse / close a request. */
export const useHandleOrderRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, response, orderId, userId }: {
      id: string;
      status: OrderRequestStatus;
      response: string;
      orderId: string;
      userId: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("order_requests")
        .update({
          status,
          admin_response: response || null,
          handled_by: user?.id ?? null,
          handled_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: userId,
        order_id: orderId,
        title: status === "ACCEPTEE" ? "Demande acceptée" : status === "REFUSEE" ? "Demande refusée" : "Demande traitée",
        message: response || `Votre demande a été ${REQUEST_STATUS_LABELS[status].toLowerCase()}.`,
        type: "order",
      });
    },
    onSuccess: () => invalidate(qc),
  });
};
