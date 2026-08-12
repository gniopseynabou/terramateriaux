import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications, useRealtimeNotifications, useMarkNotificationsRead } from "@/hooks/useNotifications";
import NotificationList from "./NotificationList";

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications(!!user);
  useRealtimeNotifications(!!user);
  const markRead = useMarkNotificationsRead();

  if (!user) return null;

  const unread = notifications.filter((n) => !n.is_read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-foreground/70" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="font-heading font-semibold text-sm">Notifications</span>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => markRead.mutate(unread.map((n) => n.id))}>
              Tout marquer comme lu
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          <NotificationList notifications={notifications.slice(0, 10)} onNavigate={() => setOpen(false)} compact />
        </ScrollArea>
        <div className="p-2 border-t border-border">
          <Link to="/notifications" onClick={() => setOpen(false)}>
            <Button variant="outline" size="sm" className="w-full">Voir toutes les notifications</Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
