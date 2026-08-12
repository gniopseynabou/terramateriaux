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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Helper — récupérer le rôle depuis Supabase ───────────────────────────────

async function fetchRole(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    return data ? "admin" : "user";
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
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (existingSession?.user) {
        const r = await fetchRole(existingSession.user.id);
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
        const r = await fetchRole(newSession.user.id);
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
  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        isAuthenticated,
        isAdmin,
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
