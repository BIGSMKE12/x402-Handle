import { describe, expect, test } from "bun:test";
import { MACRO_METRICS_DEMO_DATA, type MacroMetricsDemoData } from "@/lib/macro-metrics/demo";
import type { X402MetricMode } from "@/lib/x402-analysis/types";
import { buildX402SankeyLayout } from "@/lib/x402-analysis/transform";
import { PAYMENT_ROUTES, buildApiGrowthRouteSankeyChart } from "./route-sankey";
import { sourceDisplayLabel } from "./sources";

// Mirrors X402SankeyChart's MIN_VISIBLE_FLOW_COUNT_EXCLUSIVE: links at or below
// this flow_count are hidden, so a node whose only links are this thin renders
// disconnected (no in/out). The chart must stay connected after this filter.
const MIN_VISIBLE_FLOW_COUNT_EXCLUSIVE = 2;

const ENDPOINT_LABELS = new Set([
  "Pool search",
  "Trending pools",
  "Simple price",
  "Token price",
  "Token detail",
]);

describe("buildApiGrowthRouteSankeyChart", () => {
  test("builds a Source route -> Payment route -> End point chart", () => {
    const chart = buildApiGrowthRouteSankeyChart(MACRO_METRICS_DEMO_DATA);

    expect(chart.title).toBe("Source route → Payment route → End point");
    expect(chart.layer_labels).toEqual({
      left: "Source route",
      mid: "Payment route",
      right: "End point",
    });
    expect(chart.flows.length).toBeGreaterThan(0);
  });

  test("uses Builder-Code sources on the left and payment rails in the middle", () => {
    const chart = buildApiGrowthRouteSankeyChart(MACRO_METRICS_DEMO_DATA);
    const leftLabels = chart.flows.map((flow) => flow.left_label);
    const middleLabels = new Set(chart.flows.map((flow) => flow.middle_label));

    expect(leftLabels).toContain(sourceDisplayLabel("App A"));
    expect(sourceDisplayLabel("App A")).toMatch(/^App A \(fl_[a-z0-9_]{7}\)$/);

    // Builder-code source detail (hover tooltip) shows the code only, no "app code (a)" kind label.
    const appAFlow = chart.flows.find((flow) => /\(fl_/.test(flow.left_label));
    expect(appAFlow?.left_detail).toMatch(/^x402 Builder Code · fl_[a-z0-9_]{7}$/);
    expect(appAFlow?.left_detail).not.toContain("app code");
    expect(leftLabels.some((label) => label === "Pay.sh" || label === "AgentCash")).toBe(true);
    for (const removed of ["Dexter", "Sponge", "Partner App"]) {
      expect(leftLabels.some((label) => label.includes(removed))).toBe(false);
    }

    expect(middleLabels.size).toBeGreaterThan(1);
    for (const route of middleLabels) {
      expect(PAYMENT_ROUTES).toContain(route as (typeof PAYMENT_ROUTES)[number]);
    }
  });

  test("keeps endpoint categories on the right with route quality metrics", () => {
    const chart = buildApiGrowthRouteSankeyChart(MACRO_METRICS_DEMO_DATA);

    for (const flow of chart.flows) {
      expect(ENDPOINT_LABELS.has(flow.right_label)).toBe(true);
    }
    expect(
      chart.flows.some(
        (flow) =>
          flow.flow_count > 0 &&
          flow.settled_usdc > 0 &&
          flow.success_rate > 0 &&
          flow.success_rate < 1 &&
          flow.p95_latency_ms > 100,
      ),
    ).toBe(true);
  });

  test("Pay.sh settles only over x402 rails, never an MPP rail", () => {
    const chart = buildApiGrowthRouteSankeyChart(MACRO_METRICS_DEMO_DATA);
    const payShRails = chart.flows
      .filter((flow) => flow.left_label === sourceDisplayLabel("Pay.sh"))
      .map((flow) => flow.middle_label);

    expect(payShRails.length).toBeGreaterThan(0);
    for (const rail of payShRails) {
      expect(rail).not.toContain("MPP");
    }
  });

  test("every node stays connected after the chart's thin-link filter", () => {
    const chart = buildApiGrowthRouteSankeyChart(MACRO_METRICS_DEMO_DATA);

    for (const metric of ["flow_count", "settled_usdc"] as const satisfies X402MetricMode[]) {
      const { nodes, links } = buildX402SankeyLayout(
        chart.flows,
        metric,
        1220,
        560,
        chart.layer_order,
      );
      const visible = links.filter((link) => link.flow_count > MIN_VISIBLE_FLOW_COUNT_EXCLUSIVE);
      const inDegree = new Map<string, number>();
      const outDegree = new Map<string, number>();
      for (const link of visible) {
        outDegree.set(link.sourceNodeId, (outDegree.get(link.sourceNodeId) ?? 0) + 1);
        inDegree.set(link.targetNodeId, (inDegree.get(link.targetNodeId) ?? 0) + 1);
      }

      // Sanity: the formerly-isolated nodes are present.
      const labels = new Set(nodes.map((node) => node.label));
      for (const label of ["Pay.sh", "Direct", "Stripe MPP", "Trending pools", "Token price"]) {
        expect(labels.has(label)).toBe(true);
      }

      for (const node of nodes) {
        if (node.layer !== "left") expect(inDegree.get(node.id) ?? 0).toBeGreaterThan(0);
        if (node.layer !== "right") expect(outDegree.get(node.id) ?? 0).toBeGreaterThan(0);
      }
    }
  });

  test("returns no flows for empty offline data", () => {
    const empty: MacroMetricsDemoData = {
      generatedAt: MACRO_METRICS_DEMO_DATA.generatedAt,
      primaryProviderId: "northwind-price",
      services: MACRO_METRICS_DEMO_DATA.services,
      wallets: [],
      events: [],
      recommendations: [],
    };

    expect(buildApiGrowthRouteSankeyChart(empty).flows).toEqual([]);
  });
});
