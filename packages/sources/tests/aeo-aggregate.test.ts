import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  aggregateAeoDiscovery,
  type AeoAggregateInput,
  type X402DiscoveryItem,
} from "../src/index";

// Aggregate against the committed facilitator snapshots (repo-root discoveries/).
const loadSnapshots = (): AeoAggregateInput => {
  const root = path.resolve(import.meta.dir, "../../../discoveries");
  const read = (name: string): X402DiscoveryItem[] =>
    JSON.parse(fs.readFileSync(path.join(root, `${name}.json`), "utf8")) as X402DiscoveryItem[];
  return { cdp: read("cdp"), dexter: read("dexter"), payai: read("payai") };
};

const snapshots = loadSnapshots();

describe("aggregateAeoDiscovery", () => {
  test("coingecko (CDP + Dexter, no PayAI) aggregates from discovery JSON", () => {
    const result = aggregateAeoDiscovery(snapshots, "pro-api.coingecko.com");
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.coverage).toEqual({ registered: 2, total: 3 });
    expect(result.facilitators.map((f) => f.facilitator)).toEqual([
      "Coinbase CDP",
      "Dexter",
      "PayAI",
    ]);

    const [cdp, dexter, payai] = result.facilitators;
    expect(cdp?.registered).toBe(true);
    expect(dexter?.registered).toBe(true);
    expect(payai?.registered).toBe(false);

    // CDP listings carry a Bazaar schema but no quality/verification metadata.
    expect(cdp?.hasSchema).toBe(true);
    expect(cdp?.avgQualityScore).toBeUndefined();
    expect(cdp?.verificationTotal).toBeUndefined();

    // Dexter listings carry quality + verification but no schema.
    expect(dexter?.avgQualityScore).toBeGreaterThan(0);
    expect(dexter?.verificationTotal).toBeGreaterThan(0);
    expect(dexter?.hasSchema).toBeUndefined();

    // PayAI not registered -> empty row.
    expect(payai?.endpoints).toBe(0);
    expect(payai?.priceUsd).toBeNull();

    expect(cdp?.networks).toContain("Base");
    expect(cdp?.schemes).toContain("exact");
    expect(cdp?.priceUsd?.min ?? 0).toBeGreaterThan(0);

    expect(result.totalEndpoints).toBeGreaterThan(0);
    expect(result.endpoints.length).toBe(result.totalEndpoints);
    expect(result.verificationPassRate).toBeGreaterThan(0);
    expect(result.verificationPassRate).toBeLessThanOrEqual(1);
    // Every endpoint row exposes facilitator coverage flags.
    expect(result.endpoints.every((e) => typeof e.onCdp === "boolean")).toBe(true);
  });

  test("carries CDP 30-day usage signals on per-endpoint coverage", () => {
    const result = aggregateAeoDiscovery(snapshots, "api.nansen.ai");
    const netflow = result?.endpoints.find((e) => e.path === "/api/v1/smart-money/netflow");
    expect(netflow?.cdpL30DaysTotalCalls).toBe(275);
    expect(netflow?.cdpL30DaysUniquePayers).toBe(23);
  });

  test("nansen is registered on all three facilitators", () => {
    const result = aggregateAeoDiscovery(snapshots, "api.nansen.ai");
    expect(result?.coverage).toEqual({ registered: 3, total: 3 });
    expect(result?.facilitators[2]?.registered).toBe(true); // PayAI
  });

  test("normalizes 18-decimal (BSC) stablecoin amounts instead of inflating price", () => {
    // Nansen lists 18-decimal BNB Chain stablecoins; treating them as 6-decimal
    // inflated the CDP price to ~$50B. Correct decimals keep it cent-scale.
    const result = aggregateAeoDiscovery(snapshots, "api.nansen.ai");
    const cdp = result?.facilitators.find((f) => f.facilitator === "Coinbase CDP");
    expect(cdp?.priceUsd).not.toBeNull();
    expect(cdp?.priceUsd?.max ?? 0).toBeLessThanOrEqual(1);
    expect(cdp?.priceUsd?.max ?? 0).toBeCloseTo(0.05, 5);
  });

  test("stableenrich is registered on CDP + Dexter only", () => {
    const result = aggregateAeoDiscovery(snapshots, "stableenrich.dev");
    expect(result?.coverage).toEqual({ registered: 2, total: 3 });
    expect(result?.facilitators[2]?.registered).toBe(false); // PayAI
  });

  test("returns null for a host not present in any registry", () => {
    expect(aggregateAeoDiscovery(snapshots, "nope.example.com")).toBeNull();
  });

  test("returns null for empty input", () => {
    expect(
      aggregateAeoDiscovery({ cdp: [], dexter: [], payai: [] }, "pro-api.coingecko.com"),
    ).toBeNull();
  });

  test("checklist follows the listing→freshness→description→io→verification order", () => {
    // Nansen is registered on all three facilitators (incl. Dexter), so the
    // full checklist with the verification item is present.
    const result = aggregateAeoDiscovery(snapshots, "api.nansen.ai");
    expect(result?.checklist.map((c) => c.label)).toEqual([
      "Listed on all facilitators",
      "Freshness (updated ≤ 30d)",
      "Description published",
      "Input/output schema",
      "Verification passing",
    ]);
  });

  test("omits the verification check when the service is not listed on Dexter", () => {
    // QuickNode is on CDP + PayAI only — no Dexter, so no verification signal.
    const result = aggregateAeoDiscovery(snapshots, "x402.quicknode.com");
    expect(result?.facilitators[1]?.registered).toBe(false); // Dexter
    expect(result?.checklist.some((c) => c.label === "Verification passing")).toBe(false);
  });

  test("honors an explicit snapshotDate and description override", () => {
    const result = aggregateAeoDiscovery(snapshots, "pro-api.coingecko.com", {
      snapshotDate: "2026-06-24",
      description: "Custom.",
    });
    expect(result?.snapshotDate).toBe("2026-06-24");
    expect(result?.description).toBe("Custom.");
  });
});
