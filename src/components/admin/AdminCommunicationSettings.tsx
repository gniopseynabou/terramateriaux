import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, Save, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCommunicationSettings } from "@/hooks/useCommunicationSettings";

const toWhatsAppUrl = (number: string, message: string) => {
  const digits = number.replace(/[^0-9]/g, "");
  const normalized = digits.length === 9 ? `221${digits}` : digits;
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : "#";
};

const AdminCommunicationSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useCommunicationSettings();
  const [form, setForm] = useState({
    whatsapp_number: "",
    whatsapp_message: "",
    public_email: "",
    technical_email: "",
    technical_whatsapp: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        whatsapp_number: settings.whatsapp_number,
        whatsapp_message: settings.whatsapp_message,
        public_email: settings.public_email,
        technical_email: settings.technical_email,
        technical_whatsapp: settings.technical_whatsapp,
      });
    }
  }, [settings]);

  const update = useMutation({
    mutationFn: async () => {
      if (!settings) throw new Error("Les réglages sont indisponibles.");
      const { error } = await supabase
        .from("communication_settings")
        .update({
          whatsapp_number: form.whatsapp_number.replace(/[^0-9+ ]/g, "").trim(),
          whatsapp_message: form.whatsapp_message.trim(),
          public_email: form.public_email.trim(),
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Communication et support mis à jour");
      queryClient.invalidateQueries({ queryKey: ["communication-settings"] });
    },
    onError: (error: Error) => toast.error("Enregistrement impossible", { description: error.message }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="font-heading font-semibold flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> WhatsApp client</h3>
          <p className="text-sm text-muted-foreground mt-1">Ces informations alimentent le bouton WhatsApp visible par les clients et visiteurs.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="public-whatsapp">Numéro WhatsApp public</Label>
          <Input id="public-whatsapp" value={form.whatsapp_number} maxLength={20} placeholder="+221 77 000 00 00" onChange={(event) => setForm({ ...form, whatsapp_number: event.target.value })} />
          <p className="text-xs text-muted-foreground">Utilisez l&apos;indicatif pays, par exemple +221.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp-message">Message prérempli</Label>
          <Textarea id="whatsapp-message" value={form.whatsapp_message} maxLength={500} rows={3} onChange={(event) => setForm({ ...form, whatsapp_message: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="public-email">Email public</Label>
          <Input id="public-email" type="email" value={form.public_email} maxLength={160} placeholder="contact@exemple.com" onChange={(event) => setForm({ ...form, public_email: event.target.value })} />
          <p className="text-xs text-muted-foreground">Cette adresse sera affichée dans le footer et sur la page Contact.</p>
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="font-heading font-semibold flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-primary" /> Support technique</h3>
          <p className="text-sm text-muted-foreground mt-1">Coordonnées utilisées par les administrateurs pour joindre l&apos;équipe technique.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="technical-email">Email technique </Label>
            <Input id="technical-email" type="email" value={form.technical_email} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="technical-whatsapp">WhatsApp technique </Label>
            <Input id="technical-whatsapp" value={form.technical_whatsapp} readOnly disabled />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <a href={form.technical_email ? `mailto:${form.technical_email}?subject=${encodeURIComponent("Besoin de support technique - T.M.I")}` : undefined}>
            <Button type="button" variant="outline" disabled={!form.technical_email}><Mail className="mr-2 h-4 w-4" /> Écrire à l&apos;équipe</Button>
          </a>
          <a href={toWhatsAppUrl(form.technical_whatsapp, "Bonjour, j'ai besoin d'une assistance technique pour l'espace administrateur T.M.I.")} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline" disabled={!form.technical_whatsapp}><MessageCircle className="mr-2 h-4 w-4" /> Support WhatsApp</Button>
          </a>
        </div>
      </section>

      <Button onClick={() => update.mutate()} disabled={update.isPending || !settings}>
        <Save className="mr-2 h-4 w-4" /> {update.isPending ? "Enregistrement..." : "Enregistrer les réglages"}
      </Button>
    </div>
  );
};

export default AdminCommunicationSettings;