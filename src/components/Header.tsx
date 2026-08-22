import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X, User, Search, ShieldCheck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import logo from "@/assets/logo.jpeg?w=96&format=webp";

const publicNavLinks = [
  { label: "Accueil", to: "/" },
  { label: "Catalogue", to: "/catalogue" },
  { label: "À propos", to: "/a-propos" },
  { label: "Contact", to: "/contact" },
];

const userNavLinks = [
  { label: "Accueil", to: "/" },
  { label: "Catalogue", to: "/catalogue" },
  { label: "Mes commandes", to: "/mes-commandes" },
  { label: "À propos", to: "/a-propos" },
  { label: "Contact", to: "/contact" },
];

const adminNavLinks = [
  { label: "Accueil", to: "/" },
  { label: "Catalogue", to: "/catalogue" },
  { label: "Dashboard Admin", to: "/admin", icon: ShieldCheck },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  // Choisir les liens selon le rôle - sans jamais toucher à la session
  const navLinks = isAdmin ? adminNavLinks : user ? userNavLinks : publicNavLinks;

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo - navigation normale, pas de signOut */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="T.M.I Logo" width={40} height={40} decoding="async" className="h-10 w-10 rounded-full object-cover" />
          <div className="hidden sm:block">
            <span className="font-heading font-bold text-lg text-secondary">T.M.I</span>
          </div>
        </Link>

        {/* Navigation bureau */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Navigation principale">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-1.5 ${
                location.pathname === l.to ? "text-primary font-semibold" : "text-foreground/70"
              }`}
            >
              {"icon" in l && l.icon && (
                <l.icon className="h-3.5 w-3.5" aria-hidden />
              )}
              {l.label}
            </Link>
          ))}
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
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground/70 min-h-11 min-w-11"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileOpen && (
        <div className="md:hidden bg-card border-t border-border animate-slide-in-right">
          <nav className="flex flex-col p-4 gap-3" aria-label="Navigation mobile">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-3 min-h-11 flex items-center gap-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === l.to
                    ? "bg-accent text-primary font-semibold"
                    : "text-foreground/70 hover:bg-muted"
                }`}
              >
                {"icon" in l && l.icon && <l.icon className="h-4 w-4" aria-hidden />}
                {l.label}
              </Link>
            ))}
            {user && (
              <Link
                to="/profil"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-3 min-h-11 flex items-center gap-2 rounded-md text-sm font-medium text-foreground/70 hover:bg-muted"
              >
                <User className="h-4 w-4" aria-hidden="true" /> Mon profil
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
