/**
 * Pure geometry for the "Source / Medium Adoption" bubble matrix.
 *
 * Bubble position encodes acquisition volume (x) and repeat adoption (y); bubble
 * radius encodes paid endpoint frequency. Because several sources land close to
 * each other, raw data positions overlap. This module keeps the data-driven
 * placement but then (1) relaxes bubble-vs-bubble overlaps and (2) parks each
 * label in a side gutter so label pills never sit on top of a bubble. Kept free
 * of React so the layout can be unit tested independently of rendering.
 */

export type BubbleDatum = {
  source: string;
  label: string;
  volumeShare: number;
  repeatQuality: number;
  endpointFrequency: number;
};

export type BubblePlot = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type BubbleLayoutOptions = {
  width: number;
  plot: BubblePlot;
};

export type PlacedBubble = {
  source: string;
  label: string;
  index: number;
  x: number;
  y: number;
  r: number;
};

export type PlacedLabel = {
  source: string;
  label: string;
  index: number;
  x: number;
  y: number;
  width: number;
  /** -1 when the label sits left of its bubble, +1 when it sits right. */
  side: -1 | 1;
};

export type BubbleLayout = {
  bubbles: PlacedBubble[];
  labels: PlacedLabel[];
};

export const LABEL_HEIGHT = 16;
export const LABEL_TOP_OFFSET = 11;
const LABEL_GAP = 9;
const LABEL_MIN_GAP = 18;
const BUBBLE_PADDING = 5;
const EDGE_MARGIN = 14;
/** Keep label pills this far clear of any other source's bubble, for legibility. */
const BUBBLE_CLEARANCE = 5;

/** Canvas + plot geometry shared by the renderer and its layout test. */
export const BUBBLE_MATRIX_WIDTH = 520;
export const BUBBLE_MATRIX_HEIGHT = 252;
export const BUBBLE_MATRIX_PLOT: BubblePlot = {
  left: 32,
  top: 16,
  right: 502,
  bottom: 214,
};

export function bubbleRadius(endpointFrequency: number): number {
  return 8 + Math.min(endpointFrequency / 3, 18);
}

export function bubbleLabelWidth(label: string): number {
  // The trailing constant is horizontal padding so text never crowds the pill border.
  return Math.max(46, label.length * 5.8 + 18);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Minimal translation that pushes a label rect clear of a bubble, or null. */
function labelBubblePush(
  label: { x: number; y: number; width: number },
  bubble: PlacedBubble,
  clearance: number,
): { dx: number; dy: number } | null {
  const rectLeft = label.x - label.width / 2;
  const rectRight = label.x + label.width / 2;
  const rectTop = label.y - LABEL_TOP_OFFSET;
  const rectBottom = rectTop + LABEL_HEIGHT;
  const closestX = clamp(bubble.x, rectLeft, rectRight);
  const closestY = clamp(bubble.y, rectTop, rectBottom);
  const dx = bubble.x - closestX;
  const dy = bubble.y - closestY;
  const distSq = dx * dx + dy * dy;
  const reach = bubble.r + clearance;
  if (distSq >= reach * reach) return null;

  const dist = Math.sqrt(distSq) || 0.0001;
  const overlap = reach - dist + 0.5;
  // Push the label away from the bubble center along the shortest axis.
  return { dx: -(dx / dist) * overlap, dy: -(dy / dist) * overlap };
}

function relaxBubbleOverlaps(bubbles: PlacedBubble[], plot: BubblePlot): void {
  for (let iteration = 0; iteration < 80; iteration += 1) {
    for (let i = 0; i < bubbles.length; i += 1) {
      for (let j = i + 1; j < bubbles.length; j += 1) {
        const a = bubbles[i];
        const b = bubbles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const minDist = a.r + b.r + BUBBLE_PADDING;
        if (dist >= minDist) continue;
        const push = (minDist - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
    for (const bubble of bubbles) {
      bubble.x = clamp(bubble.x, plot.left + bubble.r, plot.right - bubble.r);
      bubble.y = clamp(bubble.y, plot.top + bubble.r, plot.bottom - bubble.r);
    }
  }
}

function spreadLabelsVertically(labels: PlacedLabel[], minY: number, maxY: number): void {
  const ordered = [...labels].sort((left, right) => left.y - right.y);
  for (let index = 0; index < ordered.length; index += 1) {
    ordered[index].y = clamp(ordered[index].y, minY, maxY);
  }
  for (let index = 1; index < ordered.length; index += 1) {
    ordered[index].y = Math.max(ordered[index].y, ordered[index - 1].y + LABEL_MIN_GAP);
  }
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const maxAllowed = index === ordered.length - 1 ? maxY : ordered[index + 1].y - LABEL_MIN_GAP;
    ordered[index].y = Math.min(ordered[index].y, maxAllowed);
  }
}

function avoidLabelBubbleOverlap(
  labels: PlacedLabel[],
  bubbles: PlacedBubble[],
  width: number,
  minY: number,
  maxY: number,
): void {
  for (const label of labels) {
    const minX = EDGE_MARGIN + label.width / 2;
    const maxX = width - EDGE_MARGIN - label.width / 2;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      let moved = false;
      for (const bubble of bubbles) {
        if (bubble.index === label.index) continue;
        const push = labelBubblePush(label, bubble, BUBBLE_CLEARANCE);
        if (!push) continue;
        // Prefer pushing outward horizontally; fall back to vertical room.
        if (Math.abs(push.dx) >= Math.abs(push.dy)) {
          label.x = clamp(label.x + push.dx, minX, maxX);
        } else {
          label.y = clamp(label.y + push.dy, minY, maxY);
        }
        moved = true;
      }
      if (!moved) break;
    }
  }
}

export function computeBubbleLayout(
  data: BubbleDatum[],
  options: BubbleLayoutOptions,
): BubbleLayout {
  const { width, plot } = options;
  const center = (plot.left + plot.right) / 2;
  const maxVolumeShare = Math.max(...data.map((row) => row.volumeShare), 0.01);

  const bubbles: PlacedBubble[] = data.map((row, index) => {
    const r = bubbleRadius(row.endpointFrequency);
    const normalizedVolume = row.volumeShare / maxVolumeShare;
    return {
      source: row.source,
      label: row.label,
      index,
      r,
      x: plot.left + r + normalizedVolume * (plot.right - plot.left - r * 2),
      y: plot.bottom - r - row.repeatQuality * (plot.bottom - plot.top - r * 2),
    };
  });

  relaxBubbleOverlaps(bubbles, plot);

  const minLabelY = plot.top + 14;
  const maxLabelY = plot.bottom - 12;
  const labels: PlacedLabel[] = bubbles.map((bubble) => {
    const labelWidth = bubbleLabelWidth(bubble.label);
    const side: -1 | 1 = bubble.x < center ? -1 : 1;
    const x = bubble.x + side * (bubble.r + LABEL_GAP + labelWidth / 2);
    const minX = EDGE_MARGIN + labelWidth / 2;
    const maxX = width - EDGE_MARGIN - labelWidth / 2;
    return {
      source: bubble.source,
      label: bubble.label,
      index: bubble.index,
      x: clamp(x, minX, maxX),
      y: bubble.y,
      width: labelWidth,
      side,
    };
  });

  spreadLabelsVertically(labels, minLabelY, maxLabelY);
  avoidLabelBubbleOverlap(labels, bubbles, width, minLabelY, maxLabelY);

  return { bubbles, labels };
}
