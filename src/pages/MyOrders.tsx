import { Link, useSearchParams } from "react-router-dom";
import { PackageSearch } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrders, useRealtimeOrders } from "@/hooks/useOrders";
import { formatFCFA } from "@/hooks/useProducts";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import OrderStatusTimeline from "@/components/order/OrderStatusTimeline";
import PaymentDeclarationCard from "@/components/order/PaymentDeclarationCard";
import PaymentInfoCard from "@/components/order/PaymentInfoCard";
import OrderClientActions from "@/components/order/OrderClientActions";
import { useMyOrderRequests } from "@/hooks/useOrderRequests";

const PAYMENT_STAGES = ["EN_ATTENTE_PAIEMENT", "PAIEMENT_EN_ATTENTE", "CLIENT_CONTACTE"];

const MyOrders = () => {
  const { user, loading } = useAuth();
  const { data: orders = [], isLoading } = useMyOrders(!!user);
  const { data: requests = [] } = useMyOrderRequests(!!user);
  useRealtimeOrders(!!user, ["orders"]);
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get("commande");

  if (loading) {
    return <Layout><div className="container mx-auto px-4 py-10"><Skeleton className="h-40 w-full" /></div></Layout>;
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <PackageSearch className="h-16 w-16 text-muted-foreground/40 mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Suivi de commandes</h1>
          <p className="text-muted-foreground">Connectez-vous pour suivre vos commandes en temps réel.</p>
          <Link to="/auth"><Button>Se connecter</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl space-y-6">
        <h1 className="text-2xl md:text-3xl font-heading font-bold">Mes commandes</h1>

        {isLoading && <Skeleton className="h-40 w-full rounded-lg" />}

        {!isLoading && orders.length === 0 && (
          <div className="text-center py-12 space-y-3">
            <PackageSearch className="h-14 w-14 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">Aucune commande pour le moment.</p>
            <Link to="/catalogue"><Button>Découvrir le catalogue</Button></Link>
          </div>
        )}

        {orders.map((order) => (
          <article
            key={order.id}
            id={order.id}
            className={`bg-card border rounded-lg p-5 space-y-4 ${
              highlightedId === order.id ? "border-primary ring-2 ring-primary/30" : "border-border"
            }`}
          >
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono font-semibold">{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Paiement : {order.payment_method ?? "-"}
                  {order.payments.length > 0 && order.payments[order.payments.length - 1].reference
                    ? ` · Réf. ${order.payments[order.payments.length - 1].reference}`
                    : ""}
                </p>
              </div>
              <div className="text-right space-y-1">
                <OrderStatusBadge status={order.order_status} />
                <p className="font-heading font-bold text-primary">
                  {formatFCFA(order.final_total ?? order.estimated_total ?? order.total)}
                </p>
                {order.final_total == null && (
                  <p className="text-[11px] text-muted-foreground">Montant estimatif</p>
                )}
              </div>
            </header>

            <div className="grid md:grid-cols-2 gap-5">
              <ul className="space-y-2 text-sm">
                {order.order_items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-3">
                    <span className="min-w-0">{it.product_name} × {it.quantity}</span>
                    <span className="whitespace-nowrap">{formatFCFA(it.subtotal)}</span>
                  </li>
                ))}
              </ul>
              <OrderStatusTimeline current={order.order_status} history={order.order_history} />
            </div>

            {order.payments.length > 0 && (
              <div className="text-xs text-muted-foreground border-t border-border pt-3">
                {order.payments.length} preuve(s) de paiement envoyée(s) - dernier statut :{" "}
                <span className="font-medium text-foreground">{order.payments[order.payments.length - 1].status}</span>
              </div>
            )}

            {PAYMENT_STAGES.includes(order.order_status) && order.payment_method !== "cash_on_delivery" && (
              <PaymentDeclarationCard
                orderId={order.id}
                orderNumber={order.order_number}
                amount={order.final_total ?? order.estimated_total ?? order.total}
                userId={user.id}
                defaultMethod={order.payment_method}
                alreadyDeclared={order.payments.length > 0}
              />
            )}

            <OrderClientActions
              order={order}
              requests={requests.filter((r) => r.order_id === order.id)}
            />
          </article>
        ))}

        <PaymentInfoCard />
      </div>
    </Layout>
  );
};

export default MyOrders;