import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, FolderTree, ShoppingBag, CreditCard, MessageSquare,
  Menu, X, ArrowLeft, TrendingUp, Clock, LogOut, Inbox, ShieldCheck, LifeBuoy,
  Truck, Tag, Users, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProducts, formatFCFA } from "@/hooks/useProducts";
import { useAdminOrders } from "@/hooks/useOrders";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminPaymentSettings from "@/components/admin/AdminPaymentSettings";
import { useCategories } from "@/hooks/useCategories";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminCategories from "@/components/admin/AdminCategories";
import AdminRequests from "@/components/admin/AdminRequests";
import AdminMessages from "@/components/admin/AdminMessages";
import AdminPayments from "@/components/admin/AdminPayments";
import AdminInvite from "@/components/admin/AdminInvite";
import AdminCommunicationSettings from "@/components/admin/AdminCommunicationSettings";
import AdminDrivers from "@/components/admin/AdminDrivers";
import AdminDeliveryZones from "@/components/admin/AdminDeliveryZones";
import AdminDeliveries from "@/components/admin/AdminDeliveries";
import AdminPromotions from "@/components/admin/AdminPromotions";
import { useAuth } from "@/hooks/useAuth";
import { useAdminOrderRequests } from "@/hooks/useOrderRequests";

const navGroups = [
  {
    groupTitle: "Vue d'ensemble",
    items: [
      { label: "Tableau de bord", icon: LayoutDashboard, id: "dashboard" },
    ],
  },
  {
    groupTitle: "Gestion Commerciale",
    items: [
      { label: "Produits", icon: Package, id: "products" },
      { label: "Catégories", icon: FolderTree, id: "categories" },
      { label: "Commandes", icon: ShoppingBag, id: "orders" },
      { label: "Demandes clients", icon: Inbox, id: "requests" },
    ],
  },
  {
    groupTitle: "Livraisons",
    items: [
      { label: "Suivi livraisons", icon: Truck, id: "deliveries" },
      { label: "Livreurs", icon: Users, id: "drivers" },
      { label: "Zones de livraison", icon: MapPin, id: "delivery-zones" },
    ],
  },
  {
    groupTitle: "Promotions",
    items: [
      { label: "Promotions", icon: Tag, id: "promotions" },
    ],
  },
  {
    groupTitle: "Finances & Règlement",
    items: [
      { label: "Paiements", icon: CreditCard, id: "payments" },
      { label: "Infos de paiement", icon: CreditCard, id: "payment-settings" },
    ],
  },
  {
    groupTitle: "Support & Paramètres",
    items: [
      { label: "Commentaires", icon: MessageSquare, id: "comments" },
      { label: "Communication & support", icon: LifeBuoy, id: "communication" },
      { label: "Administrateurs", icon: ShieldCheck, id: "admins" },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

const Admin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: requests = [] } = useAdminOrderRequests();
  const pendingRequests = requests.filter((r) => r.status === "EN_ATTENTE").length;

  const { data: orders = [] } = useAdminOrders();

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Barre latérale (Sidebar fixe sur ordinateur, tiroir sur mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col transform transition-transform duration-200 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 border-r border-sidebar-border shadow-md ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* En-tête Sidebar fixe */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between shrink-0 bg-sidebar">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold text-sm">
              TMI
            </div>
            <span className="font-heading font-bold text-lg text-sidebar-primary tracking-tight">
              T.M.I Admin
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-sidebar-foreground min-h-10 min-w-10 hover:bg-sidebar-accent"
            aria-label="Fermer le menu d'administration"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation complète regroupée */}
        <nav className="p-3 space-y-5 flex-1 overflow-y-auto" aria-label="Navigation administration">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-sidebar-foreground/60 uppercase tracking-wider mb-1">
                {group.groupTitle}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary font-bold shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground font-medium"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"}`} aria-hidden="true" />
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {item.id === "requests" && pendingRequests > 0 && (
                      <span className="shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5">
                        {pendingRequests}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Pied de Sidebar fixe avec déconnexion */}
        <div className="p-3 border-t border-sidebar-border space-y-1.5 shrink-0 bg-sidebar">
          <Link
            to="/"
            className="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-primary transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Retour au site public</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Zone de contenu principal */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border flex items-center px-4 md:px-6 gap-3 bg-card sticky top-0 z-30 shadow-xs">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden min-h-11 min-w-11 text-foreground"
            aria-label="Ouvrir le menu d'administration"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-heading font-bold text-lg md:text-xl truncate text-foreground">
            {allNavItems.find((n) => n.id === activeTab)?.label}
          </h1>
        </header>

        <main className="flex-1 min-w-0 p-4 md:p-6 overflow-x-hidden">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Commandes", value: String(orders.length), icon: ShoppingBag, color: "text-primary" },
                  { label: "Revenus (estimés)", value: formatFCFA(orders.reduce((s, o) => s + (Number(o.final_total ?? o.estimated_total ?? o.total) || 0), 0)), icon: TrendingUp, color: "text-success" },
                  { label: "Paiement à vérifier", value: String(orders.filter(o => o.order_status === "PAIEMENT_EN_ATTENTE_VERIFICATION" || o.order_status === "EN_ATTENTE_PAIEMENT").length), icon: Clock, color: "text-warning" },
                  { label: "Demandes en attente", value: String(pendingRequests), icon: Inbox, color: "text-secondary" },
                  { label: "Produits actifs", value: String(products.length), icon: Package, color: "text-primary" },
                  { label: "Catégories", value: String(categories.length), icon: FolderTree, color: "text-secondary" },
                ].map((s, i) => (
                  <div key={i} className="bg-card p-4 rounded-lg border border-border min-w-0 shadow-xs">
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                      <span className="text-xs text-muted-foreground truncate">{s.label}</span>
                    </div>
                    <div className="font-heading font-bold text-lg sm:text-xl break-words">{s.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <h2 className="font-heading font-semibold text-lg mb-3">Commandes récentes</h2>
                <div className="bg-card rounded-lg border border-border overflow-x-auto shadow-xs">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left bg-muted/30">
                        <th className="p-3 font-medium text-muted-foreground">N°</th>
                        <th className="p-3 font-medium text-muted-foreground">Client</th>
                        <th className="p-3 font-medium text-muted-foreground">Total</th>
                        <th className="p-3 font-medium text-muted-foreground">Statut</th>
                        <th className="p-3 font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucune commande encore.</td></tr>
                      ) : orders.slice(0, 10).map((o) => (
                        <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="p-3 font-medium whitespace-nowrap">{o.order_number}</td>
                          <td className="p-3 whitespace-nowrap">{o.customer_name}</td>
                          <td className="p-3 font-medium whitespace-nowrap">{formatFCFA(o.final_total ?? o.estimated_total ?? o.total)}</td>
                          <td className="p-3"><OrderStatusBadge status={o.order_status} /></td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("fr-FR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "products" && <AdminProducts />}

          {activeTab === "categories" && <AdminCategories />}

          {activeTab === "orders" && <AdminOrders />}

          {activeTab === "requests" && <AdminRequests />}

          {activeTab === "deliveries" && <AdminDeliveries />}

          {activeTab === "drivers" && <AdminDrivers />}

          {activeTab === "delivery-zones" && <AdminDeliveryZones />}

          {activeTab === "promotions" && <AdminPromotions />}

          {activeTab === "payments" && <AdminPayments />}

          {activeTab === "payment-settings" && <AdminPaymentSettings />}

          {activeTab === "comments" && <AdminMessages />}

          {activeTab === "communication" && <AdminCommunicationSettings />}

          {activeTab === "admins" && <AdminInvite />}
        </main>
      </div>
    </div>
  );
};

export default Admin;
