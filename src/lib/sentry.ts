// Sentry désactivé
export function initSentry() { }

export const Sentry = {
  captureException: (...args: unknown[]) => {
    console.error("[Sentry Disabled]", ...args);
  },
  captureMessage: (...args: unknown[]) => {
    console.log("[Sentry Disabled]", ...args);
  },
};
