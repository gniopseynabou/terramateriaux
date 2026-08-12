import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUSES: OrderStatus[] = [
  "EN_ATTENTE_PAIEMENT",
  "PAIEMENT_EN_ATTENTE_VERIFICATION",
  "PAIEMENT_RECU",
  "PREPARATION",
  "EXPEDIEE",
  "LIVREE",
  "TERMINEE",
  "ANNULEE",
  // legacy statuses (commandes créées avant le nouveau parcours)
  "EN_ATTENTE_VALIDATION",
  "EN_COURS_ANALYSE",
  "CLIENT_CONTACTE",
  "PAIEMENT_EN_ATTENTE",
];

/** Linear customer-facing progress (legacy + cancelled excluded). */
export const ORDER_FLOW: OrderStatus[] = [
  "EN_ATTENTE_PAIEMENT",
  "PAIEMENT_EN_ATTENTE_VERIFICATION",
  "PAIEMENT_RECU",
  "PREPARATION",
  "EXPEDIEE",
  "LIVREE",
  "TERMINEE",
];

/**
 * Guardrails: the only status changes an admin may perform, mirrored by the
 * database trigger `validate_order_status_transition`.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  EN_ATTENTE_PAIEMENT: ["PAIEMENT_EN_ATTENTE_VERIFICATION", "PAIEMENT_RECU", "ANNULEE"],
  PAIEMENT_EN_ATTENTE_VERIFICATION: ["PAIEMENT_RECU", "EN_ATTENTE_PAIEMENT", "ANNULEE"],
  PAIEMENT_RECU: ["PREPARATION", "ANNULEE"],
  PREPARATION: ["EXPEDIEE", "ANNULEE"],
  EXPEDIEE: ["LIVREE", "ANNULEE"],
  LIVREE: ["TERMINEE"],
  TERMINEE: [],
  ANNULEE: [],
  // legacy
  EN_ATTENTE_VALIDATION: ["EN_COURS_ANALYSE", "CLIENT_CONTACTE", "EN_ATTENTE_PAIEMENT", "PAIEMENT_EN_ATTENTE_VERIFICATION", "ANNULEE"],
  EN_COURS_ANALYSE: ["CLIENT_CONTACTE", "EN_ATTENTE_PAIEMENT", "PAIEMENT_EN_ATTENTE_VERIFICATION", "ANNULEE"],
  CLIENT_CONTACTE: ["EN_ATTENTE_PAIEMENT", "PAIEMENT_EN_ATTENTE_VERIFICATION", "ANNULEE"],
  PAIEMENT_EN_ATTENTE: ["PAIEMENT_EN_ATTENTE_VERIFICATION", "PAIEMENT_RECU", "EN_ATTENTE_PAIEMENT", "ANNULEE"],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  from === to || ALLOWED_TRANSITIONS[from].includes(to);

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  EN_ATTENTE_PAIEMENT: "En attente de paiement",
  PAIEMENT_EN_ATTENTE_VERIFICATION: "Paiement en attente de vérification",
  PAIEMENT_RECU: "Paiement vérifié",
  PREPARATION: "En préparation",
  EXPEDIEE: "Expédiée",
  LIVREE: "Livrée",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
  EN_ATTENTE_VALIDATION: "En attente de validation",
  EN_COURS_ANALYSE: "En cours d'analyse",
  CLIENT_CONTACTE: "Client contacté",
  PAIEMENT_EN_ATTENTE: "Paiement en attente",
};

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  EN_ATTENTE_PAIEMENT: "bg-warning/10 text-warning",
  PAIEMENT_EN_ATTENTE_VERIFICATION: "bg-warning/10 text-warning",
  PAIEMENT_RECU: "bg-success/10 text-success",
  PREPARATION: "bg-primary/10 text-primary",
  EXPEDIEE: "bg-primary/10 text-primary",
  LIVREE: "bg-success/10 text-success",
  TERMINEE: "bg-success/10 text-success",
  ANNULEE: "bg-destructive/10 text-destructive",
  EN_ATTENTE_VALIDATION: "bg-warning/10 text-warning",
  EN_COURS_ANALYSE: "bg-warning/10 text-warning",
  CLIENT_CONTACTE: "bg-primary/10 text-primary",
  PAIEMENT_EN_ATTENTE: "bg-warning/10 text-warning",
};

/** Client-facing notification copy for each status change. */
export const ORDER_STATUS_NOTIFICATIONS: Record<OrderStatus, { title: string; message: string }> = {
  EN_ATTENTE_PAIEMENT: {
    title: "Commande enregistrée",
    message: "Votre commande est enregistrée. Effectuez le paiement puis déclarez-le depuis votre espace.",
  },
  PAIEMENT_EN_ATTENTE_VERIFICATION: {
    title: "Paiement déclaré",
    message: "Votre paiement a bien été enregistré. Notre équipe le vérifie dans les meilleurs délais.",
  },
  PAIEMENT_RECU: {
    title: "Paiement vérifié",
    message: "Votre paiement a été vérifié. Nous préparons votre commande.",
  },
  PREPARATION: {
    title: "Commande en préparation",
    message: "Votre commande est en cours de préparation dans notre entrepôt.",
  },
  EXPEDIEE: {
    title: "Commande expédiée",
    message: "Votre commande est en route vers l'adresse de livraison.",
  },
  LIVREE: {
    title: "Commande livrée",
    message: "Votre commande a été livrée. Merci pour votre confiance !",
  },
  TERMINEE: {
    title: "Commande terminée",
    message: "Votre commande est clôturée. À très bientôt sur T.M.I !",
  },
  ANNULEE: {
    title: "Commande annulée",
    message: "Votre commande a été annulée. Contactez-nous pour plus d'informations.",
  },
  EN_ATTENTE_VALIDATION: {
    title: "Commande enregistrée",
    message: "Votre commande a bien été enregistrée.",
  },
  EN_COURS_ANALYSE: {
    title: "Commande en cours d'analyse",
    message: "Nous vérifions la disponibilité des produits et les frais de livraison.",
  },
  CLIENT_CONTACTE: {
    title: "Nous vous avons contacté",
    message: "Un conseiller vous a contacté au sujet de votre commande.",
  },
  PAIEMENT_EN_ATTENTE: {
    title: "Paiement demandé",
    message: "Vous pouvez maintenant procéder au paiement de votre commande.",
  },
};
