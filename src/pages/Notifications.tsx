import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useNotifications,
  useRealtimeNotifications,
  useMarkNotificationsRead,
} from "@/hooks/useNotifications";
import NotificationList from "@/components/notifications/NotificationList";

const NotificationsPage = () => {
  const { user, loading } = useAuth();
  const { data: notifications = [], isLoading } = useNotifications(!!user);
  useRealtimeNotifications(!!user);
  const markRead = useMarkNotificationsRead();

  if (loading) {
    return <Layout><div className="container mx-auto px-4 py-10"><Skeleton className="h-40 w-full" /></div></Layout>;
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <Bell className="h-14 w-14 text-muted-foreground/40 mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Notifications</h1>
          <p className="text-muted-foreground">Connectez-vous pour consulter vos notifications.</p>
          <Link to="/auth"><Button>Se connecter</Button></Link>
        </div>
      </Layout>
    );
  }

  const unread = notifications.filter((n) => !n.is_read);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Notifications</h1>
          {unread.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => markRead.mutate(unread.map((n) => n.id))}>
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <NotificationList notifications={notifications} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsPage;
