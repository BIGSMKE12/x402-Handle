// x402 facilitator discovery insights for the AEO page.
//
// For this demo the aggregates are embedded directly in the frontend (no bake
// pipeline). Values are pre-computed from `discoveries/{cdp,dexter,payai}.json`
// (snapshot 2026-06-10/11). Only providers with a fixture below render the x402
// Discovery section; everything else returns null and the section is hidden.

import type { GeoSpec } from "./source";

export type FacilitatorDiscoveryRow = {
  facilitator: string;
  registered: boolean;
  endpoints: number;
  networks: string[];
  schemes: string[];
  priceUsd: { min: number; max: number } | null;
  // CDP-style demand signals.
  l30Calls?: number;
  uniquePayers?: number;
  // Dexter-style quality signals.
  verificationPass?: number;
  verificationTotal?: number;
  avgQualityScore?: number;
  // Bazaar / input schema presence.
  hasSchema?: boolean;
  lastUpdated?: string;
};

export type AeoChecklistItem = {
  label: string;
  ok: boolean;
  hint: string;
};

// Per-endpoint coverage across facilitator registries (mirrors the MPP
// per-endpoint table). `onPayai` is included for completeness even though this
// provider has zero PayAI listings.
export type AeoDiscoveryEndpoint = {
  path: string;
  name: string;
  networks: string[];
  priceUsd: number;
  onCdp: boolean;
  onDexter: boolean;
  onPayai: boolean;
  l30Calls?: number; // CDP demand
  qualityScore?: number; // Dexter quality
};

export type AeoDiscovery = {
  snapshotDate: string;
  description: string;
  coverage: { registered: number; total: number };
  totalEndpoints: number;
  l30Calls: number;
  verificationPassRate: number; // 0..1
  checklist: AeoChecklistItem[];
  facilitators: FacilitatorDiscoveryRow[];
  endpoints: AeoDiscoveryEndpoint[];
};

