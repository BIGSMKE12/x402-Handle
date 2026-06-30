import { describe, expect, test } from "bun:test";
import type { StellarProvider, TrustScore } from "contracts";
import { rankProviders } from "../src/ranker";

function provider(overrides: Partial<StellarProvider> = {}): StellarProvider {
  return {
    id: "C123/1",
    contractId: "C123",
    providerId: 1,
    name: "Test Provider",
    endpoint: "https://example.com/api",
    priceUsdc: 0.01,
    ownerAccount: "GABC",
    paymentAsset: "USDC",
    category: "fx",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastSeenAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function trustScore(score: number): TrustScore {
  return {
    score,
    components: { age: 1, volume: 1, kyb: 1, claims: 1, recency: 1 },
    weights: { age: 0.15, volume: 0.3, kyb: 0.3, claims: 0.15, recency: 0.1 },
    computedAt: "2026-06-30T00:00:00.000Z",
  };
}

describe("rankProviders", () => {
  test("excluye providers inactivos", () => {
    const result = rankProviders([
      { provider: provider({ id: "a", active: false }), trustScore: trustScore(100) },
      { provider: provider({ id: "b", active: true }), trustScore: trustScore(10) },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].provider.id).toBe("b");
  });

  test("ordena por trust score descendente cuando no hay filtros", () => {
    const result = rankProviders([
      { provider: provider({ id: "low" }), trustScore: trustScore(20) },
      { provider: provider({ id: "high" }), trustScore: trustScore(90) },
    ]);
    expect(result.map((r) => r.provider.id)).toEqual(["high", "low"]);
  });

  test("penaliza precio fuera de presupuesto", () => {
    const result = rankProviders(
      [
        { provider: provider({ id: "cheap", priceUsdc: 0.005 }), trustScore: trustScore(70) },
        { provider: provider({ id: "expensive", priceUsdc: 1.0 }), trustScore: trustScore(70) },
      ],
      { maxPriceUsdc: 0.01 },
    );
    expect(result[0].provider.id).toBe("cheap");
    expect(result.find((r) => r.provider.id === "cheap")!.reasons).toContain("within_budget");
  });

  test("category match suma reason y mejora el ranking entre pares similares", () => {
    const result = rankProviders(
      [
        { provider: provider({ id: "fx", category: "fx" }), trustScore: trustScore(70) },
        { provider: provider({ id: "data", category: "data" }), trustScore: trustScore(70) },
      ],
      { category: "fx" },
    );
    expect(result[0].provider.id).toBe("fx");
    expect(result[0].reasons).toContain("category_match");
  });

  test("matchScore siempre entre 0 y 1", () => {
    const result = rankProviders([
      { provider: provider({ priceUsdc: 1000 }), trustScore: trustScore(0) },
    ]);
    expect(result[0].matchScore).toBeGreaterThanOrEqual(0);
    expect(result[0].matchScore).toBeLessThanOrEqual(1);
  });
});
