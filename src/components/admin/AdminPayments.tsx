import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/hooks/useProducts";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { useToast } from "@/hooks/use-toast";
import { pushNotification } from "@/hooks/useNotifications";
import { ORDER_STATUS_NOTIFICATIONS } from "@/lib/orderStatus";
import { CheckCircle2, XCircle, RefreshCw, ExternalLink, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Payment = Tables<"payments"> & {
  orders?: { order_number: string; customer_name: string; user_id: string | null; payment_status?: string | null; order_status?: string | null } | null;
  isCashCollection?: boolean;
};

const isPaymentFinalized = (payment: Payment) =>
  payment.status === "verified" || payment.status === "paid"
  || payment.orders?.payment_status === "verified" || payment.orders?.payment_status === "paid"
  || payment.orders?.order_status === "PAIEMENT_RECU"
  || ["PREPARATION", "EXPEDIEE", "LIVREE", "TERMINEE"].includes(payment.orders?.order_status ?? "");

const statusColor = (s: string) => {
  switch (s) {
    case "verified":
    case "paid": return "bg-success/10 text-success";
    case "proof_uploaded": return "bg-warning/10 text-warning";
    case "rejected": return "bg-destructive/10 text-destructive";
    default: return "bg-muted text-muted-foreground";
  }
};

const statusLabel = (s: string) => ({
  pending: "En attente",
  proof_uploaded: "Preuve envoyée",
  verified: "Validé",
  rejected: "Refusé",
  paid: "Payé",
}[s] ?? s);

const AdminPayments = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [cashProofs, setCashProofs] = useState<Record<string, File | null>>({});
  const [proofPreview, setProofPreview] = useState<{ url: string; name: string } | null>(null);
  const { data: methods = [] } = usePaymentSettings(false);
  const methodLabel = (key: string) => methods.find((m) => m.method_key === key)?.label ?? key;

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const [{ data: paymentData, error: paymentError }, { data: cashOrders, error: ordersError }] = await Promise.all([
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("id, order_number, customer_name, user_id, total, estimated_total, final_total, payment_method, payment_status, order_status, created_at").eq("payment_method", "cash_on_delivery").order("created_at", { ascending: false }),
      ]);
      if (paymentError) throw paymentError;
      if (ordersError) throw ordersError;

      const paymentRows = (paymentData ?? []) as Tables<"payments">[];
      const paymentOrderIds = [...new Set(paymentRows.map((payment) => payment.order_id))];
      const { data: paymentOrders, error: paymentOrdersError } = paymentOrderIds.length
        ? await supabase.from("orders").select("id, order_number, customer_name, user_id, payment_status, order_status").in("id", paymentOrderIds)
        : { data: [], error: null };
      if (paymentOrdersError) throw paymentOrdersError;
      const ordersById = new Map((paymentOrders ?? []).map((order) => [order.id, order]));
      const payments = paymentRows.map((payment) => ({ ...payment, orders: ordersById.get(payment.order_id) ?? null })) as Payment[];
      const representedCashOrders = new Set(
        payments.filter((payment) => payment.payment_method === "cash_on_delivery").map((payment) => payment.order_id),
      );
      const awaitingCashPayments = (cashOrders ?? [])
        .filter((order) => !representedCashOrders.has(order.id) && order.payment_status !== "paid" && order.payment_status !== "verified" && order.order_status !== "PAIEMENT_RECU" && !["PREPARATION", "EXPEDIEE", "LIVREE", "TERMINEE"].includes(order.order_status ?? ""))
        .map((order) => ({
          id: `cash:${order.id}`,
          order_id: order.id,
          user_id: order.user_id,
          payment_method: "cash_on_delivery",
          amount: Number(order.final_total ?? order.estimated_total ?? order.total),
          currency: "FCFA",
          reference: order.order_number,
          proof_url: null,
          status: "pending",
          admin_comment: null,
          validated_by: null,
          validated_at: null,
          created_at: order.created_at,
          updated_at: order.created_at,
          orders: { order_number: order.order_number, customer_name: order.customer_name, user_id: order.user_id, payment_status: order.payment_status, order_status: order.order_status },
          isCashCollection: true,
        })) as Payment[];
      return [...payments, ...awaitingCashPayments];
    },
  });

  const markCashPayment = useMutation({
    mutationFn: async ({ orderId, file }: { orderId: string; file: File | null }) => {
      let proofUrl: string | null = null;
      if (file) {
        const extension = file.name.split(".").pop() || "jpg";
        const path = `admin/${orderId}/${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: signed, error: signedError } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signedError) throw signedError;
        proofUrl = signed.signedUrl;
      }
      const { error } = await supabase.rpc("admin_mark_cash_payment", { _order_id: orderId, _proof_url: proofUrl });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Paiement à la livraison enregistré" });
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error: Error) => toast({ title: "Erreur", description: error.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, order_id, comment, customer_user_id }: {
      id: string; status: "verified" | "rejected" | "paid"; order_id: string; comment?: string; customer_user_id?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("payments").update({
        status,
        admin_comment: comment ?? null,
        validated_by: user?.id ?? null,
        validated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;

      const orderPatch: Record<string, string> = { payment_status: status };
      if (status === "verified" || status === "paid") {
        orderPatch.status = "confirmée";
        orderPatch.order_status = "PAIEMENT_RECU";
      }
      await supabase.from("orders").update(orderPatch).eq("id", order_id);

      if (status === "verified" || status === "paid") {
        await supabase.from("order_history").insert({
          order_id,
          status: "PAIEMENT_RECU",
          comment: comment ?? "Paiement vérifié par un administrateur.",
          created_by: user?.id ?? null,
        });
        await pushNotification({
          user_id: customer_user_id ?? null,
          order_id,
          ...ORDER_STATUS_NOTIFICATIONS.PAIEMENT_RECU,
        });

        // Le paiement vérifié fait automatiquement passer la commande en préparation.
        const { error: prepError } = await supabase
          .from("orders")
          .update({ order_status: "PREPARATION" })
          .eq("id", order_id);
        if (!prepError) {
          await supabase.from("order_history").insert({
            order_id,
            status: "PREPARATION",
            comment: "Passage automatique en préparation après vérification du paiement.",
            created_by: user?.id ?? null,
          });
          await pushNotification({
            user_id: customer_user_id ?? null,
            order_id,
            ...ORDER_STATUS_NOTIFICATIONS.PREPARATION,
          });
        }
      }
    },
    onSuccess: (_, v) => {
      toast({ title: `Paiement ${statusLabel(v.status).toLowerCase()}` });
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const requestNewProof = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      const { error } = await supabase.from("payments").update({
        status: "pending",
        admin_comment: comment,
        proof_url: null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Nouvelle preuve demandée" });
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
    },
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Chargement...</p>;

  if (error) {
    return <p className="text-sm text-destructive">Impossible de charger les paiements : {(error as Error).message}</p>;
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
        <p>Aucun paiement pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((p) => (
        <div key={p.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-semibold">{p.orders?.order_number ?? p.reference}</span>
                <Badge className={statusColor(p.status)}>{p.isCashCollection ? "À encaisser" : statusLabel(p.status)}</Badge>
                <Badge variant="outline">{methodLabel(p.payment_method)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {p.orders?.customer_name ?? "Client"} · {new Date(p.created_at).toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="text-right">
              <div className="font-heading font-bold text-lg text-primary">{formatFCFA(Number(p.amount))}</div>
            </div>
          </div>

          {p.proof_url ? (
            <button
              type="button"
              onClick={() => setProofPreview({ url: p.proof_url!, name: p.orders?.order_number ?? p.reference ?? "Preuve de paiement" })}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" /> Voir la preuve de paiement
            </button>
          ) : (
            <p className="text-sm text-muted-foreground italic">Aucune preuve téléversée.</p>
          )}

          {p.admin_comment && (
            <p className="text-xs bg-muted p-2 rounded">Commentaire : {p.admin_comment}</p>
          )}

          {!isPaymentFinalized(p) && !p.isCashCollection && (p.status === "proof_uploaded" || p.status === "pending") && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Textarea
                placeholder="Commentaire (optionnel, obligatoire pour refus / demande de nouvelle preuve)"
                value={comments[p.id] ?? ""}
                onChange={(e) => setComments({ ...comments, [p.id]: e.target.value })}
                className="text-sm"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => updateStatus.mutate({ id: p.id, status: "verified", order_id: p.order_id, comment: comments[p.id], customer_user_id: p.orders?.user_id ?? null })}
                  disabled={updateStatus.isPending || !p.proof_url}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Valider
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateStatus.mutate({ id: p.id, status: "rejected", order_id: p.order_id, comment: comments[p.id] || "Preuve refusée", customer_user_id: p.orders?.user_id ?? null })}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Refuser
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => requestNewProof.mutate({ id: p.id, comment: comments[p.id] || "Merci de renvoyer une preuve claire." })}
                  disabled={requestNewProof.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Nouvelle preuve
                </Button>
              </div>
            </div>
          )}

          {p.isCashCollection && !isPaymentFinalized(p) && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={`cash-proof-${p.order_id}`}
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(event) => setCashProofs({ ...cashProofs, [p.order_id]: event.target.files?.[0] ?? null })}
              />
              <Button size="sm" variant="outline" onClick={() => document.getElementById(`cash-proof-${p.order_id}`)?.click()}>
                <ExternalLink className="h-4 w-4 mr-1" /> {cashProofs[p.order_id] ? "Preuve sélectionnée" : "Ajouter une preuve (facultatif)"}
              </Button>
              <Button
                size="sm"
                onClick={() => markCashPayment.mutate({ orderId: p.order_id, file: cashProofs[p.order_id] ?? null })}
                disabled={markCashPayment.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" /> Marquer encaissé
              </Button>
            </div>
          )}
        </div>
      ))}

      <Dialog open={!!proofPreview} onOpenChange={(open) => !open && setProofPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preuve de paiement</DialogTitle>
            <DialogDescription>{proofPreview?.name}</DialogDescription>
          </DialogHeader>
          {proofPreview && (/\.pdf(?:\?|$)/i.test(proofPreview.url) ? (
            <iframe
              src={proofPreview.url}
              title={`Preuve de paiement ${proofPreview.name}`}
              className="h-[65vh] w-full rounded-md border border-border"
            />
          ) : (
            <img
              src={proofPreview.url}
              alt={`Preuve de paiement ${proofPreview.name}`}
              className="max-h-[65vh] w-full rounded-md border border-border object-contain"
            />
          ))}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayments;