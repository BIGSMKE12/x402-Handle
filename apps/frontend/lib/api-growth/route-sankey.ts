import type { MacroEndpointCategory, MacroMetricsDemoData } from "@/lib/macro-metrics/demo";
import type { X402SankeyChartModel, X402SankeyFlowRow } from "@/lib/x402-analysis/transform";
import { builderCodeFor, sourceDisplayLabel } from "./sources";

const CATEGORY_LABELS: Record<MacroEndpointCategory, string> = {
  pool_search: "Pool search",
  trending_pools: "Trending pools",
  simple_price: "Simple price",
  token_price: "Token price",
  token_detail: "Token detail",
};

/** Mock endpoint paths used only for the hover detail line. */
const ENDPOINT_PATHS: Record<MacroEndpointCategory, string> = {
  pool_search: "/pools/search",
  trending_pools: "/pools/trending",
  simple_price: "/price/simple",
  token_price: "/price/token",
  token_detail: "/tokens/detail",
};

const PAYMENT_ROUTES = [
  "Base x402",
  "Solana x402",
  "Solana MPP",
  "Stripe MPP",
  "Tempo MPP",
] as const;

type PaymentRoute = (typeof PAYMENT_ROUTES)[number];

const ROUTE_QUALITY: Record<
  PaymentRoute,
  { success_rate: number; p95_latency_ms: number; network: string }
> = {
  "Base x402": { success_rate: 0.992, p95_latency_ms: 540, network: "base" },
  "Solana x402": { success_rate: 0.987, p95_latency_ms: 380, network: "solana" },
  "Solana MPP": { success_rate: 0.978, p95_latency_ms: 460, network: "solana" },
  "Stripe MPP": { success_rate: 0.983, p95_latency_ms: 720, network: "stripe" },
  "Tempo MPP": { success_rate: 0.974, p95_latency_ms: 610, network: "tempo" },
};

/**
 * Curated `Source → Payment route → End point` flows for the API-Growth demo.
 *
 * Deliberately sparse and skewed (mock, non-PII): each source fans out to only a
 * couple of endpoints through the rails it is mapped to, so the Sankey reads as a
 * few dominant paths rather than a dense everything-to-everything mesh. A handful
 * of hero paths carry most of the volume — agent traffic (AgentCash → Solana x402
 * → Token price), deep app usage (App A → Base x402 → Token detail), and one-off
 * price lookups (Direct → Base x402 → Simple price) — while minor rails and
 * endpoints (Trending pools) keep thin-but-present links.
 *
 * Constraints baked into the data:
 *  - Pay.sh settles only over x402 rails (Base / Solana x402), never an MPP rail.
 *  - Source totals and endpoint totals are intentionally uneven, so the left and
 *    right halves of the chart do not mirror each other in flow size.
 *  - Every box still has at least one in and one out edge.
 */
type CuratedRouteFlow = {
  source: string;
  route: PaymentRoute;
  endpoint: MacroEndpointCategory;
  flowCount: number;
  settledUsdc: number;
};

const CURATED_ROUTE_FLOWS: readonly CuratedRouteFlow[] = [
  // AgentCash — large agent channel; Solana x402 is the hero rail.
  {
    source: "AgentCash",
    route: "Solana x402",
    endpoint: "token_price",
    flowCount: 96,
    settledUsdc: 63,
  },
  {
    source: "AgentCash",
    route: "Solana x402",
    endpoint: "token_detail",
    flowCount: 64,
    settledUsdc: 44,
  },
  {
    source: "AgentCash",
    route: "Solana MPP",
    endpoint: "pool_search",
    flowCount: 28,
    settledUsdc: 18,
  },

  // App A — deep, high-retention usage on Base x402.
  { source: "App A", route: "Base x402", endpoint: "token_detail", flowCount: 81, settledUsdc: 66 },

  // Direct — price-heavy, one-off lookups on Base x402.
  {
    source: "Direct",
    route: "Base x402",
    endpoint: "simple_price",
    flowCount: 88,
    settledUsdc: 27,
  },

  // App B — Base x402 for pools, and the only source settling over Stripe MPP.
  { source: "App B", route: "Base x402", endpoint: "pool_search", flowCount: 53, settledUsdc: 29 },
  { source: "App B", route: "Stripe MPP", endpoint: "simple_price", flowCount: 17, settledUsdc: 6 },

  // App C — Tempo MPP for price, a Solana MPP tail into detail.
  { source: "App C", route: "Tempo MPP", endpoint: "token_price", flowCount: 23, settledUsdc: 12 },
  {
    source: "App C",
    route: "Solana MPP",
    endpoint: "token_detail",
    flowCount: 39,
    settledUsdc: 26,
  },

  // Pay.sh — x402 only (never an MPP rail); small, price + trending lookups.
  { source: "Pay.sh", route: "Base x402", endpoint: "simple_price", flowCount: 14, settledUsdc: 5 },
  {
    source: "Pay.sh",
    route: "Solana x402",
    endpoint: "trending_pools",
    flowCount: 11,
    settledUsdc: 6,
  },
];

