import React from "react";
import { Wrench, Phone, Mail, ShieldAlert } from "lucide-react";
import { useMaintenanceStatus } from "@/hooks/useMaintenance";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.jpeg?w=96&format=webp";

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

export const MaintenanceGuard: React.FC<MaintenanceGuardProps> = ({ children }) => {
  const { data: maintenance, isLoading } = useMaintenanceStatus();
  const { isSuperAdmin, loading: authLoading } = useAuth();

  // Ne pas bloquer l'affichage pendant la première micro-seconde de chargement
  if (isLoading || authLoading) {
    return <>{children}</>;
  }

  // Si la maintenance n'est pas active, affichage normal
  if (!maintenance?.is_enabled) {
    return <>{children}</>;
  }

  // Si l'utilisateur connecté est Super-Admin, il conserve un accès complet pour intervenir
  if (isSuperAdmin) {
    return (
      <>
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 sticky top-0 z-[100] shadow-sm">
          <ShieldAlert className="h-4 w-4" />
          <span>
            MODE MAINTENANCE ACTIF — Vous naviguez avec vos privilèges techniques Super-Admin.
          </span>
        </div>
        {children}
      </>
    );
  }

  // Écran de maintenance pour les visiteurs et clients réguliers
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary selection:text-primary-foreground">
      <div className="max-w-lg w-full bg-card border border-border rounded-xl shadow-lg p-6 sm:p-10 text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src={logo}
            alt="Terra Matériaux International"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover shadow-sm border border-border"
          />
        </div>

        {/* En-tête */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary mx-auto">
            <Wrench className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
            {maintenance.title || "Plateforme en maintenance"}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            {maintenance.message}
          </p>
        </div>

        {/* Date prévisionnelle si définie */}
        {maintenance.scheduled_end && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs sm:text-sm text-muted-foreground border border-border/50">
            Retour prévu estimé vers :{" "}
            <span className="font-semibold text-foreground">
              {new Date(maintenance.scheduled_end).toLocaleString("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        )}

        {/* Contact d'assistance */}
        <div className="pt-4 border-t border-border space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Besoin d'une assistance urgente ?</p>
          <div className="flex flex-wrap justify-center gap-4 pt-1">
            <a
              href="mailto:contact@tmi-senegal.com"
              className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-primary" />
              <span>contact@tmi-senegal.com</span>
            </a>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-primary" />
              <span>Sénégal (+221)</span>
            </span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 pt-2">
          © {new Date().getFullYear()} Terra Matériaux International. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};

export default MaintenanceGuard;
