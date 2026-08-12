import { Copy, Info, Wallet } from "lucide-react";
import { toast } from "sonner";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Displays the merchant payout accounts stored in Supabase (payment_settings).
 * No online payment gateway is connected yet — this is informational only.
 */
interface Props {
  /** When set, only this payment method is displayed (chosen at checkout). */
  methodKey?: string | null;
}

const PaymentInfoCard = ({ methodKey }: Props = {}) => {
  const { data: allMethods = [], isLoading } = usePaymentSettings();
  const filtered = methodKey ? allMethods.filter((m) => m.method_key === methodKey) : [];
  const methods = filtered.length > 0 ? filtered : allMethods;

  const copy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copié", { description: value });
  };

  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (methods.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-lg p-5 space-y-4">
      <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" /> Informations de paiement
      </h2>

      <div className="grid sm:grid-cols-2 gap-3">
        {methods.map((m) => (
          <div key={m.id} className="rounded-md border border-border p-3 space-y-1">
            <p className="font-medium text-sm">{m.label}</p>
            {m.account_name && <p className="text-xs text-muted-foreground">{m.account_name}</p>}
            {m.account_number && (
              <button
                onClick={() => copy(m.account_number!)}
                className="inline-flex items-center gap-1.5 text-sm font-mono text-primary hover:opacity-70"
              >
                {m.account_number} <Copy className="h-3.5 w-3.5" />
              </button>
            )}
            {m.instructions && <p className="text-xs text-muted-foreground">{m.instructions}</p>}
            {m.qr_url && (
              <img
                src={m.qr_url}
                alt={`QR code ${m.label}`}
                loading="lazy"
                className="mt-2 h-32 w-32 rounded-md border border-border object-contain bg-background"
              />
            )}
          </div>
        ))}
      </div>

      <p className="flex items-start gap-2 text-xs bg-warning/10 text-warning-foreground rounded-md p-3">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-warning" />
        <span className="text-foreground">
          Effectuez le paiement avec les informations ci-dessus, puis déclarez-le pour accélérer le traitement de votre commande.
        </span>
      </p>
    </section>
  );
};

export default PaymentInfoCard;