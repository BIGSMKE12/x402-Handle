// Aggregate raw facilitator discovery items into the render-ready AeoDiscovery
// shape for a single service. Pure transform — derives only what discovery JSON
// carries (coverage, networks, schemes, price, verification, quality, schema
// presence). No usage/demand metrics.

import {
  type AeoChecklistItem,
  type AeoDiscovery,
  type AeoDiscoveryEndpoint,
  type FacilitatorDiscoveryRow,
  networkDisplayLabel,
} from "contracts";
import type { X402DiscoveryItem, X402Facilitator } from "./x402-discovery";

export type AeoAggregateInput = Record<X402Facilitator, X402DiscoveryItem[]>;

export type AeoAggregateOptions = {
  /** Snapshot/refresh date (YYYY-MM-DD). Defaults to the freshest listing date. */
  snapshotDate?: string;
  /** Override the synthesized section description. */
  description?: string;
};

const FACILITATOR_ORDER: readonly X402Facilitator[] = ["cdp", "dexter", "payai"] as const;
const FACILITATOR_LABEL: Record<X402Facilitator, string> = {
  cdp: "Coinbase CDP",
  dexter: "Dexter",
  payai: "PayAI",
};

// USDC has 6 decimals; the demo discovery data is USDC-denominated. Non-USDC
// assets would need a per-asset decimals map (out of scope).
const USDC_DECIMALS = 6;

const NETWORK_PRIORITY = ["Base", "Solana", "Polygon", "Ethereum"];

const hostOf = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
};

