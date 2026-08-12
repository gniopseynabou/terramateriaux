import { useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

interface Props {
  orderId: string;
  orderNumber: string;
  amount: number;
  userId: string | null;
  defaultMethod?: string | null;
  alreadyDeclared?: boolean;
}

/**
 * Immediate payment declaration: reference + amount + proof upload.
 * Payment stays "en attente de vérification" until an admin verifies it.
 */
const PaymentDeclarationCard = ({
  orderId,
  orderNumber,
  amount,
  userId,
  defaultMethod,
  alreadyDeclared = false,
}: Props) => {
  const { data: methods = [] } = usePaymentSettings();
  const qc = useQueryClient();
  const [method, setMethod] = useState(defaultMethod ?? "");
  const [reference, setReference] = useState("");
  const [paidAmount, setPaidAmount] = useState(String(amount));
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(alreadyDeclared);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const MAX_PROOF_MB = 5;
  const validate = () => {
    const e: Record<string, string> = {};
    if (!method) e.method = "Choisissez le moyen de paiement utilisé.";
    const n = Number(paidAmount);
    if (!paidAmount.trim() || Number.isNaN(n)) e.amount = "Indiquez le montant payé.";
    else if (n <= 0) e.amount = "Le montant doit être supérieur à 0 FCFA.";
    else if (amount > 0 && n > amount * 1.5) e.amount = "Le montant dépasse largement le total de la commande.";
    if (reference.trim().length > 100) e.reference = "La référence ne doit pas dépasser 100 caractères.";
    if (comment.trim().length > 500) e.comment = "Le commentaire ne doit pas dépasser 500 caractères.";
    if (file) {
      if (file.size > MAX_PROOF_MB * 1024 * 1024) e.file = `Le fichier ne doit pas dépasser ${MAX_PROOF_MB} Mo.`;
      else if (!/^image\//.test(file.type) && file.type !== "application/pdf")
        e.file = "Formats acceptés : image ou PDF.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) {
      toast.error("Veuillez corriger les informations saisies.");
      return;
    }
    setSaving(true);
    try {
      let proofUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId ?? "guest"}/${orderId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        proofUrl = signed?.signedUrl ?? path;
      }

      const { error: rpcErr } = await supabase.rpc("declare_payment", {
        _order_id: orderId,
        _payment_method: method,
        _amount: Number(paidAmount) || amount,
        _reference: reference.trim() || orderNumber,
        _proof_url: proofUrl,
        _comment: comment.trim() || null,
      });
      if (rpcErr) throw rpcErr;

      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", orderNumber] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-payments"] });
      setDone(true);
      toast.success("Paiement enregistré. Merci !");
    } catch (e) {
      console.error(e);
      toast.error("Enregistrement impossible", { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <section className="rounded-lg border border-success/30 bg-success/5 p-5 space-y-2 text-sm">
        <p className="flex items-center gap-2 font-semibold text-success">
          <CheckCircle2 className="h-5 w-5" /> Merci, votre paiement a bien été enregistré.
        </p>
        <p className="text-muted-foreground">
          Notre équipe vérifiera votre transaction dans les meilleurs délais. Après vérification, nous
          préparerons votre commande et vous contacterons uniquement si une information complémentaire est
          nécessaire. Vous pouvez suivre l'évolution de votre commande depuis votre espace client.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-card border border-border rounded-lg p-5 space-y-4">
      <h3 className="font-heading font-semibold">J'ai effectué mon paiement</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Moyen de paiement utilisé</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="h-11" aria-label="Moyen de paiement utilisé" aria-invalid={!!errors.method}>
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {methods.map((m) => (
                <SelectItem key={m.id} value={m.method_key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.method && <p role="alert" className="text-sm text-destructive">{errors.method}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ref">
            Référence de transaction <span className="text-muted-foreground font-normal">(optionnel)</span>
          </Label>
          <Input id="ref" className="h-11" maxLength={100} value={reference} aria-invalid={!!errors.reference}
            onChange={(e) => setReference(e.target.value)} placeholder="Ex : TXN123456" />
          {errors.reference && <p role="alert" className="text-sm text-destructive">{errors.reference}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amt">Montant payé (FCFA)</Label>
          <Input id="amt" className="h-11" type="number" inputMode="numeric" min={1} value={paidAmount}
            aria-invalid={!!errors.amount} aria-describedby={errors.amount ? "err-amt" : undefined}
            onChange={(e) => setPaidAmount(e.target.value)} />
          {errors.amount && <p id="err-amt" role="alert" className="text-sm text-destructive">{errors.amount}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proof">
            Capture d'écran / reçu <span className="text-muted-foreground font-normal">(optionnel)</span>
          </Label>
          <Input id="proof" className="h-11" type="file" accept="image/*,application/pdf"
            aria-invalid={!!errors.file} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {errors.file && <p role="alert" className="text-sm text-destructive">{errors.file}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pay-comment">Commentaire (optionnel)</Label>
        <Textarea id="pay-comment" rows={2} maxLength={500} placeholder="Commentaire (optionnel)" value={comment}
          onChange={(e) => setComment(e.target.value)} />
        {errors.comment && <p role="alert" className="text-sm text-destructive">{errors.comment}</p>}
      </div>
      <Button className="w-full min-h-11" size="lg" disabled={saving} onClick={submit}>
        <Upload className="h-4 w-4 mr-2" />
        {saving ? "Enregistrement..." : "J'ai effectué mon paiement"}
      </Button>
    </section>
  );
};

export default PaymentDeclarationCard;
