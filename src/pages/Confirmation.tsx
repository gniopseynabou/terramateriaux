import { Link, useParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderByNumber, useRealtimeOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { formatFCFA } from "@/hooks/useProducts";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import PaymentInfoCard from "@/components/order/PaymentInfoCard";
import PaymentDeclarationCard from "@/components/order/PaymentDeclarationCard";

const Confirmation = () => {
  const { orderNumber } = useParams();
  const { user } = useAuth();
  const { data: order, isLoading } = useOrderByNumber(orderNumber);
  useRealtimeOrders(!!order, ["order", "orders"]);

  const isCash = order?.payment_method === "cash_on_delivery";

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 md:py-14 max-w-2xl space-y-6">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <CheckCircle2 className="h-20 w-20 text-success mx-auto mb-5" />
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Merci pour votre commande</h1>
          <p className="text-muted-foreground mt-2">Votre commande a bien été enregistrée.</p>
        </div>

        {isLoading && <Skeleton className="h-56 w-full rounded-lg" />}

        {!isLoading && !order && (
          <p className="text-center text-muted-foreground">
            Commande introuvable. Numéro : <span className="font-mono">{orderNumber}</span>
          </p>
        )}

        {order && (
          <>
            <section className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Numéro de commande</p>
                  <p className="font-mono font-bold text-lg">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("fr-FR")}
                  </p>
                  <OrderStatusBadge status={order.order_status} className="mt-1" />
                </div>
              </div>

              <ul className="border-t border-border pt-3 space-y-2">
                {order.order_items.map((it) => (
                  <li key={it.id} className="flex justify-between text-sm gap-3">
                    <span className="min-w-0">
                      <span className="font-medium">{it.product_name}</span>
                      <span className="text-muted-foreground"> × {it.quantity}</span>
                    </span>
                    <span className="whitespace-nowrap">{formatFCFA(it.subtotal)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Sous-total</span><span>{formatFCFA(order.subtotal)}</span></div>
                <div className="flex justify-between">
                  <span>Frais de livraison</span><span>{formatFCFA(order.delivery_fee)}</span>
                </div>
                <div className="flex justify-between font-heading font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{formatFCFA(order.final_total ?? order.estimated_total ?? order.total)}</span>
                </div>
              </div>

              <div className="border-t border-border pt-3 text-sm space-y-1">
                <p className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4 text-primary" /> Livraison</p>
                <p className="text-muted-foreground">
                  {order.delivery_method === "retrait"
                    ? "Retrait en magasin"
                    : [order.delivery_address, order.delivery_quarter, order.delivery_city, order.delivery_region]
                        .filter(Boolean).join(", ")}
                </p>
                <p className="text-muted-foreground">
                  Moyen de paiement choisi : <span className="text-foreground font-medium">{order.payment_method ?? "-"}</span>
                </p>
              </div>
            </section>

            {isCash ? (
              <section className="rounded-lg border border-primary/30 bg-accent/50 p-5 text-sm">
                Vous réglerez votre commande à la livraison. Notre équipe prépare votre commande et vous
                contactera uniquement si une information complémentaire est nécessaire.
              </section>
            ) : (
              <>
                <PaymentInfoCard methodKey={order.payment_method} />
                <PaymentDeclarationCard
                  orderId={order.id}
                  orderNumber={order.order_number}
                  amount={order.final_total ?? order.estimated_total ?? order.total}
                  userId={user?.id ?? order.user_id ?? null}
                  defaultMethod={order.payment_method}
                  alreadyDeclared={order.payments.length > 0}
                />
              </>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/mes-commandes"><Button variant="outline">Suivre ma commande</Button></Link>
          <Link to="/"><Button>Retour à l'accueil <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
        </div>
      </div>
    </Layout>
  );
};

export default Confirmation;
