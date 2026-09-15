import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  if (!SENTRY_DSN) return; // Désactivé en dev ou si la variable n'est pas renseignée

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE, // "production" | "development"
    release: import.meta.env.VITE_APP_VERSION ?? "1.0.0",

    // Ne capturer qu'1 erreur sur 10 en production pour éviter de saturer le quota gratuit
    sampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Exclure les erreurs réseau bénignes
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value ?? "";
      // Ignorer les erreurs de réseau normales (hors ligne, timeout)
      if (
        msg.includes("NetworkError") ||
        msg.includes("Failed to fetch") ||
        msg.includes("Load failed")
      ) {
        return null;
      }
      return event;
    },

    integrations: [
      Sentry.browserTracingIntegration(),
    ],
  });
}

export { Sentry };
