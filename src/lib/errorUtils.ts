export const getFriendlyErrorMessage = (error: unknown): string => {
  if (!error) return "Une erreur inattendue est survenue.";

  const details = typeof error === "object" && error !== null
    ? error as { message?: unknown; error_description?: unknown }
    : null;
  const rawMessage = details?.message || details?.error_description || (typeof error === "string" ? error : "");
  const message = String(rawMessage).toLowerCase();

  // Network / Connection
  if (message.includes("fetch failed") || message.includes("network") || message.includes("failed to fetch")) {
    return "Erreur de connexion. Vérifiez votre connexion internet.";
  }

  // Auth
  if (message.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (message.includes("user already exists") || message.includes("email already exists")) {
    return "Un compte existe déjà avec cette adresse email.";
  }
  if (message.includes("password should be at least")) {
    return "Le mot de passe est trop court (6 caractères minimum).";
  }
  if (message.includes("not found")) {
    return "Ressource introuvable.";
  }
  if (message.includes("unauthorized") || message.includes("jwt")) {
    return "Session expirée ou accès non autorisé. Veuillez vous reconnecter.";
  }

  // Database / Postgres
  if (message.includes("violates unique constraint")) {
    return "Cet élément existe déjà.";
  }
  if (message.includes("violates foreign key constraint")) {
    return "Cette action est impossible car l'élément est lié à d'autres données.";
  }

  // Custom friendly errors that we already threw (pass-through)
  if (error instanceof Error && !message.includes("violates") && !message.includes("duplicate")) {
    return error.message;
  }

  return "Une erreur inattendue est survenue. Veuillez réessayer.";
};
