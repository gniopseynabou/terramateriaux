import { useState, useEffect, useCallback } from "react";
import { UserPlus, Trash2, RefreshCw, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
}

// ─── Composant principal ──────────────────────────────────────────────────────

const AdminInvite = () => {
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [sending, setSending] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // ── Charger la liste des admins ────────────────────────────────────────────
  const fetchAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    try {
      // @ts-expect-error rpc n'est pas typé
      const { data, error } = await supabase.rpc("get_admin_users");
      
      if (error) throw error;
      setAdmins((data as AdminUser[]) ?? []);
    } catch (err: unknown) {
      toast.error("Impossible de charger la liste des admins : " + (err instanceof Error ? err.message : "Erreur inconnue"));
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // ── Envoyer l'invitation ───────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { email: email.trim(), full_name: fullName.trim() },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success(`Invitation envoyée à ${email.trim()} !`);
      setEmail("");
      setFullName("");
      // Rafraîchir la liste après quelques secondes
      setTimeout(fetchAdmins, 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi de l'invitation.");
    } finally {
      setSending(false);
    }
  };

  // ── Révoquer un admin ──────────────────────────────────────────────────────
  const handleRevoke = async (targetUserId: string, targetEmail: string) => {
    if (!confirm(`Révoquer les droits admin de ${targetEmail} ?`)) return;

    setRevokingId(targetUserId);
    try {
      // @ts-expect-error rpc n'est pas typé
      const { error } = await supabase.rpc("revoke_admin_role", {
        target_user_id: targetUserId,
      });
      if (error) throw error;
      toast.success(`Droits admin révoqués pour ${targetEmail}.`);
      setAdmins((prev) => prev.filter((a) => a.user_id !== targetUserId));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la révocation.");
    } finally {
      setRevokingId(null);
    }
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 max-w-2xl">

      {/* ── Formulaire d'invitation ── */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-heading font-semibold text-lg">Inviter un nouvel administrateur</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          L'invité recevra un e-mail avec un lien pour définir son mot de passe. Son rôle
          <strong> admin</strong> sera automatiquement attribué dès la création du compte.
        </p>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-fullname">Nom complet</Label>
            <Input
              id="invite-fullname"
              type="text"
              className="h-11"
              placeholder="ex : Mamadou Diallo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Adresse e-mail <span className="text-destructive">*</span></Label>
            <Input
              id="invite-email"
              type="email"
              className="h-11"
              placeholder="admin@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <Button
            type="submit"
            className="w-full min-h-11"
            size="lg"
            disabled={sending || !email.trim()}
          >
            {sending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Envoi en cours…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
                Envoyer l'invitation
              </>
            )}
          </Button>
        </form>
      </div>

      {/* ── Liste des admins existants ── */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h3 className="font-heading font-semibold">Administrateurs actuels</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-9 min-w-9"
            onClick={fetchAdmins}
            aria-label="Rafraîchir la liste"
            disabled={loadingAdmins}
          >
            <RefreshCw className={`h-4 w-4 ${loadingAdmins ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loadingAdmins ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Chargement…</div>
        ) : admins.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">Aucun administrateur trouvé.</div>
        ) : (
          <ul className="divide-y divide-border">
            {admins.map((admin) => (
              <li key={admin.user_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {admin.full_name || <span className="text-muted-foreground italic">Sans nom</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Admin depuis le {new Date(admin.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-9 min-w-9 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  aria-label={`Révoquer les droits de ${admin.email}`}
                  disabled={revokingId === admin.user_id}
                  onClick={() => handleRevoke(admin.user_id, admin.email)}
                >
                  {revokingId === admin.user_id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminInvite;
