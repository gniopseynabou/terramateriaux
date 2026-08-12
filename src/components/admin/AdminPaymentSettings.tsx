import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentSettings, type PaymentSetting } from "@/hooks/usePaymentSettings";

const SettingCard = ({ setting }: { setting: PaymentSetting }) => {
  const qc = useQueryClient();
  const [draft, setDraft] = useState({
    label: setting.label,
    account_name: setting.account_name ?? "",
    account_number: setting.account_number ?? "",
    instructions: setting.instructions ?? "",
    is_active: setting.is_active,
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("payment_settings")
        .update({
          label: draft.label.trim(),
          account_name: draft.account_name.trim() || null,
          account_number: draft.account_number.trim() || null,
          instructions: draft.instructions.trim() || null,
          is_active: draft.is_active,
        })
        .eq("id", setting.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Informations de paiement mises à jour");
      qc.invalidateQueries({ queryKey: ["payment-settings"] });
    },
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading font-semibold">{setting.label}</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor={`active-${setting.id}`} className="text-xs text-muted-foreground">Actif</Label>
          <Switch
            id={`active-${setting.id}`}
            checked={draft.is_active}
            onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Libellé</Label>
          <Input maxLength={60} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Titulaire du compte</Label>
          <Input maxLength={120} value={draft.account_name} onChange={(e) => setDraft({ ...draft, account_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Numéro / IBAN</Label>
          <Input maxLength={120} value={draft.account_number} onChange={(e) => setDraft({ ...draft, account_number: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Instructions</Label>
          <Input maxLength={255} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} />
        </div>
      </div>
      <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
};

const AdminPaymentSettings = () => {
  const { data: settings = [], isLoading } = usePaymentSettings(false);
  if (isLoading) return <Skeleton className="h-40 w-full rounded-lg" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ces informations sont affichées aux clients sur la page de commande et de confirmation.
      </p>
      {settings.map((s) => <SettingCard key={s.id} setting={s} />)}
    </div>
  );
};

export default AdminPaymentSettings;