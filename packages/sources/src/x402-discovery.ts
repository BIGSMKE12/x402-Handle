// Multi-facilitator x402 discovery fetcher.
//
// Ported from the repo-root `crawl-x402-discovery.ts` CLI, but returns
// in-memory arrays (instead of streaming to files) so the BFF can hold the
// latest discovery JSON and refresh it on demand. The HTTP client is injected
// via `FetchLike` so refresh and tests can run offline with a stub.

import type { FetchLike } from "./transport";

export type X402Facilitator = "cdp" | "dexter" | "payai";

export const X402_FACILITATORS: readonly X402Facilitator[] = ["cdp", "dexter", "payai"] as const;

export const X402_FACILITATOR_ENDPOINTS: Record<X402Facilitator, string> = {
  cdp: "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources",
  dexter: "https://x402.dexter.cash/discovery/resources",
  payai: "https://facilitator.payai.network/discovery/resources",
};

// One payment option a resource accepts.
export type X402Accept = {
  asset?: string;
  payTo?: string;
  amount?: string;
  scheme?: string;
  network?: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
  [key: string]: unknown;
};

export type X402ItemMetadata = {
  description?: string;
  displayName?: string;
  category?: string;
  qualityScore?: number;
  verificationStatus?: string;
  tier?: string;
  [key: string]: unknown;
};

// A single discovery resource as returned by a facilitator. External data, so
// fields are permissive; the aggregator reads them defensively.
export type X402DiscoveryItem = {
  resource?: string;
  type?: string;
  description?: string;
  method?: string;
  x402Version?: number;
  accepts?: X402Accept[];
  lastUpdated?: string;
  metadata?: X402ItemMetadata;
  extensions?: { bazaar?: unknown; [key: string]: unknown };
  [key: string]: unknown;
};

export type X402FacilitatorItems = Record<X402Facilitator, X402DiscoveryItem[]>;

// Project a discovery item down to only the fields the AEO aggregator needs.
// Critically drops the bulky `extensions.bazaar` JSON schemas (kept only as a
// presence marker), which dominate the raw payload size, so the BFF can hold
// the full registry in memory cheaply.
export const slimX402DiscoveryItem = (item: X402DiscoveryItem): X402DiscoveryItem => ({
  resource: item.resource,
  description: typeof item.description === "string" ? item.description : undefined,
  method: item.method,
  lastUpdated: item.lastUpdated,
  accepts: (item.accepts ?? []).map((accept) => ({
    asset: accept.asset,
    payTo: accept.payTo,
    amount: accept.amount,
    scheme: accept.scheme,
    network: accept.network,
  })),
  metadata: item.metadata
    ? {
        displayName: item.metadata.displayName,
        category: item.metadata.category,
        qualityScore: item.metadata.qualityScore,
        verificationStatus: item.metadata.verificationStatus,
        tier: item.metadata.tier,
      }
    : undefined,
  extensions: item.extensions?.bazaar ? { bazaar: true } : undefined,
});

export type X402DiscoveryResult = X402FacilitatorItems & {
  fetchedAt: string;
  counts: Record<X402Facilitator, number>;
  /** Per-facilitator error message when that facilitator failed after retries. */
  errors: Partial<Record<X402Facilitator, string>>;
};

export type FetchX402DiscoveryOptions = {
  services?: X402Facilitator[];
  /** Page size. Rounded to nearest 10, min 20, max 1000. Default 1000. */
  limit?: number;
  /** Stop after this many items per facilitator. */
  maxItemsPerService?: number;
  retries?: number;
  timeoutMs?: number;
  delayMs?: number;
  /** Override facilitator endpoints (used by tests). */
  endpoints?: Partial<Record<X402Facilitator, string>>;
  /** Project each item as it is read (e.g. slimX402DiscoveryItem) to bound memory. */
  mapItem?: (item: X402DiscoveryItem) => X402DiscoveryItem;
  fetchFn?: FetchLike;
};

type DiscoveryResponse = {
  items?: unknown[];
  pagination?: { limit?: number; offset?: number; total?: number };
  x402Version?: number;
};

const DEFAULT_LIMIT = 1000;
const DEFAULT_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30_000;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeLimit = (limit: number): number => {
  const rounded = Math.round(limit / 10) * 10;
  return Math.max(20, Math.min(1000, rounded));
};