const pathOf = (url: string | undefined): string => {
  if (!url) return "";
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

const amountToUsd = (amount: string | undefined): number | null => {
  if (!amount || !/^\d+$/.test(amount)) return null;
  return Number(amount) / 10 ** USDC_DECIMALS;
};

const isoDate = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

const orderNetworks = (networks: Set<string>): string[] => {
  const all = [...networks];
  const known = NETWORK_PRIORITY.filter((n) => networks.has(n));
  const rest = all.filter((n) => !NETWORK_PRIORITY.includes(n)).sort();
  return [...known, ...rest];
};

const itemsForHost = (items: X402DiscoveryItem[], host: string): X402DiscoveryItem[] =>
  items.filter((item) => hostOf(item.resource) === host);

const ADDRESS_LIKE = /^0x|,|^[0-9a-f]{16,}$|^[A-Za-z0-9]{32,}$/;

// Best-effort human name from a resource path when no displayName is published.
const nameFromPath = (path: string): string => {
  const segments = path.split("/").filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i];
    if (segment && !ADDRESS_LIKE.test(segment)) {
      return segment.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return segments.at(-1) ?? path;
};

type FacilitatorStats = {
  row: FacilitatorDiscoveryRow;
  describedCount: number;
  itemCount: number;
  schemaCount: number;
  maxLastUpdated?: string;
};

const buildFacilitatorStats = (
  facilitator: X402Facilitator,
  items: X402DiscoveryItem[],
): FacilitatorStats => {
  const paths = new Set<string>();
  const networks = new Set<string>();
  const schemes = new Set<string>();
  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = Number.NEGATIVE_INFINITY;
  let hasPrice = false;
  let verifPass = 0;
  let verifTotal = 0;
  let qualitySum = 0;
  let qualityCount = 0;
  let schemaCount = 0;
  let describedCount = 0;
  let maxLastUpdated: string | undefined;

  for (const item of items) {
    paths.add(pathOf(item.resource));
    if (item.description || item.metadata?.description) describedCount += 1;
    if (item.extensions?.bazaar) schemaCount += 1;

    for (const accept of item.accepts ?? []) {
      if (accept.network) networks.add(networkDisplayLabel(accept.network));
      if (accept.scheme) schemes.add(accept.scheme);
      const usd = amountToUsd(accept.amount);
      if (usd !== null) {
        hasPrice = true;
        priceMin = Math.min(priceMin, usd);
        priceMax = Math.max(priceMax, usd);
      }
    }

    const status = item.metadata?.verificationStatus;
    if (status) {
      verifTotal += 1;
      if (status === "pass") verifPass += 1;
    }
    const quality = item.metadata?.qualityScore;
    if (typeof quality === "number") {
      qualitySum += quality;
      qualityCount += 1;
    }
    const lastUpdated = isoDate(item.lastUpdated);
    if (lastUpdated && (!maxLastUpdated || lastUpdated > maxLastUpdated)) {
      maxLastUpdated = lastUpdated;
    }
  }

  const row: FacilitatorDiscoveryRow = {
    facilitator: FACILITATOR_LABEL[facilitator],
    registered: items.length > 0,
    endpoints: paths.size,
    networks: orderNetworks(networks),
    schemes: [...schemes],
    priceUsd: hasPrice ? { min: priceMin, max: priceMax } : null,
    verificationPass: verifTotal > 0 ? verifPass : undefined,
    verificationTotal: verifTotal > 0 ? verifTotal : undefined,
    avgQualityScore: qualityCount > 0 ? round1(qualitySum / qualityCount) : undefined,
    hasSchema: schemaCount > 0 ? true : undefined,
    lastUpdated: maxLastUpdated,
  };

  return { row, describedCount, itemCount: items.length, schemaCount, maxLastUpdated };
};

type PathAgg = {
  path: string;
  name?: string;
  networks: Set<string>;
  prices: number[];
  onCdp: boolean;
  onDexter: boolean;
  onPayai: boolean;
  qualityScore?: number;
};

const buildEndpoints = (
  perFacilitator: Record<X402Facilitator, X402DiscoveryItem[]>,
): AeoDiscoveryEndpoint[] => {
  const pathMap = new Map<string, PathAgg>();

  for (const facilitator of FACILITATOR_ORDER) {
    for (const item of perFacilitator[facilitator]) {
      const path = pathOf(item.resource);
      let agg = pathMap.get(path);
      if (!agg) {
        agg = {
          path,
          networks: new Set(),
          prices: [],
          onCdp: false,
          onDexter: false,
          onPayai: false,
        };
        pathMap.set(path, agg);
      }
      if (facilitator === "cdp") agg.onCdp = true;
      if (facilitator === "dexter") agg.onDexter = true;
      if (facilitator === "payai") agg.onPayai = true;

      for (const accept of item.accepts ?? []) {
        if (accept.network) agg.networks.add(networkDisplayLabel(accept.network));
        const usd = amountToUsd(accept.amount);
        if (usd !== null) agg.prices.push(usd);
      }
      const displayName = item.metadata?.displayName;
      if (displayName && !agg.name) agg.name = displayName;
      const quality = item.metadata?.qualityScore;
      if (
        typeof quality === "number" &&
        (agg.qualityScore === undefined || quality > agg.qualityScore)
      ) {
        agg.qualityScore = quality;
      }
    }
  }

  return [...pathMap.values()].map((agg) => ({
    path: agg.path,
    name: agg.name ?? nameFromPath(agg.path),
    networks: orderNetworks(agg.networks),
    priceUsd: agg.prices.length > 0 ? Math.min(...agg.prices) : 0,
    onCdp: agg.onCdp,
    onDexter: agg.onDexter,
    onPayai: agg.onPayai,
    qualityScore: agg.qualityScore,
  }));
};

const withinDays = (date: string | undefined, reference: string, days: number): boolean => {
  if (!date) return false;
  const then = Date.parse(`${date}T00:00:00Z`);
  const ref = Date.parse(`${reference}T00:00:00Z`);
  if (Number.isNaN(then) || Number.isNaN(ref)) return false;
  return ref - then <= days * 24 * 60 * 60 * 1000 && then <= ref + days * 24 * 60 * 60 * 1000;
};

const buildChecklist = (
  stats: Record<X402Facilitator, FacilitatorStats>,
  registeredFacilitators: X402Facilitator[],
  verifPass: number,
  verifTotal: number,
  maxLastUpdated: string | undefined,
  snapshotDate: string,
): AeoChecklistItem[] => {
  const totalItems = FACILITATOR_ORDER.reduce((sum, f) => sum + stats[f].itemCount, 0);
  const describedItems = FACILITATOR_ORDER.reduce((sum, f) => sum + stats[f].describedCount, 0);
  const schemaItems = FACILITATOR_ORDER.reduce((sum, f) => sum + stats[f].schemaCount, 0);
  const missing = FACILITATOR_ORDER.filter((f) => !registeredFacilitators.includes(f)).map(
    (f) => FACILITATOR_LABEL[f],
  );

  const checklist: AeoChecklistItem[] = [
    {
      label: "Description published",
      ok: totalItems > 0 && describedItems === totalItems,
      hint: `${describedItems} / ${totalItems} listings include an agent-readable description.`,
    },
    {
      label: "Input/output schema",
      ok: schemaItems > 0,
      hint:
        schemaItems > 0
          ? `${schemaItems} CDP (Bazaar) listings expose a JSON schema agents can introspect.`
          : "No facilitator listing exposes an input/output schema (CDP Bazaar).",
    },
    {
      label: "Verification passing",
      ok: verifTotal > 0 && verifPass === verifTotal,
      hint:
        verifTotal > 0
          ? `${verifPass} / ${verifTotal} endpoints pass Dexter verification.`
          : "No facilitator reports verification for this service.",
    },
    {
      label: "Freshness (updated ≤ 30d)",
      ok: withinDays(maxLastUpdated, snapshotDate, 30),
      hint: maxLastUpdated
        ? `Listings last refreshed ${maxLastUpdated}.`
        : "No freshness signal on the listings.",
    },
    missing.length === 0
      ? {
          label: "Listed on all facilitators",
          ok: true,
          hint: "Registered on CDP, Dexter, and PayAI.",
        }
      : {
          label: `Not listed on ${missing.join(", ")}`,
          ok: false,
          hint: `Not registered on ${missing.join(", ")} — registering would extend agent reach.`,
        },
  ];

  return checklist;
};

export const aggregateAeoDiscovery = (
  input: AeoAggregateInput,
  serviceHost: string,
  options: AeoAggregateOptions = {},
): AeoDiscovery | null => {
  const host = serviceHost.trim().toLowerCase();
  if (!host) return null;

  const perFacilitator = {
    cdp: itemsForHost(input.cdp, host),
    dexter: itemsForHost(input.dexter, host),
    payai: itemsForHost(input.payai, host),
  } satisfies Record<X402Facilitator, X402DiscoveryItem[]>;

  const totalMatched = FACILITATOR_ORDER.reduce((sum, f) => sum + perFacilitator[f].length, 0);
  if (totalMatched === 0) return null;

  const stats = {
    cdp: buildFacilitatorStats("cdp", perFacilitator.cdp),
    dexter: buildFacilitatorStats("dexter", perFacilitator.dexter),
    payai: buildFacilitatorStats("payai", perFacilitator.payai),
  } satisfies Record<X402Facilitator, FacilitatorStats>;

  const registeredFacilitators = FACILITATOR_ORDER.filter((f) => stats[f].row.registered);

  const verifPass = FACILITATOR_ORDER.reduce(
    (sum, f) => sum + (stats[f].row.verificationPass ?? 0),
    0,
  );
  const verifTotal = FACILITATOR_ORDER.reduce(
    (sum, f) => sum + (stats[f].row.verificationTotal ?? 0),
    0,
  );

  const maxLastUpdated = FACILITATOR_ORDER.map((f) => stats[f].maxLastUpdated)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

  const snapshotDate =
    options.snapshotDate ?? maxLastUpdated ?? new Date().toISOString().slice(0, 10);

  const endpoints = buildEndpoints(perFacilitator);

  const description =
    options.description ??
    `How ${serviceHost}'s x402 endpoints are discoverable to AI agents across the CDP, Dexter, and PayAI facilitator registries.`;

  return {
    snapshotDate,
    description,
    coverage: { registered: registeredFacilitators.length, total: FACILITATOR_ORDER.length },
    totalEndpoints: endpoints.length,
    verificationPassRate: verifTotal > 0 ? verifPass / verifTotal : 0,
    checklist: buildChecklist(
      stats,
      registeredFacilitators,
      verifPass,
      verifTotal,
      maxLastUpdated,
      snapshotDate,
    ),
    facilitators: FACILITATOR_ORDER.map((f) => stats[f].row),
    endpoints,
  };
};
