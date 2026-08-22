import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogIn, LogOut, PackageSearch, ShieldCheck, User,
  Mail, Phone, MapPin, BadgeCheck, Home, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

/** Panneau de compte complet ouvert depuis le header. */
const ProfileMenu = () => {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, role, signOut } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Invité";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    close();
    navigate("/");
  };

  const linkClass =
    "flex items-center gap-2.5 rounded-md px-3 py-2.5 min-h-11 text-sm font-medium text-foreground/80 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground/70 min-h-11 min-w-11 relative"
          aria-label="Mon compte"
        >
          {user ? (
            <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {initials || <User className="h-4 w-4" />}
            </span>
          ) : (
            <User className="h-5 w-5" />
          )}
          {user && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 overflow-hidden shadow-xl">
        {user ? (
          <>
            {/* ── En-tête profil ─────────────────────────────────────────── */}
            <div className={`px-4 py-4 ${isAdmin ? "bg-secondary/10" : "bg-primary/5"}`}>
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                  isAdmin
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary text-primary-foreground"
                }`}>
                  {initials || <User className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-semibold truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <Badge
                    variant={isAdmin ? "default" : "secondary"}
                    className="mt-1 text-xs h-5"
                  >
                    {isAdmin ? (
                      <><ShieldCheck className="h-3 w-3 mr-1" /> Administrateur</>
                    ) : (
                      <><BadgeCheck className="h-3 w-3 mr-1" /> Utilisateur</>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Informations du profil ─────────────────────────────────── */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Informations
              </p>

              {/* Email */}
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{user.email}</span>
              </div>

              {/* Téléphone */}
              {profile?.phone && (
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}

              {/* Ville */}
              {(profile?.city || profile?.region) && (
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {[profile.city, profile.region].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}

              {/* Adresse */}
              {profile?.address && (
                <div className="flex items-center gap-2 text-sm text-foreground/70">
                  <Home className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{profile.address}</span>
                </div>
              )}

              {!profile?.phone && !profile?.city && !profile?.address && (
                <p className="text-xs text-muted-foreground italic">
                  Profil incomplet -{" "}
                  <Link to="/profil" onClick={close} className="text-primary hover:underline">
                    compléter mes infos
                  </Link>
                </p>
              )}
            </div>

            <Separator />

            {/* ── Navigation selon le rôle ───────────────────────────────── */}
            <nav className="p-2 space-y-0.5">
              {isAdmin ? (
                /* Navigation Admin */
                <>
                  <Link to="/admin" onClick={close} className={linkClass}>
                    <ShieldCheck className="h-4 w-4 text-secondary shrink-0" aria-hidden />
                    Dashboard Admin
                  </Link>
                  <Link to="/mes-commandes" onClick={close} className={linkClass}>
                    <PackageSearch className="h-4 w-4 shrink-0" aria-hidden />
                    Toutes les commandes
                  </Link>
                  <Link to="/notifications" onClick={close} className={linkClass}>
                    <Bell className="h-4 w-4 shrink-0" aria-hidden />
                    Notifications
                  </Link>
                </>
              ) : (
                /* Navigation Utilisateur */
                <>
                  <Link to="/mes-commandes" onClick={close} className={linkClass}>
                    <PackageSearch className="h-4 w-4 shrink-0" aria-hidden />
                    Mes commandes
                  </Link>
                  <Link to="/notifications" onClick={close} className={linkClass}>
                    <Bell className="h-4 w-4 shrink-0" aria-hidden />
                    Notifications
                  </Link>
                  <Link to="/profil" onClick={close} className={linkClass}>
                    <User className="h-4 w-4 shrink-0" aria-hidden />
                    Modifier mon profil
                  </Link>
                </>
              )}
            </nav>

            <Separator />

            {/* ── Déconnexion - SEUL bouton qui appelle signOut ─────────── */}
            <div className="p-2">
              <button
                onClick={handleSignOut}
                className={`${linkClass} text-destructive hover:bg-destructive/10`}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                Se déconnecter
              </button>
            </div>
          </>
        ) : (
          /* ── Utilisateur non connecté ────────────────────────────────── */
          <>
            <div className="px-4 py-4 bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted border border-border flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-foreground/70">Non connecté</p>
                  <p className="text-xs text-muted-foreground">Connectez-vous pour accéder à votre espace</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="p-3 space-y-2">
              <Link to="/auth" onClick={close}>
                <Button className="w-full min-h-11">
                  <LogIn className="h-4 w-4 mr-2" aria-hidden />
                  Se connecter
                </Button>
              </Link>
              <Link to="/mes-commandes" onClick={close} className={linkClass}>
                <PackageSearch className="h-4 w-4 shrink-0" aria-hidden />
                Suivre une commande
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ProfileMenu;
