import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingCart, Menu, User, Search, ShieldCheck,
  PackageSearch, Bell, LogIn, LogOut, ChevronRight,
  Info, Mail, Home, Package, BadgeCheck
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet";
import NotificationBell from "@/components/notifications/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import logo from "@/assets/logo.jpeg?w=96&format=webp";

const Header = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    setSheetOpen(false);
    navigate("/", { replace: true });
  };

  const mainNavLinks = [
    { label: "Accueil", to: "/", icon: Home },
    { label: "Catalogue", to: "/catalogue", icon: Package },
    ...(user ? [{ label: "Mes commandes", to: "/mes-commandes", icon: PackageSearch }] : []),
    { label: "À propos", to: "/a-propos", icon: Info },
    { label: "Contact", to: "/contact", icon: Mail },
  ];

  const displayName = user?.email?.split("@")[0] || "Mon compte";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src={logo}
            alt="T.M.I Logo"
            width={40}
            height={40}
            decoding="async"
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="hidden sm:block">
            <span className="font-heading font-bold text-lg text-secondary">T.M.I</span>
          </div>
        </Link>

        {/* Navigation bureau */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Navigation principale">
          {mainNavLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${
                location.pathname === l.to ? "text-primary font-semibold" : "text-foreground/70"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${
                location.pathname === "/admin" ? "text-primary font-semibold" : "text-foreground/70"
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-secondary" aria-hidden />
              <span>Dashboard Admin</span>
            </Link>
          )}
        </nav>

        {/* Actions droite */}
        <div className="flex items-center gap-2">
          <Link to="/catalogue">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground/70 min-h-11 min-w-11"
              aria-label="Rechercher dans le catalogue"
            >
              <Search className="h-5 w-5" />
            </Button>
          </Link>

          {isAdmin && (
            <Link to="/admin" className="hidden sm:inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary/30 text-primary font-semibold hover:bg-primary/10 min-h-9"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Admin</span>
              </Button>
            </Link>
          )}

          <NotificationBell />
          <ProfileMenu />

          <Link to="/panier" className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground/70 min-h-11 min-w-11"
              aria-label={`Panier, ${totalItems} article(s)`}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>

          {/* Bouton de déclenchement de la Sidebar / Drawer coulissante depuis la DROITE */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground/70 min-h-11 min-w-11"
                aria-label="Ouvrir le menu latéral"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            {/* Content coulissant depuis la DROITE (side="right") */}
            <SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col justify-between overflow-y-auto">
              <div>
                <SheetHeader className="p-4 border-b border-border text-left">
                  <div className="flex items-center gap-2">
                    <img src={logo} alt="T.M.I" className="h-8 w-8 rounded-full object-cover" />
                    <SheetTitle className="font-heading font-bold text-lg text-secondary">
                      Terra Matériaux
                    </SheetTitle>
                  </div>
                </SheetHeader>

                {/* ── Compte utilisateur ── */}
                {user ? (
                  <div className={`p-4 ${isAdmin ? "bg-secondary/10" : "bg-primary/5"} space-y-3`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        isAdmin ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                      {isAdmin ? (
                        <><ShieldCheck className="h-3 w-3 mr-1" /> Administrateur</>
                      ) : (
                        <><BadgeCheck className="h-3 w-3 mr-1" /> Client TMI</>
                      )}
                    </Badge>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setSheetOpen(false)}
                        className="mt-2 flex items-center justify-between w-full p-2.5 rounded-md bg-secondary text-secondary-foreground text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" /> Accéder au Dashboard Admin
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 space-y-2">
                    <p className="text-sm font-semibold">Bienvenue sur T.M.I</p>
                    <p className="text-xs text-muted-foreground">Connectez-vous pour accéder à vos commandes et avantages.</p>
                    <Link to="/auth" onClick={() => setSheetOpen(false)} className="block pt-1">
                      <Button size="sm" className="w-full">
                        <LogIn className="h-4 w-4 mr-2" /> Se connecter / S'inscrire
                      </Button>
                    </Link>
                  </div>
                )}

                <Separator />

                {/* ── Navigation principale ── */}
                <div className="p-3 space-y-1">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Navigation
                  </p>
                  {mainNavLinks.map((l) => {
                    const Icon = l.icon;
                    const isActive = location.pathname === l.to;
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setSheetOpen(false)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                          isActive ? "bg-accent text-primary font-semibold" : "text-foreground/80 hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {l.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </Link>
                    );
                  })}

                  {user && (
                    <>
                      <Link
                        to="/notifications"
                        onClick={() => setSheetOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium text-foreground/80 hover:bg-muted"
                      >
                        <span className="flex items-center gap-3">
                          <Bell className="h-4 w-4 text-muted-foreground" /> Notifications
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </Link>

                      <Link
                        to="/profil"
                        onClick={() => setSheetOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium text-foreground/80 hover:bg-muted"
                      >
                        <span className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" /> Mon Profil
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </Link>
                    </>
                  )}
                </div>

                {/* ── Section Admin dans le menu coulissant ── */}
                {isAdmin && (
                  <>
                    <Separator />
                    <div className="p-3 space-y-1">
                      <p className="px-3 text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" /> Administration
                      </p>
                      <Link
                        to="/admin"
                        onClick={() => setSheetOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-semibold bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                      >
                        <span>Tableau de bord Admin</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </>
                )}
              </div>

              {/* ── Pied du menu coulissant ── */}
              <div className="p-4 border-t border-border space-y-2">
                {user && (
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
                  </Button>
                )}
                <p className="text-[11px] text-center text-muted-foreground">
                  © {new Date().getFullYear()} Terra Matériaux International
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