const STABLEENRICH_DISCOVERY: AeoDiscovery = {
  snapshotDate: "2026-06-11",
  description:
    "How StableEnrich's web-search, data-enrichment, and verification APIs (Exa, Firecrawl, Serper, Apollo, Hunter, Google Maps, and more) are discoverable to AI agents across x402 facilitator registries.",
  coverage: { registered: 2, total: 3 },
  totalEndpoints: 23,
  l30Calls: 6478,
  verificationPassRate: 1,
  checklist: [
    {
      label: "Description published",
      ok: true,
      hint: "All 15 Dexter listings include a human/agent-readable description.",
    },
    {
      label: "Input/output schema",
      ok: true,
      hint: "All 13 CDP (Bazaar) listings expose a JSON schema agents can introspect.",
    },
    {
      label: "Verification passing",
      ok: true,
      hint: "15 / 15 endpoints pass Dexter verification (tier: verified).",
    },
    {
      label: "Freshness (updated ≤ 30d)",
      ok: true,
      hint: "Listings last refreshed 2026-06-11.",
    },
    {
      label: "Not listed on PayAI",
      ok: false,
      hint: "Not registered on PayAI — registering would extend reach to Solana-first agents.",
    },
  ],
  facilitators: [
    {
      facilitator: "Coinbase CDP",
      registered: true,
      endpoints: 13,
      networks: ["Base", "Solana"],
      schemes: ["exact"],
      priceUsd: { min: 0.002, max: 0.44 },
      l30Calls: 6478,
      uniquePayers: 387,
      hasSchema: true,
      lastUpdated: "2026-06-11",
    },
    {
      facilitator: "Dexter",
      registered: true,
      endpoints: 15,
      networks: ["Base", "Solana"],
      schemes: ["exact"],
      priceUsd: { min: 0.002, max: 0.0495 },
      verificationPass: 15,
      verificationTotal: 15,
      avgQualityScore: 86.5,
      lastUpdated: "2026-06-11",
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
  // 23 unique endpoints across CDP + Dexter (PayAI carries none for this provider).
  endpoints: [
    {
      path: "/api/apollo/people-enrich",
      name: "Apollo People Enricher",
      networks: ["Base", "Solana"],
      priceUsd: 0.0495,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 2454,
      qualityScore: 92,
    },
    {
      path: "/api/exa/search",
      name: "Exa Search",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 2395,
      qualityScore: 100,
    },
    {
      path: "/api/firecrawl/search",
      name: "Firecrawl Search",
      networks: ["Base", "Solana"],
      priceUsd: 0.0252,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 435,
      qualityScore: 100,
    },
    {
      path: "/api/google-maps/place-details/full",
      name: "Place Details (full)",
      networks: ["Base", "Solana"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 291,
    },
    {
      path: "/api/clado/contacts-enrich",
      name: "Clado Contacts Enrich",
      networks: ["Base", "Solana"],
      priceUsd: 0.2,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 273,
    },
    {
      path: "/api/google-maps/solar/building-insights",
      name: "Solar Building Insights",
      networks: ["Base", "Solana"],
      priceUsd: 0.02,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 185,
    },
    {
      path: "/api/whitepages/person-search",
      name: "Whitepages Person Search",
      networks: ["Base", "Solana"],
      priceUsd: 0.44,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 152,
    },
    {
      path: "/api/reddit/search",
      name: "Reddit Search Enrich",
      networks: ["Base", "Solana"],
      priceUsd: 0.02,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 90,
      qualityScore: 72,
    },
    {
      path: "/api/google-maps/place-details/partial",
      name: "Place Details (partial)",
      networks: ["Base", "Solana"],
      priceUsd: 0.02,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 70,
    },
    {
      path: "/api/exa/contents",
      name: "Exa Content Enricher",
      networks: ["Base", "Solana"],
      priceUsd: 0.002,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 69,
      qualityScore: 64,
    },
    {
      path: "/api/google-maps/aerial-view/lookup-video",
      name: "Aerial View Video Lookup",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 56,
    },
    {
      path: "/api/google-maps/solar/data-layers",
      name: "Solar Data Layers",
      networks: ["Base", "Solana"],
      priceUsd: 0.08,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 7,
    },
    {
      path: "/api/google-maps/solar/rgb-image",
      name: "Solar RGB Image",
      networks: ["Base", "Solana"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/exa/answer",
      name: "Exa Answer API",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 100,
    },
    {
      path: "/api/hunter/email-verifier",
      name: "Hunter Email Verifier",
      networks: ["Base", "Solana"],
      priceUsd: 0.03,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 100,
    },
    {
      path: "/api/serper/news",
      name: "Serper News Fetch",
      networks: ["Base", "Solana"],
      priceUsd: 0.04,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 100,
    },
    {
      path: "/api/serper/people-image-search",
      name: "People Image Search",
      networks: ["Base", "Solana"],
      priceUsd: 0.04,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 94,
    },
    {
      path: "/api/serper/images",
      name: "Serper Image Search",
      networks: ["Base", "Solana"],
      priceUsd: 0.04,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 92,
    },
    {
      path: "/api/apollo/org-enrich",
      name: "Apollo Org Enrich",
      networks: ["Base", "Solana"],
      priceUsd: 0.0495,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 86,
    },
    {
      path: "/api/minerva/resolve",
      name: "Minerva Resolve",
      networks: ["Base", "Solana"],
      priceUsd: 0.02,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 82,
    },
    {
      path: "/api/serper/shopping",
      name: "Serper Shopping Search",
      networks: ["Base", "Solana"],
      priceUsd: 0.04,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 82,
    },
    {
      path: "/api/google-maps/aerial-view/render-video",
      name: "Aerial View Video Render",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 72,
    },
    {
      path: "/api/minerva/validate-emails",
      name: "Minerva Email Validator",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 61,
    },
  ],
};

// Keyed by serviceUrl host. Extend with more providers as fixtures are added.
const DISCOVERY_BY_HOST: Record<string, AeoDiscovery> = {
  "stableenrich.dev": STABLEENRICH_DISCOVERY,
};

const hostOf = (url: string | null): string | null => {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return (
      url
        .replace(/^https?:\/\//, "")
        .split("/")[0]
        ?.toLowerCase() ?? null
    );
  }
};

/** Returns embedded x402 discovery aggregates for a known provider, else null. */
export const getAeoDiscovery = (spec: GeoSpec | null): AeoDiscovery | null => {
  if (!spec) return null;
  const host = hostOf(spec.serviceUrl);
  if (host && DISCOVERY_BY_HOST[host]) return DISCOVERY_BY_HOST[host];
  return null;
};

export type AeoPayShText = { description: string; useCase: string };

// Curated Pay.sh description / use case for AEO demo providers, keyed by
// serviceUrl host. Overrides the baked atlas text when present (the baked entry
// can carry a mismatched description for a freshly listed provider).
const PAYSH_TEXT_BY_HOST: Record<string, AeoPayShText> = {
  "stableenrich.dev": {
    description:
      "Unified enrichment gateway for Apollo, Exa, Firecrawl, Google Maps, Hunter, Minerva, Reddit, Serper, Whitepages, Cloudflare, and more. Covers people and company enrichment, web search, scraping, maps, email verification, and property data.",
    useCase:
      "Use for contact enrichment, company lookup, prospect search, web search, page scraping, local business discovery, place details, email verification, social profile enrichment, Reddit research, news and shopping search, people search, and property records.",
  },
};

/** Curated Pay.sh description/use case for a known provider, else null. */
export const getAeoPayShText = (spec: GeoSpec | null): AeoPayShText | null => {
  if (!spec) return null;
  const host = hostOf(spec.serviceUrl);
  return host ? (PAYSH_TEXT_BY_HOST[host] ?? null) : null;
};
