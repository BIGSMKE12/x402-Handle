import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createX402DiscoveryStore } from "../src/data/x402-discovery/store";

const tmpDirs: string[] = [];

const seedDir = (files: Record<string, unknown[]>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "x402-store-"));
  tmpDirs.push(dir);
  for (const [name, items] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(items));
  }
  return dir;
};

const item = (
  host: string,
  suffix: string,
  extra: { bazaar?: boolean; metadata?: Record<string, unknown> } = {},
) => ({
  resource: `https://${host}/api/${suffix}`,
  description: "Example endpoint",
  lastUpdated: "2026-06-23T00:00:00.000Z",
  accepts: [
    { asset: "USDC", payTo: "0xabc", amount: "10000", scheme: "exact", network: "eip155:8453" },
  ],
  metadata: extra.metadata,
  extensions: extra.bazaar ? { bazaar: true } : undefined,
});

const TEST_ENDPOINTS = {
  cdp: "https://cdp.test/d",
  dexter: "https://dexter.test/d",
  payai: "https://payai.test/d",
} as const;

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe("createX402DiscoveryStore", () => {
  test("loadInitial reads slim snapshots and aggregates by host", () => {
    const dir = seedDir({
      cdp: [item("svc.test", "a", { bazaar: true })],
      dexter: [
        item("svc.test", "a", {
          metadata: { displayName: "A", qualityScore: 90, verificationStatus: "pass" },
        }),
      ],
      payai: [],
    });
    const store = createX402DiscoveryStore({ dir });
    const status = store.loadInitial();

    expect(status.source).toBe("snapshot");
    expect(status.counts).toEqual({ cdp: 1, dexter: 1, payai: 0 });

    const aggregate = store.getAggregate("svc.test");
    expect(aggregate?.coverage).toEqual({ registered: 2, total: 3 });
    expect(aggregate?.facilitators[0]?.hasSchema).toBe(true);
    expect(store.getAggregate("other.test")).toBeNull();
  });

  test("loadInitial on an empty/missing dir reports empty and aggregates null", () => {
    const dir = seedDir({});
    const store = createX402DiscoveryStore({ dir });
    const status = store.loadInitial();

    expect(status.source).toBe("empty");
    expect(store.getAggregate("svc.test")).toBeNull();
  });

  test("refresh fetches live, swaps in-memory data, and marks source live", async () => {
    const store = createX402DiscoveryStore({ dir: seedDir({}) });
    store.loadInitial();

    const status = await store.refresh({
      endpoints: TEST_ENDPOINTS,
      fetchFn: async (input) => {
        const url = new URL(String(input));
        if (url.host === "cdp.test") {
          return jsonResponse({
            items: [item("live.test", "a", { bazaar: true })],
            pagination: { total: 1 },
          });
        }
        return jsonResponse({ items: [], pagination: { total: 0 } });
      },
    });

    expect(status.source).toBe("live");
    expect(status.counts.cdp).toBe(1);
    expect(store.getAggregate("live.test")?.coverage).toEqual({ registered: 1, total: 3 });
  });

  test("refresh keeps prior data for a facilitator that fails", async () => {
    const store = createX402DiscoveryStore({
      dir: seedDir({ cdp: [item("svc.test", "a", { bazaar: true })], dexter: [], payai: [] }),
    });
    store.loadInitial();

    const status = await store.refresh({
      retries: 0,
      endpoints: TEST_ENDPOINTS,
      fetchFn: async (input) => {
        const url = new URL(String(input));
        if (url.host === "cdp.test") return new Response("boom", { status: 500 });
        return jsonResponse({ items: [], pagination: { total: 0 } });
      },
    });

    expect(status.lastRefreshErrors?.cdp).toContain("HTTP 500");
    // Prior CDP snapshot retained despite the failed refresh.
    expect(status.counts.cdp).toBe(1);
    expect(store.getAggregate("svc.test")?.coverage.registered).toBe(1);
  });

  test("refresh persists fetched data so a restarted store loads it without fetching", async () => {
    const dir = seedDir({ cdp: [], dexter: [], payai: [] });
    const store = createX402DiscoveryStore({ dir });
    store.loadInitial();

    const status = await store.refresh({
      endpoints: TEST_ENDPOINTS,
      fetchFn: async (input) => {
        const url = new URL(String(input));
        if (url.host === "cdp.test") {
          return jsonResponse({
            items: [item("live.test", "a", { bazaar: true })],
            pagination: { total: 1 },
          });
        }
        return jsonResponse({ items: [], pagination: { total: 0 } });
      },
    });

    expect(status.lastPersistAt).toBeTruthy();
    expect(status.persistError).toBeUndefined();
    // The fetched data was written to disk.
    expect(JSON.parse(fs.readFileSync(path.join(dir, "cdp.json"), "utf8"))).toHaveLength(1);

    // A brand-new store (process restart) loads the persisted data from disk
    // with no network access.
    const restarted = createX402DiscoveryStore({ dir });
    const reloaded = restarted.loadInitial();
    expect(reloaded.source).toBe("snapshot");
    expect(reloaded.counts.cdp).toBe(1);
    expect(restarted.getAggregate("live.test")?.coverage.registered).toBe(1);
  });

  test("loadInitial prefers the persisted data dir over the committed seed dir", () => {
    const seed = seedDir({
      cdp: [item("seed.test", "a", { bazaar: true })],
      dexter: [],
      payai: [],
    });
    const data = seedDir({
      cdp: [item("fresh.test", "a", { bazaar: true })],
      dexter: [],
      payai: [],
    });
    const store = createX402DiscoveryStore({ dir: seed, dataDir: data });
    store.loadInitial();

    expect(store.getAggregate("fresh.test")).not.toBeNull();
    expect(store.getAggregate("seed.test")).toBeNull();
  });
});
