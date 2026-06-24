import { describe, expect, test } from "bun:test";
import { fetchX402Discovery } from "../src/index";

const TEST_ENDPOINTS = {
  cdp: "https://cdp.test/discovery",
  dexter: "https://dexter.test/discovery",
  payai: "https://payai.test/discovery",
} as const;

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("fetchX402Discovery", () => {
  test("paginates a single facilitator using limit/offset until total is reached", async () => {
    const calls: Array<{ host: string; offset: string | null }> = [];
    const result = await fetchX402Discovery({
      services: ["dexter"],
      limit: 2,
      endpoints: TEST_ENDPOINTS,
      fetchFn: async (input) => {
        const url = new URL(String(input));
        calls.push({ host: url.host, offset: url.searchParams.get("offset") });
        const offset = Number(url.searchParams.get("offset"));
        const pages: Record<number, unknown[]> = {
          0: [{ resource: "https://svc/a" }, { resource: "https://svc/b" }],
          2: [{ resource: "https://svc/c" }],
        };
        return jsonResponse({
          items: pages[offset] ?? [],
          pagination: { limit: 2, offset, total: 3 },
        });
      },
    });

    expect(result.counts.dexter).toBe(3);
    expect(result.dexter.map((i) => i.resource)).toEqual([
      "https://svc/a",
      "https://svc/b",
      "https://svc/c",
    ]);
    expect(result.cdp).toHaveLength(0);
    expect(result.payai).toHaveLength(0);
    expect(result.errors).toEqual({});
    expect(calls.every((c) => c.host === "dexter.test")).toBe(true);
    expect(calls.map((c) => c.offset)).toEqual(["0", "2"]);
  });

  test("stops at an empty page when no total is provided", async () => {
    let call = 0;
    const result = await fetchX402Discovery({
      services: ["cdp"],
      endpoints: TEST_ENDPOINTS,
      fetchFn: async () => {
        call += 1;
        return jsonResponse({ items: call === 1 ? [{ resource: "https://svc/a" }] : [] });
      },
    });

    expect(result.counts.cdp).toBe(1);
    expect(call).toBe(2);
  });

  test("respects maxItemsPerService", async () => {
    const result = await fetchX402Discovery({
      services: ["cdp"],
      maxItemsPerService: 2,
      endpoints: TEST_ENDPOINTS,
      fetchFn: async () =>
        jsonResponse({
          items: [
            { resource: "https://svc/a" },
            { resource: "https://svc/b" },
            { resource: "https://svc/c" },
            { resource: "https://svc/d" },
          ],
        }),
    });

    expect(result.counts.cdp).toBe(2);
  });

  test("records a per-facilitator error without throwing and keeps others", async () => {
    const result = await fetchX402Discovery({
      services: ["cdp", "dexter"],
      retries: 0,
      endpoints: TEST_ENDPOINTS,
      fetchFn: async (input) => {
        const url = new URL(String(input));
        if (url.host === "cdp.test") return new Response("boom", { status: 500 });
        return jsonResponse({ items: [{ resource: "https://svc/a" }], pagination: { total: 1 } });
      },
    });

    expect(result.errors.cdp).toContain("HTTP 500");
    expect(result.cdp).toHaveLength(0);
    expect(result.counts.dexter).toBe(1);
  });

  test("only fetches the requested services", async () => {
    const hosts = new Set<string>();
    await fetchX402Discovery({
      services: ["payai"],
      endpoints: TEST_ENDPOINTS,
      fetchFn: async (input) => {
        hosts.add(new URL(String(input)).host);
        return jsonResponse({ items: [], pagination: { total: 0 } });
      },
    });

    expect([...hosts]).toEqual(["payai.test"]);
  });
});
