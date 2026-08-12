import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, User as UserIcon } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";

const Profile = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const update = useUpdateProfile(user?.id);
  const { data: zones = [] } = useDeliveryZones();

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    region: "",
    city: "",
    quarter: "",
    delivery_notes: "",
    preferred_delivery_method: "livraison",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        region: profile.region ?? "",
        city: profile.city ?? "",
        quarter: profile.quarter ?? "",
        delivery_notes: profile.delivery_notes ?? "",
        preferred_delivery_method: profile.preferred_delivery_method ?? "livraison",
      });
    }
  }, [profile]);

  const regions = Array.from(new Set(zones.map((z) => z.region))).sort();
  const cities = zones.filter((z) => z.region === form.region);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.full_name.trim().length < 2) e.full_name = "Indiquez votre nom complet (2 caractères minimum).";
    if (form.full_name.trim().length > 100) e.full_name = "Le nom ne doit pas dépasser 100 caractères.";
    const digits = form.phone.replace(/[^0-9]/g, "");
    if (form.phone && (digits.length < 9 || digits.length > 15)) e.phone = "Numéro de téléphone invalide (9 à 15 chiffres).";
    if (form.preferred_delivery_method === "livraison" && !form.city) e.city = "Choisissez votre ville de livraison habituelle.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      await update.mutateAsync({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        region: form.region || null,
        city: form.city || null,
        quarter: form.quarter.trim() || null,
        delivery_notes: form.delivery_notes.trim() || null,
        preferred_delivery_method: form.preferred_delivery_method,
      });
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error("Mise à jour impossible", { description: (err as Error).message });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2 mb-1">
          <UserIcon className="h-6 w-6 text-primary" aria-hidden="true" /> Mon profil
        </h1>
        <p className="text-muted-foreground mb-6 text-sm">
          Vos informations sont réutilisées automatiquement lors de vos prochaines commandes.
        </p>

        {isLoading ? (
          <p className="text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>
        ) : (
          <form onSubmit={submit} className="space-y-6 bg-card border border-border rounded-lg p-4 sm:p-6" noValidate>
            <fieldset className="space-y-4">
              <legend className="font-heading font-semibold mb-2">Informations personnelles</legend>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input id="full_name" value={form.full_name} maxLength={100} onChange={(e) => set("full_name", e.target.value)}
                  aria-invalid={!!errors.full_name} aria-describedby={errors.full_name ? "err-name" : undefined} className="h-11" />
                {errors.full_name && <p id="err-name" role="alert" className="text-sm text-destructive">{errors.full_name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" type="tel" inputMode="tel" value={form.phone} maxLength={20} placeholder="+221 77 000 00 00"
                  onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "err-phone" : undefined} className="h-11" />
                {errors.phone && <p id="err-phone" role="alert" className="text-sm text-destructive">{errors.phone}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={form.address} maxLength={200} onChange={(e) => set("address", e.target.value)} className="h-11" />
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="font-heading font-semibold mb-2">Préférences de livraison</legend>
              <RadioGroup
                value={form.preferred_delivery_method}
                onValueChange={(v) => set("preferred_delivery_method", v)}
                className="grid sm:grid-cols-2 gap-3"
              >
                <Label htmlFor="pref-livraison" className="flex items-center gap-3 border border-border rounded-md p-3 min-h-11 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value="livraison" id="pref-livraison" />
                  <span className="text-sm font-medium">Livraison à domicile</span>
                </Label>
                <Label htmlFor="pref-retrait" className="flex items-center gap-3 border border-border rounded-md p-3 min-h-11 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <RadioGroupItem value="retrait" id="pref-retrait" />
                  <span className="text-sm font-medium">Retrait en boutique</span>
                </Label>
              </RadioGroup>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="region">Région</Label>
                  <Select value={form.region} onValueChange={(v) => { set("region", v); set("city", ""); }}>
                    <SelectTrigger id="region" className="h-11"><SelectValue placeholder="Choisir une région" /></SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">Ville</Label>
                  <Select value={form.city} onValueChange={(v) => set("city", v)} disabled={!form.region}>
                    <SelectTrigger id="city" className="h-11" aria-invalid={!!errors.city}>
                      <SelectValue placeholder={form.region ? "Choisir une ville" : "Choisissez d'abord la région"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((c) => <SelectItem key={c.id} value={c.city}>{c.city}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.city && <p role="alert" className="text-sm text-destructive">{errors.city}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quarter">Quartier / repère</Label>
                <Input id="quarter" value={form.quarter} maxLength={120} onChange={(e) => set("quarter", e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Instructions de livraison (optionnel)</Label>
                <Textarea id="notes" rows={3} maxLength={500} value={form.delivery_notes} onChange={(e) => set("delivery_notes", e.target.value)} />
              </div>
            </fieldset>

            <Button type="submit" size="lg" className="w-full min-h-11" disabled={update.isPending}>
              <Save className="h-4 w-4 mr-2" aria-hidden="true" />
              {update.isPending ? "Enregistrement…" : "Enregistrer mes informations"}
            </Button>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
