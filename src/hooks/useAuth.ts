/**
 * useAuth — Rétrocompatible avec tous les composants existants.
 *
 * Ce hook est désormais un simple consommateur du AuthContext global.
 * L'état d'authentification est partagé dans toute l'app et ne se
 * réinitialise JAMAIS lors d'un changement de route.
 *
 * Usage : const { user, isAdmin, loading, signOut } = useAuth();
 */
export { useAuthContext as useAuth } from "@/contexts/AuthContext";
