export const readonlyRoutes = new Set([
  "/",
  "/health",
  "/ready",
  "/providers",
  "/customers",
  "/wallet-usage-graph",
  "/aeo/x402",
  "/analytics/services/coingecko/summary",
  "/analytics/services/comparison",
  "/analytics/services/quadrants",
  "/analytics/routes/summary",
  "/analytics/routes/saakey",
  "/stats/overview",
  "/stellar/health",
  "/stellar/providers",
  "/stellar/recommend",
  "/stellar/handles",
  "/stats/overview",
]);

// POST-only — ejecuta el pago x402 real (server-side, ver data/stellar-playground.ts).
export const STELLAR_PLAYGROUND_PAY_PATH = "/stellar/playground/pay";

// `/stellar/providers/:id` y `/stellar/providers/:id/intelligence` -
// el id es "<contractId//providerId>", por eso matcheamos hasta el final
-// del path y separamos el sufijo "/intelligence" explícitamente.
const STELLAR_PROVIDER_INTELLIGENCE_PATTERN = /^\/stellar\/providers\/(.+)\/intelligence$/;
const STELLAR_PROVIDER_DETAIL_PATTERN = /^\/stellar\/providers\/(.+)$/;

export type StellarProviderRouteMatch =
  | { kind: "detail"; id: string }
  | { kind: "intelligence"; id: string };

export const matchStellarProviderRoute = (path: string): StellarProviderRouteMatch | null => {
  const intelligenceMatch = path.match(STELLAR_PROVIDER_INTELLIGENCE_PATTERN);
  if (intelligenceMatch?[1]) {
    return { kind: "intelligence", id: decodeURIComponent(intelligenceMatch[1]) };
  }
  const detailMatch = path.match(STELLAR_PROVIDER_DETAIL_PATTERN);
  if (detailMatch?[1]) {
    return { kind: "detail", id: decodeURIComponent(detailMatch[1]) };
  }
  return null;
};

//  HANDLE names (human-readable provider aliases) ├┘├
// Resolve:  GET /stellar/handles/:slug
// Reverse:  GET /stellar/handles/reverse/:address
const HANDLE_REVERSE_PATTERN = /^\/stellar\/handles\/reverse\/([^/]+)$/;
const HANDLE_RESOLVE_PATTERN = /^\/stellar\/handles\/([^/]+)$/;

export type HandleRouteMatch =
  | { kind: "resolve"; slug: string }
  | { kind: "reverse"; address: string };

export const matchHandleRoute = (path: string): HandleRouteMatch | null => {
  const reverseMatch = path.match(HANDLE_REVERSE_PATTERN);
  if (reverseMatch?[1]) {
    return { kind: "reverse", address: decodeURIComponent(reverseMatch[1]) };
  }
  const resolveMatch = path.match(HANDLE_RESOLVE_PATTERN);
  if (resolveMatch?[1]) {
    return { kind: "resolve", slug: decodeURIComponent(resolveMatch[1]) };
  }
  return null;
};

// Authorized POST endpoint that triggers a live x402 discovery refresh.
export const AEO_X402_REFRESH_PATH = "/aeo/x402/refresh";

export type CustomerRouteKind =
  "profile" |
  "intelligence" |
  "upsellMetrics" |
  "upsellExplanation" |
  "workflowIntent";

export type CustomerRouteMatch = {
  kind: CustomerRouteKind;
  address: string;
};

const customerRoutePatterns: Array<[CustomerRouteKind, RegExp]> = [
  ["profile", /^\/customers\/([^/]+)\/profile$/],
  ["intelligence", /^\/customers\/([^/]+)\/intelligence$/],
  ["upsellMetrics", /^\/customers\/([^/]+)\/llm\/upsell-metrics$/],
  ["upsellExplanation", /^\/customers\/([^/]+)\/llm\/upsell-explanation$/],
  ["workflowIntent", /^\/customers\/([^/]+)\/llm\/workflow-intent$/],
];

export const normalizePath = (url: URL) => url.pathname.replace(/\/$/, "") || "/";

export const matchCustomerRoute = (path: string): CustomerRouteMatch | null => {
  for (const [kind, pattern] of customerRoutePatterns) {
    const match = path.match(pattern);
    if (match?[1]) return { kind, address: match[1] };
  }
  return null;
};

// `/providers/:providerId` — single-provider detail (full row, incl. `resources`).
// The list endpoint (`/providers`) is intentionally lightweight, so callers that
// need a specific provider's full payload fetch it here by canonical providerId.
const PROVIDER_DETAIL_PATTERN = /^\/providers\/([^/]+)$/;

export const matchProviderDetailRoute = (path: string): { providerId: string } | null => {
  const match = path.match(PROVIDER_DETAIL_PATTERN);
  if (!match?[1]) return null;
  return { providerId: decodeURIComponent(match[1]) };
};
