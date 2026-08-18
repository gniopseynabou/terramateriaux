import { useState } from "react";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast({ title: "Erreur", description: "Nom et message sont requis.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("contact_messages").insert({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        subject: subject.trim() || null,
        message: message.trim(),
      });
      if (error) throw error;
      toast({ title: "Message envoyé !", description: "Nous vous répondrons dans les plus brefs délais." });
      setName(""); setEmail(""); setPhone(""); setSubject(""); setMessage("");
    } catch (err: unknown) {
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Erreur inconnue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 md:py-16">
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-center mb-10">Nous contacter</h1>

        <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Une question, une commande spéciale ou un partenariat ? N'hésitez pas à nous contacter.
            </p>
            <div className="space-y-4">
              {[
                { icon: Phone, label: "Téléphone", value: "+221 XX XXX XX XX" },
                { icon: Mail, label: "Email", value: "contact@tmi-senegal.com" },
                { icon: MapPin, label: "Adresse", value: "Kédougou, Sénégal" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <a href="https://wa.me/221XXXXXXXXX" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="lg" className="w-full mt-4">
                <MessageCircle className="h-5 w-5 mr-2" /> WhatsApp
              </Button>
            </a>
          </div>

          <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg border border-border space-y-4">
            <h3 className="font-heading font-semibold text-lg">Formulaire de contact</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label htmlFor="cName">Nom</Label><Input id="cName" placeholder="Votre nom" value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div><Label htmlFor="cEmail">Email</Label><Input id="cEmail" type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <div><Label htmlFor="cPhone">Téléphone</Label><Input id="cPhone" placeholder="+221..." value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label htmlFor="cSubject">Sujet</Label><Input id="cSubject" placeholder="Objet de votre message" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><Label htmlFor="cMsg">Message</Label><Textarea id="cMsg" placeholder="Votre message..." rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required /></div>
            <Button className="w-full" disabled={loading}>{loading ? "Envoi..." : "Envoyer le message"}</Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
