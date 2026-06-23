import { describe, expect, test } from "bun:test";
import { getAeoDiscovery } from "./discovery";
import type { GeoSpec } from "./source";

const specWith = (serviceUrl: string | null): GeoSpec => ({
  serviceId: "stableenrich",
  serviceUrl,
  title: "StableEnrich",
  category: "data",
  description: null,
  mppDescription: null,
  useCase: null,
  endpointCount: 32,
  hasMetering: null,
  hasFreeTier: null,
  providerSha: null,
  registryVersion: null,
  registryGeneratedAt: null,
  registrySourceUrl: null,
  priceRangeUsd: { min: 0.002, max: 0.44 },
  offers: [],
  observedEndpoints: [],
  mppEndpoints: [],
  atlasMissing: false,
});

describe("getAeoDiscovery", () => {
  test("returns the StableEnrich fixture by serviceUrl host", () => {
    const d = getAeoDiscovery(specWith("https://stableenrich.dev"));
    expect(d).not.toBeNull();
    expect(d?.coverage).toEqual({ registered: 2, total: 3 });
    expect(d?.totalEndpoints).toBe(24);
    expect(d?.l30Calls).toBe(15193);
    expect(d?.verificationPassRate).toBe(1);
    // one facilitator (PayAI) must be flagged as not registered (improvement area)
    expect(d?.facilitators.some((f) => !f.registered)).toBe(true);
    // registered endpoints sum across facilitators is non-zero
    expect(d?.facilitators.reduce((sum, f) => sum + f.endpoints, 0)).toBe(29);
    // per-endpoint coverage rows match the unique endpoint count
    expect(d?.endpoints.length).toBe(24);
    expect(d?.endpoints.every((e) => e.onCdp || e.onDexter)).toBe(true);
  });

  test("matches Nansen and CoinGecko by serviceId/brandKey (serviceUrl is null)", () => {
    const nansen = getAeoDiscovery({ ...specWith(null), serviceId: "nansen", title: "Nansen" });
    expect(nansen?.coverage).toEqual({ registered: 3, total: 3 });
    expect(nansen?.endpoints.length).toBe(48);
    expect(nansen?.facilitators.map((f) => f.facilitator)).toContain("PayAI");

    const coingecko = getAeoDiscovery({
      ...specWith(null),
      serviceId: "coingecko",
      title: "pro-api.coingecko.com",
    });
    expect(coingecko?.coverage).toEqual({ registered: 2, total: 3 });
    expect(coingecko?.verificationPassRate).toBeCloseTo(0.75);
    expect(coingecko?.endpoints.length).toBe(11);
    expect(coingecko?.endpointsNote).toBeTruthy();
  });

  test("returns null for unknown providers and missing url", () => {
    const acme = { serviceId: "acme", title: "Acme" };
    expect(getAeoDiscovery({ ...specWith("https://acme.example"), ...acme })).toBeNull();
    expect(getAeoDiscovery({ ...specWith(null), ...acme })).toBeNull();
    expect(getAeoDiscovery(null)).toBeNull();
  });
});
