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
  "/analytics/routes/sankey",
]);

// Authorized POST endpoint that triggers a live x402 discovery refresh.
export const AEO_X402_REFRESH_PATH = "/aeo/x402/refresh";

export type CustomerRouteKind =
  | "profile"
  | "intelligence"
  | "upsellMetrics"
  | "upsellExplanation"
  | "workflowIntent";

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
    if (match?.[1]) return { kind, address: match[1] };
  }
  return null;
};
