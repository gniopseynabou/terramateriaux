import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, FolderTree, ShoppingBag, CreditCard, MessageSquare,
  Menu, X, ArrowLeft, TrendingUp, Clock, LogOut, Inbox, ShieldCheck, LifeBuoy
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
import { useAuth } from "@/hooks/useAuth";
import { useAdminOrderRequests } from "@/hooks/useOrderRequests";

const adminNav = [
  { label: "Tableau de bord", icon: LayoutDashboard, id: "dashboard" },
  { label: "Produits", icon: Package, id: "products" },
  { label: "Catégories", icon: FolderTree, id: "categories" },
  { label: "Commandes", icon: ShoppingBag, id: "orders" },
  { label: "Demandes clients", icon: Inbox, id: "requests" },
  { label: "Paiements", icon: CreditCard, id: "payments" },
  { label: "Infos de paiement", icon: CreditCard, id: "payment-settings" },
  { label: "Commentaires", icon: MessageSquare, id: "comments" },
  { label: "Communication & support", icon: LifeBuoy, id: "communication" },
  { label: "Administrateurs", icon: ShieldCheck, id: "admins" },
];

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

  // Déconnexion avec redirection - SEUL endroit qui appelle signOut dans Admin
  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 bg-sidebar text-sidebar-foreground transform transition-transform md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:block`}>
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <span className="font-heading font-bold text-sidebar-primary">T.M.I Admin</span>
          <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground min-h-11 min-w-11" aria-label="Fermer le menu d'administration" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-2 space-y-1" aria-label="Navigation administration">
          {adminNav.map((item) => (
            <button
              key={item.id}
              aria-current={activeTab === item.id ? "page" : undefined}
              onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full min-h-11 flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background ${
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
              {item.id === "requests" && pendingRequests > 0 && (
                <span className="ml-auto shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5">
                  {pendingRequests}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <Link to="/" className="text-sm text-sidebar-foreground hover:text-sidebar-primary flex items-center gap-1 min-h-11">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Retour au site
          </Link>
          <button onClick={handleSignOut} className="text-sm text-sidebar-foreground hover:text-sidebar-primary flex items-center gap-1 min-h-11">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 bg-card sticky top-0 z-30">
          <Button variant="ghost" size="icon" className="md:hidden min-h-11 min-w-11" aria-label="Ouvrir le menu d'administration" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="font-heading font-semibold truncate">{adminNav.find(n => n.id === activeTab)?.label}</h2>
        </header>

        <div className="flex-1 min-w-0 p-4 md:p-6 overflow-x-hidden">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Commandes", value: String(orders.length), icon: ShoppingBag, color: "text-primary" },
                  { label: "Revenus (estimés)", value: formatFCFA(orders.reduce((s, o) => s + (o.final_total ?? o.estimated_total ?? o.total), 0)), icon: TrendingUp, color: "text-success" },
                  { label: "Paiement à vérifier", value: String(orders.filter(o => o.order_status === "PAIEMENT_EN_ATTENTE_VERIFICATION" || o.order_status === "EN_ATTENTE_PAIEMENT").length), icon: Clock, color: "text-warning" },
                  { label: "Demandes en attente", value: String(pendingRequests), icon: Inbox, color: "text-secondary" },
                  { label: "Produits actifs", value: String(products.length), icon: Package, color: "text-primary" },
                  { label: "Catégories", value: String(categories.length), icon: FolderTree, color: "text-secondary" },
                ].map((s, i) => (
                  <div key={i} className="bg-card p-4 rounded-lg border border-border min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className={`h-5 w-5 ${s.color}`} />
                      <span className="text-xs text-muted-foreground truncate">{s.label}</span>
                    </div>
                    <div className="font-heading font-bold text-lg sm:text-xl break-words">{s.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-heading font-semibold mb-3">Commandes récentes</h3>
                <div className="bg-card rounded-lg border border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
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
                        <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/50">
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

          {activeTab === "payments" && <AdminPayments />}

          {activeTab === "payment-settings" && <AdminPaymentSettings />}

          {activeTab === "comments" && <AdminMessages />}

          {activeTab === "communication" && <AdminCommunicationSettings />}

          {activeTab === "admins" && <AdminInvite />}
        </div>
      </div>
    </div>
  );
};

export default Admin;