const sleep = (ms: number): Promise<void> =>
  ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));

const getItems = (page: DiscoveryResponse): unknown[] => {
  if (!Array.isArray(page.items)) {
    throw new Error("Response did not include an items array");
  }
  return page.items;
};

const pageLimit = (page: DiscoveryResponse, fallback: number): number => {
  const limit = page.pagination?.limit;
  return typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? limit : fallback;
};

const pageOffset = (page: DiscoveryResponse, fallback: number): number => {
  const offset = page.pagination?.offset;
  return typeof offset === "number" && Number.isFinite(offset) && offset >= 0 ? offset : fallback;
};

const pageTotal = (page: DiscoveryResponse): number | undefined => {
  const total = page.pagination?.total;
  return typeof total === "number" && Number.isFinite(total) && total >= 0 ? total : undefined;
};

async function fetchPage(
  endpoint: string,
  limit: number,
  offset: number,
  retries: number,
  timeoutMs: number,
  fetchFn: FetchLike,
): Promise<DiscoveryResponse> {
  const url = new URL(endpoint);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchFn(url, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${body.slice(0, 500)}`);
      }
      const json = await response.json();
      if (!isObject(json)) {
        throw new Error("Response body was not a JSON object");
      }
      return json as DiscoveryResponse;
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(500 * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function fetchServiceItems(
  endpoint: string,
  limit: number,
  maxItems: number | undefined,
  retries: number,
  timeoutMs: number,
  delayMs: number,
  fetchFn: FetchLike,
  mapItem: ((item: X402DiscoveryItem) => X402DiscoveryItem) | undefined,
): Promise<X402DiscoveryItem[]> {
  const items: X402DiscoveryItem[] = [];
  let offset = 0;
  let total: number | undefined;

  while (true) {
    const page = await fetchPage(endpoint, limit, offset, retries, timeoutMs, fetchFn);
    const pageItems = getItems(page);
    const effLimit = pageLimit(page, limit);
    const effOffset = pageOffset(page, offset);
    total = pageTotal(page) ?? total;

    const remaining = maxItems === undefined ? pageItems.length : maxItems - items.length;
    for (const item of pageItems.slice(0, Math.max(0, remaining))) {
      const typed = item as X402DiscoveryItem;
      items.push(mapItem ? mapItem(typed) : typed);
    }

    if (pageItems.length === 0) break;
    if (maxItems !== undefined && items.length >= maxItems) break;

    const nextOffset = effOffset + effLimit;
    if (total !== undefined && nextOffset >= total) break;

    offset = nextOffset;
    await sleep(delayMs);
  }

  return items;
}

/**
 * Fetch x402 discovery resources from the requested facilitators. Never throws
 * for per-facilitator network/parse failures — those are collected in `errors`
 * with an empty array for that facilitator, so callers can keep prior data.
 */
export async function fetchX402Discovery(
  options: FetchX402DiscoveryOptions = {},
): Promise<X402DiscoveryResult> {
  const services = options.services ?? [...X402_FACILITATORS];
  const limit = normalizeLimit(options.limit ?? DEFAULT_LIMIT);
  const retries = Math.max(0, options.retries ?? DEFAULT_RETRIES);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const delayMs = Math.max(0, options.delayMs ?? 0);
  const fetchFn = options.fetchFn ?? (globalThis.fetch as FetchLike);

  const result: X402DiscoveryResult = {
    cdp: [],
    dexter: [],
    payai: [],
    fetchedAt: new Date().toISOString(),
    counts: { cdp: 0, dexter: 0, payai: 0 },
    errors: {},
  };

  for (const service of services) {
    const endpoint = options.endpoints?.[service] ?? X402_FACILITATOR_ENDPOINTS[service];
    try {
      const items = await fetchServiceItems(
        endpoint,
        limit,
        options.maxItemsPerService,
        retries,
        timeoutMs,
        delayMs,
        fetchFn,
        options.mapItem,
      );
      result[service] = items;
      result.counts[service] = items.length;
    } catch (error) {
      result.errors[service] = error instanceof Error ? error.message : String(error);
    }
  }

  result.fetchedAt = new Date().toISOString();
  return result;
}
