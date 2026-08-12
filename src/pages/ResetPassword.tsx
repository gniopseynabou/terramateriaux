import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");
    setSaving(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      toast.success("Mot de passe mis à jour");
      navigate("/mes-commandes", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-md">
        <div className="bg-card p-6 md:p-8 rounded-lg border border-border">
          <h1 className="text-2xl font-heading font-bold text-center mb-2 flex items-center justify-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" /> Nouveau mot de passe
          </h1>
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Ouvrez cette page depuis le lien de réinitialisation reçu par e-mail. Le lien est valable une seule fois
              et expire rapidement pour votre sécurité.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4 mt-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="new-pass">Nouveau mot de passe</Label>
                <Input id="new-pass" type="password" className="h-11" value={password} minLength={8}
                  onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pass">Confirmer le mot de passe</Label>
                <Input id="confirm-pass" type="password" className="h-11" value={confirm} minLength={8}
                  onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button className="w-full min-h-11" size="lg" disabled={saving}>
                {saving ? "Enregistrement…" : "Mettre à jour mon mot de passe"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;
