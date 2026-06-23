import { describe, expect, test } from "bun:test";
import { MACRO_METRICS_DEMO_DATA } from "@/lib/macro-metrics/demo";
import {
  BUBBLE_MATRIX_PLOT,
  BUBBLE_MATRIX_WIDTH,
  LABEL_HEIGHT,
  LABEL_TOP_OFFSET,
  type BubbleDatum,
  bubbleLabelWidth,
  computeBubbleLayout,
} from "./bubble-layout";
import { buildApiGrowthIntelligence } from "./metrics";
import { sourceDisplayLabel } from "./sources";

function demoBubbleData(): BubbleDatum[] {
  const intelligence = buildApiGrowthIntelligence(MACRO_METRICS_DEMO_DATA);
  return intelligence.sourceMediumQuality.rows.map((row) => ({
    source: row.source,
    label: sourceDisplayLabel(row.source),
    volumeShare: row.volumeShare,
    repeatQuality: row.repeatQuality,
    endpointFrequency: row.endpointFrequency,
  }));
}

const OPTIONS = { width: BUBBLE_MATRIX_WIDTH, plot: BUBBLE_MATRIX_PLOT };

function labelRect(label: { x: number; y: number; width: number }) {
  return {
    left: label.x - label.width / 2,
    right: label.x + label.width / 2,
    top: label.y - LABEL_TOP_OFFSET,
    bottom: label.y - LABEL_TOP_OFFSET + LABEL_HEIGHT,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

describe("computeBubbleLayout", () => {
  test("keeps every bubble inside the plot area", () => {
    const { bubbles } = computeBubbleLayout(demoBubbleData(), OPTIONS);
    expect(bubbles.length).toBeGreaterThan(0);
    for (const bubble of bubbles) {
      expect(bubble.x - bubble.r).toBeGreaterThanOrEqual(BUBBLE_MATRIX_PLOT.left - 0.5);
      expect(bubble.x + bubble.r).toBeLessThanOrEqual(BUBBLE_MATRIX_PLOT.right + 0.5);
      expect(bubble.y - bubble.r).toBeGreaterThanOrEqual(BUBBLE_MATRIX_PLOT.top - 0.5);
      expect(bubble.y + bubble.r).toBeLessThanOrEqual(BUBBLE_MATRIX_PLOT.bottom + 0.5);
    }
  });

  test("separates overlapping bubbles", () => {
    const { bubbles } = computeBubbleLayout(demoBubbleData(), OPTIONS);
    for (let i = 0; i < bubbles.length; i += 1) {
      for (let j = i + 1; j < bubbles.length; j += 1) {
        const distance = Math.hypot(bubbles[i].x - bubbles[j].x, bubbles[i].y - bubbles[j].y);
        // Bubbles must not visibly overlap (small float tolerance only).
        expect(distance).toBeGreaterThanOrEqual(bubbles[i].r + bubbles[j].r - 0.5);
      }
    }
  });

  test("keeps each label pill clear of other sources' bubbles", () => {
    const { bubbles, labels } = computeBubbleLayout(demoBubbleData(), OPTIONS);
    expect(labels.length).toBe(bubbles.length);
    for (const label of labels) {
      const rect = labelRect(label);
      for (const bubble of bubbles) {
        if (bubble.index === label.index) continue;
        const closestX = clamp(bubble.x, rect.left, rect.right);
        const closestY = clamp(bubble.y, rect.top, rect.bottom);
        const distance = Math.hypot(bubble.x - closestX, bubble.y - closestY);
        expect(distance).toBeGreaterThanOrEqual(bubble.r - 0.5);
      }
    }
  });

  test("keeps label pills within the canvas width", () => {
    const { labels } = computeBubbleLayout(demoBubbleData(), OPTIONS);
    for (const label of labels) {
      expect(label.x - label.width / 2).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width / 2).toBeLessThanOrEqual(BUBBLE_MATRIX_WIDTH);
      expect(label.width).toBe(bubbleLabelWidth(label.label));
    }
  });
});
