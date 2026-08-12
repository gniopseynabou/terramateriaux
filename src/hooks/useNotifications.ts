import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AppNotification = Tables<"notifications">;

export const useNotifications = (enabled: boolean) =>
  useQuery({
    queryKey: ["notifications"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AppNotification[];
    },
  });

/** Realtime refresh of the in-app notification list. */
export const useRealtimeNotifications = (enabled: boolean) => {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("notifications-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
};

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

/** Toggle a single notification between read and unread. */
export const useToggleNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase.from("notifications").update({ is_read }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

/** Fire-and-forget notification creation (used by order/payment flows). */
export const pushNotification = async (input: {
  user_id: string | null;
  order_id: string | null;
  title: string;
  message: string;
  type?: string;
}) => {
  await supabase.from("notifications").insert({
    user_id: input.user_id,
    order_id: input.order_id,
    title: input.title,
    message: input.message,
    type: input.type ?? "order",
  });
};
