import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createBffHandler } from "../src/http";
import { createX402DiscoveryStore } from "../src/data/x402-discovery/store";

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

let seedDir: string;
const tokenBackup = process.env.BFF_X402_REFRESH_TOKEN;

beforeEach(() => {
  seedDir = fs.mkdtempSync(path.join(os.tmpdir(), "aeo-routes-"));
  fs.writeFileSync(
    path.join(seedDir, "cdp.json"),
    JSON.stringify([item("svc.test", "a", { bazaar: true })]),
  );
  fs.writeFileSync(
    path.join(seedDir, "dexter.json"),
    JSON.stringify([
      item("svc.test", "a", {
        metadata: { displayName: "A", qualityScore: 90, verificationStatus: "pass" },
      }),
    ]),
  );
  fs.writeFileSync(path.join(seedDir, "payai.json"), JSON.stringify([]));
  delete process.env.BFF_X402_REFRESH_TOKEN;
});

afterEach(() => {
  fs.rmSync(seedDir, { recursive: true, force: true });
  if (tokenBackup === undefined) delete process.env.BFF_X402_REFRESH_TOKEN;
  else process.env.BFF_X402_REFRESH_TOKEN = tokenBackup;
});

// Keep analytics perpetually "loading" to prove the AEO endpoint is independent.
const makeHandler = () => {
  const store = createX402DiscoveryStore({ dir: seedDir });
  store.loadInitial();
  return createBffHandler(new Promise<never>(() => {}), null, undefined, store);
};

const post = (token?: string, header: "authorization" | "x-refresh-token" = "authorization") =>
  new Request("http://bff/aeo/x402/refresh", {
    method: "POST",
    headers: token ? { [header]: header === "authorization" ? `Bearer ${token}` : token } : {},
  });

describe("GET /aeo/x402", () => {
  test("returns the aggregate for a matched service even while analytics is loading", async () => {
    const res = await makeHandler()(new Request("http://bff/aeo/x402?service=svc.test"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { coverage: unknown };
    expect(body.coverage).toEqual({ registered: 2, total: 3 });
  });

  test("400 when the service query param is missing", async () => {
    const res = await makeHandler()(new Request("http://bff/aeo/x402"));
    expect(res.status).toBe(400);
  });

  test("404 for a host not present in any registry", async () => {
    const res = await makeHandler()(new Request("http://bff/aeo/x402?service=nope.test"));
    expect(res.status).toBe(404);
  });

  test("accepts comma-separated candidate hosts and returns the first match", async () => {
    const res = await makeHandler()(new Request("http://bff/aeo/x402?service=miss.test,svc.test"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { coverage: unknown };
    expect(body.coverage).toEqual({ registered: 2, total: 3 });
  });
});

describe("POST /aeo/x402/refresh", () => {
  test("403 when no refresh token is configured", async () => {
    const res = await makeHandler()(post("anything"));
    expect(res.status).toBe(403);
  });

  test("401 when the provided token is missing or wrong", async () => {
    process.env.BFF_X402_REFRESH_TOKEN = "secret";
    expect((await makeHandler()(post())).status).toBe(401);
    expect((await makeHandler()(post("wrong"))).status).toBe(401);
  });

  test("200 and refreshes the store with a valid token (offline fetch stub)", async () => {
    process.env.BFF_X402_REFRESH_TOKEN = "secret";
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ items: [], pagination: { total: 0 } }), {
        status: 200,
      })) as unknown as typeof fetch;
    try {
      const res = await makeHandler()(post("secret"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; source: string };
      expect(body.status).toBe("ok");
      expect(body.source).toBe("live");
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("accepts the x-refresh-token header as an alternative", async () => {
    process.env.BFF_X402_REFRESH_TOKEN = "secret";
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ items: [], pagination: { total: 0 } }), {
        status: 200,
      })) as unknown as typeof fetch;
    try {
      const res = await makeHandler()(post("secret", "x-refresh-token"));
      expect(res.status).toBe(200);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("404 for non-POST methods on the refresh path", async () => {
    const res = await makeHandler()(
      new Request("http://bff/aeo/x402/refresh", { method: "DELETE" }),
    );
    expect(res.status).toBe(404);
  });
});
