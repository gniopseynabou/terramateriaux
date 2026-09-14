import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/orderStatus";

describe("order status transitions", () => {
  it("allows the normal order flow", () => {
    expect(canTransition("EN_ATTENTE_PAIEMENT", "PAIEMENT_RECU")).toBe(true);
    expect(canTransition("PAIEMENT_RECU", "PREPARATION")).toBe(true);
    expect(canTransition("PREPARATION", "EXPEDIEE")).toBe(true);
    expect(canTransition("EXPEDIEE", "LIVREE")).toBe(true);
    expect(canTransition("LIVREE", "TERMINEE")).toBe(true);
  });

  it("rejects skipping forward or reopening closed orders", () => {
    expect(canTransition("EN_ATTENTE_PAIEMENT", "LIVREE")).toBe(false);
    expect(canTransition("TERMINEE", "PREPARATION")).toBe(false);
    expect(canTransition("ANNULEE", "EN_ATTENTE_PAIEMENT")).toBe(false);
  });

  it("allows an unchanged status for idempotent updates", () => {
    expect(canTransition("PREPARATION", "PREPARATION")).toBe(true);
  });
});