function sourceDetail(source: string): string {
  const builderCode = builderCodeFor(source);
  if (builderCode) {
    return `x402 Builder Code · ${builderCode.code}`;
  }
  return `Source route · ${source}`;
}

function endpointDetail(category: MacroEndpointCategory): string {
  return `${CATEGORY_LABELS[category]} · ${ENDPOINT_PATHS[category]}`;
}

function curatedFlowToRow(flow: CuratedRouteFlow): X402SankeyFlowRow {
  const quality = ROUTE_QUALITY[flow.route];
  return {
    left_label: sourceDisplayLabel(flow.source),
    middle_label: flow.route,
    right_label: CATEGORY_LABELS[flow.endpoint],
    left_detail: sourceDetail(flow.source),
    middle_detail: `${flow.route} · mock payment rail`,
    right_detail: endpointDetail(flow.endpoint),
    flow_count: flow.flowCount,
    paid_count: flow.flowCount,
    settled_usdc: flow.settledUsdc,
    success_rate: quality.success_rate,
    p95_latency_ms: quality.p95_latency_ms,
    error_rate: Number((1 - quality.success_rate).toFixed(3)),
    network: quality.network,
  } satisfies X402SankeyFlowRow;
}

/**
 * API-Growth-specific Sankey: `Source route → Payment route → End point`.
 *
 * Distinct from `buildMacroRouteSankeyChart` (which the Macro Metrics page depends
 * on); this one swaps the left column to the Builder-Code source and the middle
 * column to a mock payment rail. Built from a curated flow set (above) so the
 * picture is connected and stable; only emptiness of the offline data is honored.
 */
export function buildApiGrowthRouteSankeyChart(data: MacroMetricsDemoData): X402SankeyChartModel {
  const flows =
    data.wallets.length === 0
      ? []
      : [...CURATED_ROUTE_FLOWS].map(curatedFlowToRow).sort((left, right) => {
          if (right.flow_count !== left.flow_count) return right.flow_count - left.flow_count;
          return right.settled_usdc - left.settled_usdc;
        });

  return {
    id: "macro_route_quality",
    eyebrow: "x402 Builder Code attribution",
    title: "Source route → Payment route → End point",
    description:
      "How each source — with its on-chain x402 Builder Code — routes through a payment rail to the paid endpoint. Mock, non-PII demo data.",
    layer_labels: {
      left: "Source route",
      mid: "Payment route",
      right: "End point",
    },
    layer_order: {
      left: [
        sourceDisplayLabel("AgentCash"),
        sourceDisplayLabel("Direct"),
        sourceDisplayLabel("App A"),
        sourceDisplayLabel("App B"),
        sourceDisplayLabel("App C"),
        sourceDisplayLabel("Pay.sh"),
      ],
      mid: ["Base x402", "Solana x402", "Solana MPP", "Tempo MPP", "Stripe MPP"],
      right: [
        CATEGORY_LABELS.token_detail,
        CATEGORY_LABELS.token_price,
        CATEGORY_LABELS.simple_price,
        CATEGORY_LABELS.pool_search,
        CATEGORY_LABELS.trending_pools,
      ],
    },
    flows,
  };
}

export { PAYMENT_ROUTES };
