import { useState } from "react";
import { ChevronDown, ChevronUp, History, ShoppingBag, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminOrders, useUpdateOrder, useRealtimeOrders, type OrderWithDetails } from "@/hooks/useOrders";
import { formatFCFA } from "@/hooks/useProducts";
import { ALLOWED_TRANSITIONS, ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";

interface DraftState {
  status: OrderStatus;
  deliveryFee: string;
  finalTotal: string;
  assigned: string;
  comment: string;
}

const OrderRow = ({ order }: { order: OrderWithDetails }) => {
  const [open, setOpen] = useState(false);
  const updateOrder = useUpdateOrder();
  const [draft, setDraft] = useState<DraftState>({
    status: order.order_status,
    deliveryFee: String(order.delivery_fee ?? 0),
    finalTotal: order.final_total != null ? String(order.final_total) : "",
    assigned: order.assigned_name ?? "",
    comment: "",
  });

  const statusOptions = [order.order_status, ...ALLOWED_TRANSITIONS[order.order_status]];

  const save = async () => {
    const statusChanged = draft.status !== order.order_status;
    if (statusChanged && !draft.comment.trim()) {
      toast.error("Indiquez un motif pour tracer ce changement de statut.");
      return;
    }
    try {
      await updateOrder.mutateAsync({
        order_id: order.id,
        user_id: order.user_id,
        current_status: order.order_status,
        order_status: statusChanged ? draft.status : undefined,
        delivery_fee: Number(draft.deliveryFee) || 0,
        final_total: draft.finalTotal === "" ? undefined : Number(draft.finalTotal),
        assigned_name: draft.assigned.trim() || null,
        comment: draft.comment.trim() || undefined,
      });
      toast.success("Commande mise à jour");
      setDraft((d) => ({ ...d, comment: "" }));
    } catch (e) {
      toast.error("Mise à jour impossible", { description: (e as Error).message });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex flex-wrap items-center justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0">
          <span className="font-mono font-semibold">{order.order_number}</span>
          <p className="text-sm text-muted-foreground">
            {order.customer_name} · {order.customer_phone} · {new Date(order.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-heading font-bold text-primary">
            {formatFCFA(order.final_total ?? order.estimated_total ?? order.total)}
          </span>
          <OrderStatusBadge status={order.order_status} />
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-5">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p><span className="text-muted-foreground">Email :</span> {order.customer_email ?? "-"}</p>
              <p><span className="text-muted-foreground">Adresse :</span> {order.delivery_address ?? "-"}</p>
              <p><span className="text-muted-foreground">Ville / quartier :</span> {order.delivery_city ?? "-"} / {order.delivery_quarter ?? "-"}</p>
              <p><span className="text-muted-foreground">Région :</span> {order.delivery_region ?? "-"}</p>
              <p><span className="text-muted-foreground">Mode :</span> {order.delivery_method}</p>
              {order.customer_comment && (
                <p><span className="text-muted-foreground">Commentaire client :</span> {order.customer_comment}</p>
              )}
              <p><span className="text-muted-foreground">Commercial :</span> {order.assigned_name ?? "Non affecté"}</p>
              <p>
                <span className="text-muted-foreground">Paiement :</span>{" "}
                {order.payments.length > 0
                  ? `${order.payments[order.payments.length - 1].payment_method} - ${order.payments[order.payments.length - 1].status}`
                  : "Aucun paiement enregistré"}
              </p>
            </div>
            <ul className="space-y-1">
              {order.order_items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3">
                  <span>{it.product_name} × {it.quantity}{it.is_gros ? " (gros)" : ""}</span>
                  <span>{formatFCFA(it.subtotal)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-border pt-1">
                <span className="text-muted-foreground">Livraison</span>
                <span>{formatFCFA(order.delivery_fee)}</span>
              </li>
              <li className="flex justify-between font-semibold">
                <span>Montant estimatif</span>
                <span>{formatFCFA(order.estimated_total ?? order.total)}</span>
              </li>
            </ul>
          </div>

          {/* Admin actions */}
          <div className="grid md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Statut (transitions autorisées uniquement)</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as OrderStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frais de livraison</Label>
              <Input type="number" min={0} value={draft.deliveryFee} onChange={(e) => setDraft({ ...draft, deliveryFee: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Montant final</Label>
              <Input type="number" min={0} placeholder="-" value={draft.finalTotal} onChange={(e) => setDraft({ ...draft, finalTotal: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Commercial</Label>
              <Input maxLength={100} placeholder="Nom du commercial" value={draft.assigned} onChange={(e) => setDraft({ ...draft, assigned: e.target.value })} />
            </div>
          </div>

          <Textarea
            rows={2}
            maxLength={1000}
            placeholder="Motif du changement de statut / commentaire interne (obligatoire si le statut change)"
            value={draft.comment}
            onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
          />
          <Button onClick={save} disabled={updateOrder.isPending}>
            {updateOrder.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>

          <div className="border-t border-border pt-3">
            <p className="flex items-center gap-2 font-medium text-sm mb-2">
              <History className="h-4 w-4 text-primary" /> Historique
            </p>
            <ul className="space-y-1.5 text-xs">
              {[...order.order_history]
                .sort((a, b) => a.created_at.localeCompare(b.created_at))
                .map((h) => (
                  <li key={h.id} className="flex flex-wrap gap-2">
                    <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("fr-FR")}</span>
                    <span className="font-medium">{ORDER_STATUS_LABELS[h.status]}</span>
                    {h.comment && <span className="text-muted-foreground">- {h.comment}</span>}
                    <span className="text-muted-foreground">
                      ({h.created_by ? `par ${h.created_by.slice(0, 8)}` : "système / client"})
                    </span>
                  </li>
                ))}
              {order.order_history.length === 0 && <li className="text-muted-foreground">Aucun historique.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminOrders = () => {
  const { data: orders = [], isLoading } = useAdminOrders();
  useRealtimeOrders(true, ["admin-orders"]);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;

  const term = search.trim().toLowerCase();
  const filtered = orders.filter(
    (o) =>
      (filter === "ALL" || o.order_status === filter) &&
      (term === "" ||
        o.order_number.toLowerCase().includes(term) ||
        o.customer_phone.toLowerCase().includes(term) ||
        o.customer_name.toLowerCase().includes(term))
  );

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
        <p>Aucune commande pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 [&>button]:max-w-xs">
        <Input
          className="max-w-xs"
          placeholder="Rechercher (numéro, téléphone, client)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as OrderStatus | "ALL")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filtered.map((o) => <OrderRow key={o.id} order={o} />)}
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucune commande ne correspond à cette recherche.</p>}
    </div>
  );
};

export default AdminOrders;