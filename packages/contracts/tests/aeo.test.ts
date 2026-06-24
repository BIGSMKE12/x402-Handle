import { describe, expect, test } from "bun:test";
import { networkDisplayLabel, validateAeoDiscoveryResponse } from "../src/index";

const validAeoDiscovery = () => ({
  snapshotDate: "2026-06-23",
  description: "How example.com's x402 endpoints are discoverable to AI agents.",
  coverage: { registered: 2, total: 3 },
  totalEndpoints: 2,
  verificationPassRate: 1,
  checklist: [
    { label: "Description published", ok: true, hint: "All listings carry a description." },
  ],
  facilitators: [
    {
      facilitator: "Coinbase CDP",
      registered: true,
      endpoints: 2,
      networks: ["Base", "Solana"],
      schemes: ["exact"],
      priceUsd: { min: 0.01, max: 0.05 },
      hasSchema: true,
      lastUpdated: "2026-06-23",
    },
    {
      facilitator: "PayAI",
      registered: false,
      endpoints: 0,
      networks: [],
      schemes: [],
      priceUsd: null,
    },
  ],
  endpoints: [
    {
      path: "/api/price",
      name: "Token Price",
      networks: ["Base"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      qualityScore: 94,
    },
  ],
});

describe("networkDisplayLabel", () => {
  test("maps known CAIP-2 ids and aliases to human labels", () => {
    expect(networkDisplayLabel("eip155:8453")).toBe("Base");
    expect(networkDisplayLabel("base")).toBe("Base");
    expect(networkDisplayLabel("eip155:137")).toBe("Polygon");
    expect(networkDisplayLabel("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")).toBe("Solana");
  });

  test("falls back to the raw value for unknown networks", () => {
    expect(networkDisplayLabel("eip155:999999")).toBe("eip155:999999");
  });
});

describe("validateAeoDiscoveryResponse", () => {
  test("accepts a well-formed aggregate", () => {
    const parsed = validateAeoDiscoveryResponse(validAeoDiscovery());
    expect(parsed.coverage).toEqual({ registered: 2, total: 3 });
    expect(parsed.facilitators[1]?.priceUsd).toBeNull();
    expect(parsed.endpoints[0]?.onPayai).toBe(false);
  });

  test("rejects an out-of-range verification pass rate", () => {
    expect(() =>
      validateAeoDiscoveryResponse({ ...validAeoDiscovery(), verificationPassRate: 1.5 }),
    ).toThrow();
  });

  test("rejects unknown top-level fields (strict schema)", () => {
    expect(() =>
      validateAeoDiscoveryResponse({ ...validAeoDiscovery(), l30Calls: 1000 }),
    ).toThrow();
  });
});
