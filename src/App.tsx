import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
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

// ── ProtectedRoute — Accessible uniquement si connecté ───────────────────────
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

// ── AdminRoute — Accessible uniquement si admin ───────────────────────────────
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <AuthFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-heading font-bold">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n'avez pas les droits d'administration.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// ── RouterApp — Séparé pour pouvoir utiliser useAuth (dans BrowserRouter) ─────
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
      <Route path="/commande" element={<Checkout />} />
      <Route path="/paiement" element={<Checkout />} />
      <Route path="/a-propos" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Routes protégées — utilisateur connecté */}
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
            <RouterApp />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;