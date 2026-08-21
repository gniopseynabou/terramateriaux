import { describe, expect, it } from "vitest";
import { getPostAuthRedirect } from "@/lib/authRedirect";

describe("getPostAuthRedirect", () => {
  it("keeps the protected return path for checkout", () => {
    expect(getPostAuthRedirect("/commande")).toBe("/commande");
  });

  it("falls back to the orders page for a normal login", () => {
    expect(getPostAuthRedirect(null)).toBe("/mes-commandes");
  });

  it("ignores auth and invalid routes", () => {
    expect(getPostAuthRedirect("/auth")).toBe("/mes-commandes");
    expect(getPostAuthRedirect("/admin")).toBe("/mes-commandes");
  });
});
