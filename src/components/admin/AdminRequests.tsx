import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Inbox, XCircle, Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  REQUEST_STATUS_CLASSES, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS,
  useAdminOrderRequests, useHandleOrderRequest, type OrderRequestStatus,
} from "@/hooks/useOrderRequests";

const AdminRequests = () => {
  const { data: requests = [], isLoading } = useAdminOrderRequests();
  const handle = useHandleOrderRequest();
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<OrderRequestStatus | "ALL">("EN_ATTENTE");

  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;

  const filtered = requests.filter((r) => filter === "ALL" || r.status === filter);

  const act = async (id: string, status: OrderRequestStatus, orderId: string, userId: string | null) => {
    const response = (responses[id] ?? "").trim();
    if (status === "REFUSEE" && !response) {
      toast.error("Indiquez le motif du refus pour informer le client.");
      return;
    }
    try {
      await handle.mutateAsync({ id, status, response, orderId, userId });
      toast.success(`Demande ${REQUEST_STATUS_LABELS[status].toLowerCase()}`);
    } catch (e) {
      toast.error("Action impossible", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <Select value={filter} onValueChange={(v) => setFilter(v as OrderRequestStatus | "ALL")}>
        <SelectTrigger className="max-w-xs h-11" aria-label="Filtrer les demandes"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Toutes les demandes</SelectItem>
          {(Object.keys(REQUEST_STATUS_LABELS) as OrderRequestStatus[]).map((s) => (
            <SelectItem key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
          <p>Aucune demande à afficher.</p>
        </div>
      )}

      {filtered.map((r) => (
        <div key={r.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold">{r.orders?.order_number ?? "—"}</span>
                <Badge variant="outline">{REQUEST_TYPE_LABELS[r.request_type]}</Badge>
                <Badge className={REQUEST_STATUS_CLASSES[r.status]}>{REQUEST_STATUS_LABELS[r.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {r.orders?.customer_name ?? "Client"} · {r.orders?.customer_phone ?? "—"} ·{" "}
                {new Date(r.created_at).toLocaleString("fr-FR")}
              </p>
            </div>
          </div>

          <p className="text-sm bg-muted rounded-md p-3">Motif du client : {r.reason}</p>
          {r.admin_response && (
            <p className="text-sm text-muted-foreground">Réponse envoyée : {r.admin_response}</p>
          )}

          {r.status === "EN_ATTENTE" && (
            <div className="space-y-2 border-t border-border pt-3">
              <Textarea
                rows={2} maxLength={1000}
                placeholder="Réponse envoyée au client (obligatoire en cas de refus)"
                value={responses[r.id] ?? ""}
                onChange={(e) => setResponses({ ...responses, [r.id]: e.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="min-h-11" disabled={handle.isPending}
                  onClick={() => act(r.id, "ACCEPTEE", r.order_id, r.user_id)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Accepter
                </Button>
                <Button size="sm" variant="destructive" className="min-h-11" disabled={handle.isPending}
                  onClick={() => act(r.id, "REFUSEE", r.order_id, r.user_id)}>
                  <XCircle className="h-4 w-4 mr-1" /> Refuser
                </Button>
                <Button size="sm" variant="outline" className="min-h-11" disabled={handle.isPending}
                  onClick={() => act(r.id, "TRAITEE", r.order_id, r.user_id)}>
                  <Archive className="h-4 w-4 mr-1" /> Marquer traitée
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminRequests;
