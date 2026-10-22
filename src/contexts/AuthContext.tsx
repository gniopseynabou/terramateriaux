import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helper - récupérer le rôle depuis Supabase ───────────────────────────────

async function fetchRole(user: User): Promise<string | null> {
  try {
    // 1. Vérifier si l'utilisateur est super_admin
    const { data: superAdminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin" as never)
      .maybeSingle();

    if (superAdminRow) return "super_admin";

    // 2. Vérifier si l'utilisateur est admin métier
    const { data: adminRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminRow) return "admin";

    // 3. App metadata (contrôlé par le serveur)
    if (user.app_metadata?.role === "super_admin") return "super_admin";
    if (user.app_metadata?.role === "admin") return "admin";

    return "user";
  } catch {
    return "user";
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Évite que onAuthStateChange déclenche une double initialisation
  // pendant que getSession() est encore en cours.
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // ── Étape 1 : Récupérer la session existante depuis localStorage ──────────
    const init = async () => {
      const {
        data: { session: existingSession },
        error
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        // Le token (refresh token) est invalide ou expiré, on nettoie le cache local
        await supabase.auth.signOut();
      }

      if (existingSession?.user) {
        const r = await fetchRole(existingSession.user);
        if (!mounted) return;
        setSession(existingSession);
        setUser(existingSession.user);
        setRole(r);
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
      }

      setLoading(false);
      initializedRef.current = true;
    };

    init();

    // ── Étape 2 : Écouter les changements d'état FUTURS ──────────────────────
    // (connexion, déconnexion, refresh du token, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Ignorer les événements qui arrivent avant la fin de l'initialisation
      // pour éviter les race conditions (double setState conflictuel)
      if (!initializedRef.current) return;
      if (!mounted) return;

      if (newSession?.user) {
        const r = await fetchRole(newSession.user);
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession.user);
        setRole(r);
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
      }

      // Ne remettre loading à false que si on n'a pas encore fini l'init
      if (!initializedRef.current) {
        setLoading(false);
        initializedRef.current = true;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── signIn ────────────────────────────────────────────────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    },
    []
  );

  // ── signOut ───────────────────────────────────────────────────────────────────
  // SEUL endroit autorisé à appeler supabase.auth.signOut()
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  }, []);

  const isAuthenticated = !!user;
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook consommateur ────────────────────────────────────────────────────────

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext doit être utilisé dans un <AuthProvider>");
  }
  return ctx;
};

export default AuthContext;
