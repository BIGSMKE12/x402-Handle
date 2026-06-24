import { describe, expect, test } from "bun:test";
import { aeoServiceHostCandidates, getAeoPayShText } from "./discovery";
import type { GeoEndpoint, GeoSpec, MppRegistryEndpoint } from "./source";

const obs = (resource: string): GeoEndpoint => ({
  resource,
  networks: [],
  assets: [],
  transactionCount: 0,
  totalAmountAtomic: "0",
});

const mpp = (resource: string): MppRegistryEndpoint => ({ resource });

const spec = (over: Partial<GeoSpec> = {}): GeoSpec => ({
  serviceId: "x",
  serviceUrl: null,
  title: null,
  category: null,
  description: null,
  mppDescription: null,
  useCase: null,
  endpointCount: null,
  hasMetering: null,
  hasFreeTier: null,
  providerSha: null,
  registryVersion: null,
  registryGeneratedAt: null,
  registrySourceUrl: null,
  priceRangeUsd: null,
  offers: [],
  observedEndpoints: [],
  mppEndpoints: [],
  atlasMissing: false,
  ...over,
});

describe("aeoServiceHostCandidates", () => {
  test("uses the serviceUrl host first (StableEnrich)", () => {
    expect(aeoServiceHostCandidates(spec({ serviceUrl: "https://stableenrich.dev" }))).toEqual([
      "stableenrich.dev",
    ]);
  });

  test("falls back to observed endpoint hosts when serviceUrl is null (CoinGecko)", () => {
    expect(
      aeoServiceHostCandidates(
        spec({ observedEndpoints: [obs("https://pro-api.coingecko.com/api/v3/x402/price")] }),
      ),
    ).toEqual(["pro-api.coingecko.com"]);
  });

  test("falls back to MPP endpoint hosts when serviceUrl is null (Nansen)", () => {
    expect(
      aeoServiceHostCandidates(
        spec({ mppEndpoints: [mpp("https://api.nansen.ai/x402/profiler")] }),
      ),
    ).toEqual(["api.nansen.ai"]);
  });

  test("dedupes and orders serviceUrl, then observed, then MPP", () => {
    expect(
      aeoServiceHostCandidates(
        spec({
          serviceUrl: "https://a.test",
          observedEndpoints: [obs("https://b.test/x"), obs("https://a.test/y")],
          mppEndpoints: [mpp("https://c.test/z")],
        }),
      ),
    ).toEqual(["a.test", "b.test", "c.test"]);
  });

  test("returns [] for a null spec", () => {
    expect(aeoServiceHostCandidates(null)).toEqual([]);
  });
});

describe("getAeoPayShText", () => {
  test("returns curated copy for a known host", () => {
    const text = getAeoPayShText(spec({ serviceUrl: "https://stableenrich.dev" }));
    expect(text?.description).toContain("enrichment");
    expect(text?.useCase).toBeTruthy();
  });

  test("returns null for unknown hosts and null specs", () => {
    expect(getAeoPayShText(spec({ serviceUrl: "https://unknown.test" }))).toBeNull();
    expect(getAeoPayShText(null)).toBeNull();
  });
});
