import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "@/components/Layout";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn, MailCheck, UserPlus } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/errorUtils";
import { useAuth } from "@/hooks/useAuth";
import { getPostAuthRedirect } from "@/lib/authRedirect";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [mode, setMode] = useState<"auth" | "forgot">("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const redirectTarget = getPostAuthRedirect(new URLSearchParams(location.search).get("redirect"));

  // Rediriger si déjà connecté - ne pas montrer la page login
  // Sauf pendant le flux de réinitialisation du mot de passe.
  useEffect(() => {
    if (location.pathname === "/reset-password") return;

    if (!authLoading && user) {
      navigate(isAdmin ? "/admin" : "/mes-commandes", { replace: true });
    }
  }, [authLoading, user, isAdmin, navigate, location.pathname]);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: getFriendlyErrorMessage(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Connexion réussie" });
        const { data: isAdminRole } = await supabase.rpc("has_role", {
          _user_id: data.user.id,
          _role: "admin",
        });
        navigate(isAdminRole ? "/admin" : redirectTarget, { replace: true });
      } else {
        const { data: emailExists, error: checkError } = await supabase.rpc("check_email_exists", {
          email_to_check: email.trim(),
        });

        if (checkError) {
          console.error("Error checking email:", checkError);
          throw new Error("Erreur lors de la vérification de l'email.");
        }

        if (emailExists) {
          throw new Error("Un compte existe déjà avec cette adresse email.");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Inscription réussie",
          description: "Vérifiez votre email pour confirmer votre compte.",
        });
        navigate(redirectTarget, { replace: true });
      }
    } catch (err: unknown) {
      toast({
        title: "Erreur",
        description: getFriendlyErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-10 md:py-16 max-w-md">
        <div className="bg-card p-6 md:p-8 rounded-lg border border-border">
          {mode === "forgot" ? (
            <>
              <h1 className="text-2xl font-heading font-bold text-center mb-2">Mot de passe oublié</h1>
              {sent ? (
                <div className="text-sm text-muted-foreground space-y-3 mt-4" role="status">
                  <p className="flex items-center gap-2 text-success font-medium">
                    <MailCheck className="h-5 w-5" aria-hidden="true" /> E-mail envoyé
                  </p>
                  <p>
                    Si un compte existe pour <strong className="text-foreground">{email}</strong>, vous recevrez un lien
                    de réinitialisation sécurisé. Ce lien est valable une seule fois et expire rapidement.
                  </p>
                  <Button variant="outline" className="w-full min-h-11" onClick={() => { setMode("auth"); setSent(false); }}>
                    Retour à la connexion
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Saisissez votre e-mail : nous vous enverrons un lien sécurisé pour créer un nouveau mot de passe.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input id="forgot-email" type="email" className="h-11" value={email}
                      onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <Button className="w-full min-h-11" size="lg" disabled={loading}>
                    {loading ? "Envoi…" : "Envoyer le lien de réinitialisation"}
                  </Button>
                  <button type="button" onClick={() => setMode("auth")}
                    className="w-full text-sm text-primary hover:underline min-h-11">
                    Retour à la connexion
                  </button>
                </form>
              )}
            </>
          ) : (
          <>
          <h1 className="text-2xl font-heading font-bold text-center mb-6">
            {isLogin ? "Connexion" : "Inscription"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  placeholder="Votre nom"
                className="h-11"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                className="h-11"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="h-11 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <button
                type="button"
                onClick={() => { setMode("forgot"); setSent(false); }}
                className="text-sm text-primary hover:underline"
              >
                Mot de passe oublié ?
              </button>
            )}

            <Button className="w-full min-h-11" size="lg" disabled={loading}>
              {loading ? "Chargement..." : isLogin ? (
                <><LogIn className="h-4 w-4 mr-2" /> Se connecter</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-2" /> S'inscrire</>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
          </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
