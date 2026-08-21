const INVALID_REDIRECTS = new Set(["/auth", "/reset-password", "/admin"]);

export const getPostAuthRedirect = (redirectPath?: string | null): string => {
  if (!redirectPath || !redirectPath.startsWith("/")) {
    return "/mes-commandes";
  }

  const normalized = redirectPath.split("?")[0];

  if (INVALID_REDIRECTS.has(normalized) || normalized.startsWith("/auth") || normalized.startsWith("/reset-password")) {
    return "/mes-commandes";
  }

  return normalized;
};
