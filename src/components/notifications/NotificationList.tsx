import { useNavigate } from "react-router-dom";
import { BellOff, Check, Dot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToggleNotificationRead, type AppNotification } from "@/hooks/useNotifications";

interface Props {
  notifications: AppNotification[];
  onNavigate?: () => void;
  compact?: boolean;
}

/** Shared renderer used by both the header panel and the notifications page. */
const NotificationList = ({ notifications, onNavigate, compact = false }: Props) => {
  const navigate = useNavigate();
  const toggleRead = useToggleNotificationRead();

  if (notifications.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        <BellOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
        Aucune notification.
      </div>
    );
  }

  const open = (n: AppNotification) => {
    if (!n.is_read) toggleRead.mutate({ id: n.id, is_read: true });
    onNavigate?.();
    navigate(n.order_id ? `/mes-commandes?commande=${n.order_id}` : "/notifications");
  };

  return (
    <ul className="divide-y divide-border">
      {notifications.map((n) => (
        <li key={n.id} className={`flex gap-2 items-start p-3 ${n.is_read ? "" : "bg-accent/40"}`}>
          <button onClick={() => open(n)} className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium flex items-center gap-1">
              {!n.is_read && <Dot className="h-5 w-5 -ml-1.5 text-primary" />}
              {n.title}
            </p>
            <p className={`text-xs text-muted-foreground ${compact ? "line-clamp-2" : ""}`}>{n.message}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {new Date(n.created_at).toLocaleString("fr-FR")}
            </p>
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs shrink-0"
            onClick={() => toggleRead.mutate({ id: n.id, is_read: !n.is_read })}
          >
            {n.is_read ? "Non lu" : <Check className="h-4 w-4" />}
          </Button>
        </li>
      ))}
    </ul>
  );
};

export default NotificationList;
