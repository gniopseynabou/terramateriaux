import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { ArrowRight, Info, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Layout from "@/components/Layout";
import { useCart } from "@/contexts/CartContext";
import { formatFCFA } from "@/hooks/useProducts";
import { useCreateOrder } from "@/hooks/useOrders";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

const checkoutSchema = z.object({
  nom: z.string().trim().min(2, "Nom trop court").max(100),
  tel: z.string().trim().min(6, "Téléphone invalide").max(30),
  email: z.union([z.string().trim().email("Email invalide").max(255), z.literal("")]),
  region: z.string().trim().min(2, "Région requise").max(100),
  ville: z.string().trim().min(2, "Ville requise").max(100),
  quartier: z.string().trim().min(2, "Quartier requis").max(100),
  adresse: z.string().trim().min(3, "Adresse requise").max(255),
  repere: z.string().trim().max(255).optional(),
  commentaire: z.string().trim().max(1000).optional(),
});

const Checkout = () => {
  const { items, subtotal, deliveryFee, total, deliveryMethod, customer, setCustomer, clearCart } = useCart();
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const { data: paymentMethods = [] } = usePaymentSettings();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  const field = (key: keyof typeof customer) => ({
    value: customer[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCustomer({ ...customer, [key]: e.target.value }),
  });

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/40 mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Votre panier est vide</h1>
          <Link to="/catalogue"><Button>Parcourir le catalogue</Button></Link>
        </div>
      </Layout>
    );
  }

  const options = [
    ...paymentMethods.map((m) => ({ key: m.method_key, label: m.label, hint: m.account_name ?? "" })),
    { key: "cash_on_delivery", label: "Paiement à la livraison", hint: "Réglez à la réception" },
  ];

  const handleSubmit = async () => {
    const parsed = checkoutSchema.safeParse(customer);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { fieldErrors[String(i.path[0])] = i.message; });
      setErrors(fieldErrors);
      toast.error("Veuillez corriger les informations de livraison.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Choisissez un moyen de paiement.");
      return;
    }
    setErrors({});

    try {
      const order = await createOrder.mutateAsync({
        customer_name: parsed.data.nom,
        customer_phone: parsed.data.tel,
        customer_email: parsed.data.email || undefined,
        customer_comment: [parsed.data.repere && `Point de repère : ${parsed.data.repere}`, parsed.data.commentaire]
          .filter(Boolean).join(" - ") || undefined,
        delivery_method: deliveryMethod,
        delivery_address: parsed.data.adresse,
        delivery_region: parsed.data.region,
        delivery_city: parsed.data.ville,
        delivery_quarter: parsed.data.quartier,
        delivery_fee: deliveryFee,
        subtotal,
        total,
        payment_method: paymentMethod,
        items: items.map((item) => {
          const unit = item.isGros ? item.product.price_gros : item.product.price_fcfa;
          return {
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: unit,
            is_gros: item.isGros,
            subtotal: unit * item.quantity,
          };
        }),
      });
      clearCart();
      navigate(`/confirmation/${order.order_number}`);
    } catch (e) {
      toast.error("Enregistrement impossible", { description: (e as Error).message });
    }
  };

  const err = (k: string) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 md:py-10 max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-6">Finaliser ma commande</h1>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            <section className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="font-heading font-semibold text-lg">Informations de livraison</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nom">Nom complet *</Label>
                  <Input id="nom" maxLength={100} {...field("nom")} />{err("nom")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tel">Téléphone *</Label>
                  <Input id="tel" maxLength={30} {...field("tel")} />{err("tel")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <Input id="email" type="email" maxLength={255} {...field("email")} />{err("email")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region">Région *</Label>
                  <Input id="region" maxLength={100} {...field("region")} />{err("region")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input id="ville" maxLength={100} {...field("ville")} />{err("ville")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quartier">Quartier *</Label>
                  <Input id="quartier" maxLength={100} {...field("quartier")} />{err("quartier")}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="adresse">Adresse complète *</Label>
                  <Input id="adresse" maxLength={255} {...field("adresse")} />{err("adresse")}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="repere">Point de repère (optionnel)</Label>
                  <Input id="repere" maxLength={255} {...field("repere")} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
                  <Textarea id="commentaire" rows={3} maxLength={1000} {...field("commentaire")} />
                </div>
              </div>
            </section>

            <section className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 className="font-heading font-semibold text-lg">Moyen de paiement</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid sm:grid-cols-2 gap-3">
                {options.map((o) => (
                  <label
                    key={o.key}
                    htmlFor={`pm-${o.key}`}
                    className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                      paymentMethod === o.key ? "border-primary bg-accent/50" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem id={`pm-${o.key}`} value={o.key} className="mt-1" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{o.label}</span>
                      {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                    </span>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Les coordonnées de paiement s'afficheront immédiatement après la confirmation de votre commande.
              </p>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
            <section className="bg-card border border-border rounded-lg p-5 space-y-3">
              <h2 className="font-heading font-semibold text-lg">Récapitulatif</h2>
              <ul className="space-y-2 text-sm">
                {items.map((i) => {
                  const unit = i.isGros ? i.product.price_gros : i.product.price_fcfa;
                  return (
                    <li key={i.product.id} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        {i.product.name} × {i.quantity}
                        <span className="block text-xs text-muted-foreground">{formatFCFA(unit)} / unité</span>
                      </span>
                      <span className="whitespace-nowrap">{formatFCFA(unit * i.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Sous-total</span><span>{formatFCFA(subtotal)}</span></div>
                <div className="flex justify-between">
                  <span>Frais de livraison</span>
                  <span>{deliveryMethod === "retrait" ? "0 FCFA (retrait)" : formatFCFA(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-heading font-bold text-base pt-1">
                  <span>Total estimatif</span><span className="text-primary">{formatFCFA(total)}</span>
                </div>
              </div>
              <p className="flex items-start gap-2 text-xs bg-accent/60 rounded-md p-3">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                Le montant affiché est estimatif. Les frais de livraison et le montant final peuvent être ajustés
                par notre équipe avant l'expédition.
              </p>
              <Button className="w-full" size="lg" disabled={createOrder.isPending} onClick={handleSubmit}>
                {createOrder.isPending ? "Enregistrement..." : "Confirmer ma commande"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </section>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
