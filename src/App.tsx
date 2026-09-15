import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, Suspense, lazy, useState, useEffect, type ErrorInfo, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { getPostAuthRedirect } from "@/lib/authRedirect";
import { Sentry } from "@/lib/sentry";
import Index from "./pages/Index";

// ── Chargement paresseux ──────────────────────────────────────────────────────
const Catalogue = lazy(() => import("./pages/Catalogue"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Delivery = lazy(() => import("./pages/Delivery"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Confirmation = lazy(() => import("./pages/Confirmation"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DriverDashboard = lazy(() => import("./pages/DriverDashboard"));

// ── QueryClient ───────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ── Fallback de chargement ────────────────────────────────────────────────────
const PageFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Chargement">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const AuthFallback = () => (
  <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Vérification de la session">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">Vérification de la session…</p>
    </div>
  </div>
);

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erreur non récupérée dans l'application", error, info);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <main className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-heading font-bold">Une erreur est survenue</h1>
          <p className="text-sm text-muted-foreground">
            Rechargez la page pour reprendre votre navigation.
          </p>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
        </main>
      </div>
    );
  }
}

// ── ProtectedRoute - Accessible uniquement si connecté ───────────────────────
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthFallback />;
  if (!user) {
    const redirectTarget = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/auth?redirect=${redirectTarget}`} replace />;
  }
  return <>{children}</>;
};

// ── AdminRoute - Accessible uniquement si admin ───────────────────────────────
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <AuthFallback />;
  if (!user) return <Navigate to="/auth?redirect=%2Fadmin" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4 max-w-md bg-card p-6 md:p-8 rounded-lg border border-border shadow-sm">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <span className="text-xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-heading font-bold">Accès administrateur requis</h1>
          <p className="text-muted-foreground text-sm">
            Vous êtes actuellement connecté avec <strong>{user.email}</strong>, mais ce compte n'a pas les privilèges d'administrateur.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <a href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-11 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80">
              Retour au site
            </a>
            <a href="/auth?redirect=%2Fadmin" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-11 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90">
              Changer de compte
            </a>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// ── DriverRoute - Accessible uniquement si le livreur existe ───────────────────
const DriverRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isDriver, setIsDriver] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsDriver(false);
      return;
    }

    let mounted = true;
    supabase
      .from("delivery_drivers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (mounted) setIsDriver(!error && !!data);
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  if (authLoading || isDriver === null) return <AuthFallback />;
  if (!user) return <Navigate to="/auth?redirect=%2Flivreur" replace />;
  if (!isDriver) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4 max-w-md bg-card p-6 md:p-8 rounded-lg border border-border shadow-sm">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <span className="text-xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-heading font-bold">Accès livreur requis</h1>
          <p className="text-muted-foreground text-sm">
            Vous êtes connecté, mais ce compte n'est pas enregistré comme livreur.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <a href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-11 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80">
              Retour au site
            </a>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// ── RouterApp - Séparé pour pouvoir utiliser useAuth (dans BrowserRouter) ─────
const RouterApp = () => (
  <Suspense fallback={<PageFallback />}>
    <Routes>
      {/* Routes publiques */}
      <Route path="/" element={<Index />} />
      <Route path="/catalogue" element={<Catalogue />} />
      <Route path="/catalogue/:categorySlug" element={<Catalogue />} />
      <Route path="/produit/:slug" element={<ProductDetail />} />
      <Route path="/panier" element={<Cart />} />
      <Route path="/livraison" element={<Delivery />} />
      <Route path="/commande" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/paiement" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/a-propos" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Routes protégées - utilisateur connecté */}
      <Route path="/confirmation/:orderNumber" element={
        <ProtectedRoute><Confirmation /></ProtectedRoute>
      } />
      <Route path="/mes-commandes" element={
        <ProtectedRoute><MyOrders /></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><NotificationsPage /></ProtectedRoute>
      } />
      <Route path="/profil" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />

      {/* Route admin */}
      <Route path="/admin" element={
        <AdminRoute><Admin /></AdminRoute>
      } />

      {/* Route livreur */}
      <Route path="/livreur" element={
        <DriverRoute><DriverDashboard /></DriverRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppErrorBoundary>
              <RouterApp />
            </AppErrorBoundary>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;