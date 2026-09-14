import { describe, expect, it } from "vitest";

const integrationEnabled =
  process.env.SUPABASE_INTEGRATION === "true" &&
  Boolean(process.env.SUPABASE_TEST_URL) &&
  Boolean(process.env.SUPABASE_TEST_ANON_KEY);

const baseUrl = process.env.SUPABASE_TEST_URL ?? "";
const anonKey = process.env.SUPABASE_TEST_ANON_KEY ?? "";

const requestAnon = async (path: string, init?: RequestInit) =>
  fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      ...(init?.headers ?? {}),
    },
  });

describe.skipIf(!integrationEnabled)("Supabase integration security", () => {
  it("keeps the public product catalogue readable", async () => {
    const response = await requestAnon("/rest/v1/products?select=id&limit=1");
    expect(response.status).toBe(200);
  });

  it.each([
    ["create_order_v2", { payload: { items: [] } }],
    ["declare_payment", {
      _order_id: "00000000-0000-0000-0000-000000000000",
      _payment_method: "invalid",
      _amount: 1,
    }],
    ["get_order_details_by_number", { _order_number: "integration-invalid" }],
  ])("rejects anonymous access to %s", async (functionName, body) => {
    const response = await requestAnon(`/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    expect([401, 403]).toContain(response.status);
  });
});
