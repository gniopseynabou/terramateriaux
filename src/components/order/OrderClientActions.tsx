import { useState } from "react";
import { toast } from "sonner";
import { Ban, Minus, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { formatFCFA } from "@/hooks/useProducts";
import type { OrderWithDetails } from "@/hooks/useOrders";
import {
  REQUEST_STATUS_CLASSES, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS,
  useClientCancelOrder, useClientUpdateDelivery, useClientUpdateOrderItem,
  useCreateOrderRequest, type OrderRequest, type OrderRequestType,
} from "@/hooks/useOrderRequests";

/** An order can be edited directly only while nothing has been paid or declared. */
export const isDirectlyEditable = (order: OrderWithDetails) =>
  order.order_status === "EN_ATTENTE_PAIEMENT" &&
  order.payment_status === "pending" &&
  order.payments.length === 0;

const CLOSED_STATUSES = ["LIVREE", "TERMINEE", "ANNULEE"];

interface Props {
  order: OrderWithDetails;
  requests: OrderRequest[];
}

const OrderClientActions = ({ order, requests }: Props) => {
  const editable = isDirectlyEditable(order);
  const closed = CLOSED_STATUSES.includes(order.order_status);
  const pendingRequest = requests.find((r) => r.status === "EN_ATTENTE");

  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [requestType, setRequestType] = useState<OrderRequestType | "">("");
  const [requestReason, setRequestReason] = useState("");

  const { data: zones = [] } = useDeliveryZones();
  const updateItem = useClientUpdateOrderItem();
  const updateDelivery = useClientUpdateDelivery();
  const cancelOrder = useClientCancelOrder();
  const createRequest = useCreateOrderRequest();

  const [form, setForm] = useState({
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    delivery_address: order.delivery_address ?? "",
    delivery_region: order.delivery_region ?? "",
    delivery_city: order.delivery_city ?? "",
    delivery_quarter: order.delivery_quarter ?? "",
    customer_comment: order.customer_comment ?? "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const regions = Array.from(new Set(zones.map((z) => z.region))).sort();
  const cities = zones.filter((z) => z.region === form.delivery_region);

  const changeQty = async (itemId: string, quantity: number) => {
    try {
      await updateItem.mutateAsync({ itemId, quantity });
      toast.success(quantity === 0 ? "Article retiré" : "Quantité mise à jour");
    } catch (e) {
      toast.error("Modification impossible", { description: (e as Error).message });
    }
  };

  const saveDelivery = async () => {
    if (form.customer_name.trim().length < 2) return toast.error("Indiquez votre nom complet.");
    if (form.customer_phone.replace(/\D/g, "").length < 9) return toast.error("Numéro de téléphone invalide.");
    try {
      await updateDelivery.mutateAsync({ orderId: order.id, ...form });
      toast.success("Informations de livraison mises à jour");
      setEditing(false);
    } catch (e) {
      toast.error("Modification impossible", { description: (e as Error).message });
    }
  };

  const doCancel = async () => {
    try {
      await cancelOrder.mutateAsync({ orderId: order.id, reason: cancelReason.trim() || undefined });
      toast.success("Commande annulée");
      setCancelOpen(false);
    } catch (e) {
      toast.error("Annulation impossible", { description: (e as Error).message });
    }
  };

  const sendRequest = async () => {
    if (!requestType) return toast.error("Choisissez le type de demande.");
    if (requestReason.trim().length < 5) return toast.error("Précisez le motif (5 caractères minimum).");
    try {
      await createRequest.mutateAsync({ orderId: order.id, type: requestType, reason: requestReason.trim() });
      toast.success("Demande envoyée à notre équipe");
      setRequestReason("");
      setRequestType("");
    } catch (e) {
      toast.error("Envoi impossible", { description: (e as Error).message });
    }
  };

  return (
    <section className="border-t border-border pt-4 space-y-4">
      {requests.length > 0 && (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="text-xs bg-muted rounded-md p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{REQUEST_TYPE_LABELS[r.request_type]}</span>
                <Badge className={REQUEST_STATUS_CLASSES[r.status]}>{REQUEST_STATUS_LABELS[r.status]}</Badge>
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</span>
              </div>
              <p className="text-muted-foreground">Motif : {r.reason}</p>
              {r.admin_response && <p className="text-foreground">Réponse de l'équipe : {r.admin_response}</p>}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Tant que le paiement n'est pas déclaré, vous pouvez modifier ou annuler cette commande vous-même.
          </p>

          <div className="space-y-2">
            <p className="text-sm font-medium">Articles</p>
            <ul className="space-y-2">
              {order.order_items.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1">{it.product_name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="icon" className="h-9 w-9"
                      aria-label={`Diminuer la quantité de ${it.product_name}`}
                      disabled={updateItem.isPending || it.quantity <= 1}
                      onClick={() => changeQty(it.id, it.quantity - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-9 text-center font-medium">{it.quantity}</span>
                    <Button
                      variant="outline" size="icon" className="h-9 w-9"
                      aria-label={`Augmenter la quantité de ${it.product_name}`}
                      disabled={updateItem.isPending}
                      onClick={() => changeQty(it.id, it.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline" size="icon" className="h-9 w-9 text-destructive"
                      aria-label={`Retirer ${it.product_name}`}
                      disabled={updateItem.isPending || order.order_items.length <= 1}
                      onClick={() => changeQty(it.id, 0)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-24 text-right whitespace-nowrap">{formatFCFA(it.subtotal)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {editing ? (
            <div className="space-y-3 bg-muted/50 rounded-md p-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`n-${order.id}`}>Nom complet</Label>
                  <Input id={`n-${order.id}`} className="h-11" maxLength={100}
                    value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`p-${order.id}`}>Téléphone</Label>
                  <Input id={`p-${order.id}`} className="h-11" type="tel" inputMode="tel" maxLength={20}
                    value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`r-${order.id}`}>Région</Label>
                  <Select value={form.delivery_region}
                    onValueChange={(v) => { set("delivery_region", v); set("delivery_city", ""); }}>
                    <SelectTrigger id={`r-${order.id}`} className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`c-${order.id}`}>Ville</Label>
                  <Select value={form.delivery_city} onValueChange={(v) => set("delivery_city", v)} disabled={!form.delivery_region}>
                    <SelectTrigger id={`c-${order.id}`} className="h-11"><SelectValue placeholder="Choisir" /></SelectTrigger>
                    <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={c.city}>{c.city}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`a-${order.id}`}>Adresse</Label>
                  <Input id={`a-${order.id}`} className="h-11" maxLength={200}
                    value={form.delivery_address} onChange={(e) => set("delivery_address", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`q-${order.id}`}>Quartier / repère</Label>
                  <Input id={`q-${order.id}`} className="h-11" maxLength={120}
                    value={form.delivery_quarter} onChange={(e) => set("delivery_quarter", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`cm-${order.id}`}>Commentaire</Label>
                  <Textarea id={`cm-${order.id}`} rows={2} maxLength={500}
                    value={form.customer_comment} onChange={(e) => set("customer_comment", e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="min-h-11" onClick={saveDelivery} disabled={updateDelivery.isPending}>
                  {updateDelivery.isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button variant="outline" className="min-h-11" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4 mr-1" /> Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="min-h-11" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4 mr-1" /> Modifier mes informations
              </Button>
              <Button variant="outline" className="min-h-11 text-destructive" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4 mr-1" /> Annuler la commande
              </Button>
            </div>
          )}
        </div>
      )}

      {!editable && !closed && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Votre paiement étant enregistré, toute modification ou annulation doit être validée par notre équipe.
          </p>
          {pendingRequest ? (
            <p className="text-sm bg-warning/10 text-warning rounded-md p-3">
              Une demande est déjà en cours de traitement pour cette commande.
            </p>
          ) : (
            <div className="grid sm:grid-cols-[200px_1fr] gap-3 items-start">
              <Select value={requestType} onValueChange={(v) => setRequestType(v as OrderRequestType)}>
                <SelectTrigger className="h-11" aria-label="Type de demande">
                  <SelectValue placeholder="Type de demande" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MODIFICATION">Modification</SelectItem>
                  <SelectItem value="ANNULATION">Annulation</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-2">
                <Textarea
                  rows={2} maxLength={1000}
                  placeholder="Expliquez votre demande (produit à changer, motif d'annulation…)"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                />
                <Button className="min-h-11" onClick={sendRequest} disabled={createRequest.isPending}>
                  <Send className="h-4 w-4 mr-1" />
                  {createRequest.isPending ? "Envoi…" : "Envoyer la demande"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la commande {order.order_number} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Indiquez éventuellement le motif de votre annulation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            rows={2} maxLength={500} placeholder="Motif (optionnel)"
            value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={doCancel}>
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default OrderClientActions;
