// x402 facilitator discovery insights for the AEO page.
//
// For this demo the aggregates are embedded directly in the frontend (no bake
// pipeline). Values are pre-computed from `discoveries/{cdp,dexter,payai}.json`
// (snapshot 2026-06-22/23). Only providers with a fixture below render the x402
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
// per-endpoint table). `onPayai` is included for completeness even when a
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
  /** Optional note shown under the per-endpoint table (e.g. grouping caveats). */
  endpointsNote?: string;
};

const STABLEENRICH_DISCOVERY: AeoDiscovery = {
  snapshotDate: "2026-06-23",
  description:
    "How StableEnrich's web-search, data-enrichment, and verification APIs (Exa, Firecrawl, Serper, Apollo, Hunter, Google Maps, and more) are discoverable to AI agents across x402 facilitator registries.",
  coverage: { registered: 2, total: 3 },
  totalEndpoints: 24,
  l30Calls: 15193,
  verificationPassRate: 1,
  checklist: [
    {
      label: "Description published",
      ok: true,
      hint: "All 15 Dexter and 14 CDP listings include agent-readable descriptions.",
    },
    {
      label: "Input/output schema",
      ok: true,
      hint: "All 14 CDP (Bazaar) listings expose a JSON schema agents can introspect.",
    },
    {
      label: "Verification passing",
      ok: true,
      hint: "15 / 15 endpoints pass Dexter verification (tier: verified).",
    },
    {
      label: "Freshness (updated ≤ 30d)",
      ok: true,
      hint: "Listings last refreshed 2026-06-23.",
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
      endpoints: 14,
      networks: ["Base", "Solana"],
      schemes: ["exact"],
      priceUsd: { min: 0.002, max: 0.22 },
      l30Calls: 15193,
      uniquePayers: 568,
      hasSchema: true,
      lastUpdated: "2026-06-23",
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
      lastUpdated: "2026-06-23",
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
  endpoints: [
    {
      path: "/api/apollo/people-enrich",
      name: "Apollo People Enrich",
      networks: ["Base", "Solana"],
      priceUsd: 0.0495,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 6454,
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
      l30Calls: 5664,
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
      l30Calls: 1009,
      qualityScore: 100,
    },
    {
      path: "/api/clado/contacts-enrich",
      name: "Clado Contacts Enrich",
      networks: ["Base", "Solana"],
      priceUsd: 0.2,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 418,
    },
    {
      path: "/api/reddit/search",
      name: "Reddit Search",
      networks: ["Base", "Solana"],
      priceUsd: 0.02,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 367,
      qualityScore: 72,
    },
    {
      path: "/api/google-maps/place-details/full",
      name: "Place Details Full",
      networks: ["Base", "Solana"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 326,
    },
    {
      path: "/api/exa/contents",
      name: "Exa Contents",
      networks: ["Base", "Solana"],
      priceUsd: 0.002,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 309,
      qualityScore: 64,
    },
    {
      path: "/api/whitepages/person-search",
      name: "Whitepages Person Search",
      networks: ["Base", "Solana"],
      priceUsd: 0.22,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 287,
    },
    {
      path: "/api/google-maps/solar/building-insights",
      name: "Solar Building Insights",
      networks: ["Base", "Solana"],
      priceUsd: 0.02,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 232,
    },
    {
      path: "/api/google-maps/place-details/partial",
      name: "Place Details Partial",
      networks: ["Base", "Solana"],
      priceUsd: 0.02,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 87,
    },
    {
      path: "/api/pdl/people-enrich",
      name: "Pdl People Enrich",
      networks: ["Base", "Solana"],
      priceUsd: 0.2,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 24,
    },
    {
      path: "/api/google-maps/aerial-view/lookup-video",
      name: "Aerial View Lookup Video",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 7,
    },
    {
      path: "/api/google-maps/solar/rgb-image",
      name: "Solar Rgb Image",
      networks: ["Base", "Solana"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 5,
    },
    {
      path: "/api/google-maps/solar/data-layers",
      name: "Solar Data Layers",
      networks: ["Base", "Solana"],
      priceUsd: 0.08,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 4,
    },
    {
      path: "/api/exa/answer",
      name: "Exa Answer",
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
      name: "Serper News",
      networks: ["Base", "Solana"],
      priceUsd: 0.04,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 100,
    },
    {
      path: "/api/serper/people-image-search",
      name: "Serper People Image Search",
      networks: ["Base", "Solana"],
      priceUsd: 0.04,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 94,
    },
    {
      path: "/api/serper/images",
      name: "Serper Images",
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
      name: "Serper Shopping",
      networks: ["Base", "Solana"],
      priceUsd: 0.04,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 82,
    },
    {
      path: "/api/google-maps/aerial-view/render-video",
      name: "Aerial View Render Video",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 72,
    },
    {
      path: "/api/minerva/validate-emails",
      name: "Minerva Validate Emails",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: false,
      onDexter: true,
      onPayai: false,
      qualityScore: 61,
    },
  ],
};

const NANSEN_DISCOVERY: AeoDiscovery = {
  snapshotDate: "2026-06-23",
  description:
    "How Nansen's on-chain analytics & smart-money intelligence endpoints (Token God Mode, Smart Money, Profiler, Prediction Market, Perps) are discoverable to AI agents across x402 facilitator registries.",
  coverage: { registered: 3, total: 3 },
  totalEndpoints: 48,
  l30Calls: 3588,
  verificationPassRate: 1,
  checklist: [
    {
      label: "Description published",
      ok: true,
      hint: "All CDP (45) and Dexter (2) listings include agent-readable descriptions.",
    },
    {
      label: "Input/output schema",
      ok: true,
      hint: "CDP Bazaar (45) and PayAI (37) listings expose machine-readable schemas.",
    },
    {
      label: "Verification passing",
      ok: true,
      hint: "2 / 2 Dexter listings pass verification (tier: verified).",
    },
    {
      label: "Freshness (updated ≤ 30d)",
      ok: true,
      hint: "Listings last refreshed 2026-06-23.",
    },
    {
      label: "Thin Dexter coverage",
      ok: false,
      hint: "Only 2 of 48 endpoints are listed on Dexter — broadening Dexter coverage would widen agent reach.",
    },
  ],
  facilitators: [
    {
      facilitator: "Coinbase CDP",
      registered: true,
      endpoints: 45,
      networks: ["Base", "Solana", "BSC", "X Layer"],
      schemes: ["exact"],
      priceUsd: { min: 0.01, max: 0.05 },
      l30Calls: 3588,
      uniquePayers: 178,
      hasSchema: true,
      lastUpdated: "2026-06-23",
    },
    {
      facilitator: "PayAI",
      registered: true,
      endpoints: 37,
      networks: ["Solana"],
      schemes: ["exact"],
      priceUsd: { min: 0.01, max: 0.05 },
      hasSchema: true,
      lastUpdated: "2026-06-23",
    },
    {
      facilitator: "Dexter",
      registered: true,
      endpoints: 2,
      networks: ["Base", "Solana", "X Layer"],
      schemes: ["exact"],
      priceUsd: { min: 0.01, max: 0.01 },
      verificationPass: 2,
      verificationTotal: 2,
      avgQualityScore: 88.5,
      lastUpdated: "2026-06-22",
    },
  ],
  endpoints: [
    {
      path: "/api/v1/profiler/address/current-balance",
      name: "Address Current Balance",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 825,
    },
    {
      path: "/api/v1/tgm/who-bought-sold",
      name: "Tgm Who Bought Sold",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 659,
    },
    {
      path: "/api/v1/prediction-market/market-screener",
      name: "Prediction Market Screener",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 296,
    },
    {
      path: "/api/v1/tgm/holders",
      name: "Tgm Holders",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 285,
    },
    {
      path: "/api/v1/smart-money/netflow",
      name: "Smart Money Netflow",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 275,
    },
    {
      path: "/api/v1/smart-money/holdings",
      name: "Smart Money Holdings",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 181,
    },
    {
      path: "/api/v1/tgm/flow-intelligence",
      name: "Tgm Flow Intelligence",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 145,
    },
    {
      path: "/api/v1/profiler/address/counterparties",
      name: "Address Counterparties",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 112,
    },
    {
      path: "/api/v1/smart-money/perp-trades",
      name: "Smart Money Perp Trades",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 98,
    },
    {
      path: "/api/v1/tgm/pnl-leaderboard",
      name: "Tgm Pnl Leaderboard",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 89,
    },
    {
      path: "/api/v1/tgm/token-information",
      name: "Tgm Token Information",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 88,
    },
    {
      path: "/api/v1/tgm/dex-trades",
      name: "Tgm Dex Trades",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 85,
    },
    {
      path: "/api/v1/tgm/flows",
      name: "Tgm Flows",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 83,
    },
    {
      path: "/api/v1/prediction-market/event-screener",
      name: "Prediction Market Event Screener",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 81,
    },
    {
      path: "/api/v1/prediction-market/address-summary",
      name: "Prediction Market Address Summary",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 75,
    },
    {
      path: "/api/v1/perp-leaderboard",
      name: "Perp Leaderboard",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 59,
    },
    {
      path: "/api/v1/smart-money/dex-trades",
      name: "Smart Money Dex Trades",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 25,
    },
    {
      path: "/api/v1/profiler/address/transactions",
      name: "Address Transactions",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 14,
    },
    {
      path: "/api/v1/prediction-market/ohlcv",
      name: "Prediction Market Ohlcv",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 13,
    },
    {
      path: "/api/v1/perp-screener",
      name: "Perp Screener",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 10,
    },
    {
      path: "/api/v1/profiler/address/pnl-summary",
      name: "Address Pnl Summary",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 10,
    },
    {
      path: "/api/v1/tgm/indicators",
      name: "Tgm Indicators",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 9,
    },
    {
      path: "/api/v1/profiler/address/related-wallets",
      name: "Address Related Wallets",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 8,
    },
    {
      path: "/api/v1/tgm/token-ohlcv",
      name: "Tgm Token Ohlcv",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 8,
    },
    {
      path: "/api/v1/profiler/address/pnl",
      name: "Address Pnl",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 7,
    },
    {
      path: "/api/v1/profiler/perp-positions",
      name: "Profiler Perp Positions",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 7,
    },
    {
      path: "/api/v1/prediction-market/orderbook",
      name: "Prediction Market Orderbook",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 5,
    },
    {
      path: "/api/v1/prediction-market/pnl-by-market",
      name: "Prediction Market Pnl By Market",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 5,
    },
    {
      path: "/api/v1/prediction-market/categories",
      name: "Prediction Market Categories",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: true,
      onPayai: true,
      l30Calls: 3,
      qualityScore: 95,
    },
    {
      path: "/api/v1/prediction-market/pnl-by-address",
      name: "Prediction Market Pnl By Address",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 3,
    },
    {
      path: "/api/v1/prediction-market/trades-by-market",
      name: "Prediction Market Trades By Market",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 3,
    },
    {
      path: "/api/v1/tgm/perp-pnl-leaderboard",
      name: "Tgm Perp Pnl Leaderboard",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 3,
    },
    {
      path: "/api/v1/tgm/perp-positions",
      name: "Tgm Perp Positions",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 3,
    },
    {
      path: "/api/v1/chains/chain-rank",
      name: "Chains Chain Rank",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 2,
    },
    {
      path: "/api/v1/prediction-market/position-detail",
      name: "Prediction Market Position Detail",
      networks: ["BSC", "Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 2,
    },
    {
      path: "/api/v1/profiler/perp-trades",
      name: "Profiler Perp Trades",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 2,
    },
    {
      path: "/api/v1/tgm/transfers",
      name: "Tgm Transfers",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 2,
    },
    {
      path: "/api/v1/prediction-market/trades-by-address",
      name: "Prediction Market Trades By Address",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: true,
      onPayai: true,
      l30Calls: 1,
      qualityScore: 82,
    },
    {
      path: "/api/v1/prediction-market/top-holders",
      name: "Prediction Market Top Holders",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 1,
    },
    {
      path: "/api/v1/profiler/address/historical-balances",
      name: "Address Historical Balances",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 1,
    },
    {
      path: "/api/v1/smart-money/historical-holdings",
      name: "Smart Money Historical Holdings",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: true,
      l30Calls: 1,
    },
    {
      path: "/api/v1/tgm/perp-trades",
      name: "Tgm Perp Trades",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/v1/tgm/position-intelligence",
      name: "Tgm Position Intelligence",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/v1/transaction-with-token-transfer-lookup",
      name: "Transaction With Token Transfer Lookup",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/v1beta1/tgm/historical-dex-trades",
      name: "Tgm Historical Dex Trades",
      networks: ["Base", "Solana", "X Layer"],
      priceUsd: 0.05,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/v1/search/general",
      name: "Search General",
      networks: ["Solana"],
      priceUsd: 0.01,
      onCdp: false,
      onDexter: false,
      onPayai: true,
    },
    {
      path: "/api/v1/smart-money/dcas",
      name: "Smart Money Dcas",
      networks: ["Solana"],
      priceUsd: 0.05,
      onCdp: false,
      onDexter: false,
      onPayai: true,
    },
    {
      path: "/api/v1/tgm/jup-dca",
      name: "Tgm Jup Dca",
      networks: ["Solana"],
      priceUsd: 0.01,
      onCdp: false,
      onDexter: false,
      onPayai: true,
    },
  ],
};

const COINGECKO_DISCOVERY: AeoDiscovery = {
  snapshotDate: "2026-06-22",
  description:
    "How CoinGecko's on-chain DEX price & pool endpoints are discoverable to AI agents across x402 facilitator registries.",
  coverage: { registered: 2, total: 3 },
  totalEndpoints: 11,
  l30Calls: 117,
  verificationPassRate: 0.75,
  checklist: [
    {
      label: "Description published",
      ok: true,
      hint: "All CDP (29) and Dexter (8) listings include descriptions.",
    },
    {
      label: "Input/output schema",
      ok: true,
      hint: "All 29 CDP (Bazaar) listings expose a JSON schema agents can introspect.",
    },
    {
      label: "Verification passing",
      ok: false,
      hint: "6 / 8 Dexter listings pass verification — 2 endpoints currently fail.",
    },
    {
      label: "Freshness (updated ≤ 30d)",
      ok: true,
      hint: "Listings last refreshed 2026-06-22.",
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
      endpoints: 29,
      networks: ["Base", "Solana"],
      schemes: ["exact"],
      priceUsd: { min: 0.01, max: 0.01 },
      l30Calls: 117,
      uniquePayers: 62,
      hasSchema: true,
      lastUpdated: "2026-06-22",
    },
    {
      facilitator: "Dexter",
      registered: true,
      endpoints: 8,
      networks: ["Base", "Solana"],
      schemes: ["exact"],
      priceUsd: { min: 0.01, max: 0.01 },
      verificationPass: 6,
      verificationTotal: 8,
      avgQualityScore: 77.1,
      lastUpdated: "2026-06-22",
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
  endpointsNote:
    "Token-price endpoints are grouped by network — CoinGecko registers one listing per token-address batch, so the raw CDP/Dexter counts above are higher than the logical endpoints shown here.",
  endpoints: [
    {
      path: "/api/v3/x402/onchain/search/pools",
      name: "Search onchain DEX pools",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 54,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/base/token_price/:tokens",
      name: "Token price — base",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 51,
      qualityScore: 94,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/solana/token_price/:tokens",
      name: "Token price — solana",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: true,
      onPayai: false,
      l30Calls: 2,
      qualityScore: 93,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/eth/token_price/:tokens",
      name: "Token price — eth",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 2,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/tron/token_price/:tokens",
      name: "Token price — tron",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 2,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/arbitrum/token_price/:tokens",
      name: "Token price — arbitrum",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/avax/token_price/:tokens",
      name: "Token price — avax",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/hyperevm/token_price/:tokens",
      name: "Token price — hyperevm",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/megaeth/token_price/:tokens",
      name: "Token price — megaeth",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/monad/token_price/:tokens",
      name: "Token price — monad",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
    {
      path: "/api/v3/x402/onchain/simple/networks/polygon_pos/token_price/:tokens",
      name: "Token price — polygon_pos",
      networks: ["Base", "Solana"],
      priceUsd: 0.01,
      onCdp: true,
      onDexter: false,
      onPayai: false,
      l30Calls: 1,
    },
  ],
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

// Keyed by brandKey/serviceId and serviceUrl host. Catalog providers often have
// a null serviceUrl, so serviceId/title is the reliable match signal.
const DISCOVERY_BY_KEY: Record<string, AeoDiscovery> = {
  stableenrich: STABLEENRICH_DISCOVERY,
  "stableenrich.dev": STABLEENRICH_DISCOVERY,
  nansen: NANSEN_DISCOVERY,
  "api.nansen.ai": NANSEN_DISCOVERY,
  coingecko: COINGECKO_DISCOVERY,
  "pro-api.coingecko.com": COINGECKO_DISCOVERY,
};

const aeoMatchKeys = (spec: GeoSpec): string[] => {
  const keys: string[] = [];
  if (spec.serviceId) keys.push(spec.serviceId.toLowerCase());
  const host = hostOf(spec.serviceUrl);
  if (host) keys.push(host);
  if (spec.title) keys.push(spec.title.toLowerCase());
  return keys;
};

/** Returns embedded x402 discovery aggregates for a known provider, else null. */
export const getAeoDiscovery = (spec: GeoSpec | null): AeoDiscovery | null => {
  if (!spec) return null;
  for (const key of aeoMatchKeys(spec)) {
    const match = DISCOVERY_BY_KEY[key];
    if (match) return match;
  }
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
