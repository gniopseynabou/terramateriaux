import { Check, Circle } from "lucide-react";
import { ORDER_FLOW, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  current: OrderStatus;
  history?: Tables<"order_history">[];
}

const OrderStatusTimeline = ({ current, history = [] }: Props) => {
  if (current === "ANNULEE") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Cette commande a été annulée.
      </div>
    );
  }

  const currentIndex = ORDER_FLOW.indexOf(current);
  const dateFor = (s: OrderStatus) =>
    history.find((h) => h.status === s)?.created_at;

  return (
    <ol className="space-y-3">
      {ORDER_FLOW.map((s, i) => {
        const done = i <= currentIndex;
        const date = dateFor(s);
        return (
          <li key={s} className="flex items-start gap-3">
            <div
              className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
            </div>
            <div className="min-w-0">
              <p className={`text-sm ${i === currentIndex ? "font-semibold text-foreground" : done ? "text-foreground/80" : "text-muted-foreground"}`}>
                {ORDER_STATUS_LABELS[s]}
              </p>
              {date && (
                <p className="text-xs text-muted-foreground">
                  {new Date(date).toLocaleString("fr-FR")}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default OrderStatusTimeline;