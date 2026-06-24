"use client";

import { useState } from "react";
import {
  BUBBLE_MATRIX_HEIGHT,
  BUBBLE_MATRIX_PLOT,
  BUBBLE_MATRIX_WIDTH,
  LABEL_HEIGHT,
  LABEL_TOP_OFFSET,
  computeBubbleLayout,
} from "@/lib/api-growth/bubble-layout";
import type { SourceMediumQualityRow } from "@/lib/api-growth/metrics";
import { sourceDisplayLabel } from "@/lib/api-growth/sources";

// One distinct hue per source so a label, its leader line, and its bubble all
// read as the same color — the primary cue for label↔bubble correspondence.
const SOURCE_PALETTE = ["#2f5d9a", "#2c7a7b", "#b45309", "#6d28d9", "#be185d", "#0f766e"];

const chipStyle = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--surface-card)",
  padding: "6px 9px",
  color: "var(--text-2)",
  fontSize: 12,
  fontWeight: 600,
} as const;

export function BubbleMatrix({ rows }: { rows: SourceMediumQualityRow[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const plot = BUBBLE_MATRIX_PLOT;
  const splitX = (plot.left + plot.right) / 2;
  const splitY = (plot.top + plot.bottom) / 2;
  const { bubbles, labels } = computeBubbleLayout(
    rows.map((row) => ({
      source: row.source,
      label: sourceDisplayLabel(row.source),
      volumeShare: row.volumeShare,
      repeatQuality: row.repeatQuality,
      endpointFrequency: row.endpointFrequency,
    })),
    { width: BUBBLE_MATRIX_WIDTH, plot },
  );

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 6,
        padding: 12,
        background: "var(--surface-card)",
        marginBottom: 14,
      }}
    >
      <svg
        viewBox={`0 0 ${BUBBLE_MATRIX_WIDTH} ${BUBBLE_MATRIX_HEIGHT}`}
        role="img"
        aria-label="Source medium quality bubble matrix"
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <rect
          x={plot.left}
          y={plot.top}
          width={plot.right - plot.left}
          height={plot.bottom - plot.top}
          fill="var(--surface-subtle)"
        />
        <line x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom} stroke="var(--line-strong)" />
        <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom} stroke="var(--line-strong)" />
        <line x1={splitX} y1={plot.top} x2={splitX} y2={plot.bottom} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <line x1={plot.left} y1={splitY} x2={plot.right} y2={splitY} stroke="var(--line-strong)" strokeDasharray="4 4" />
        <text x={plot.left + 10} y={plot.top + 16} fill="var(--text-3)" fontSize="12" fontWeight="700">
          Niche adoption
        </text>
        <text x={splitX + 56} y={plot.top + 16} fill="var(--mesh-blue)" fontSize="12" fontWeight="700">
          Scale / double down
        </text>
        <text x={plot.left + 10} y={plot.bottom - 10} fill="var(--text-mute)" fontSize="12">
          Low priority
        </text>
        <text x={splitX + 40} y={plot.bottom - 10} fill="var(--text-3)" fontSize="12" fontWeight="700">
          Improve retention
        </text>

        {bubbles.map((bubble) => {
          const label = labels[bubble.index];
          const color = SOURCE_PALETTE[bubble.index % SOURCE_PALETTE.length];
          const active = hovered === bubble.index;
          const dimmed = hovered !== null && !active;
          return (
            <g
              key={bubble.source}
              opacity={dimmed ? 0.24 : 1}
              style={{ transition: "opacity 140ms ease", cursor: "pointer" }}
              onMouseEnter={() => setHovered(bubble.index)}
              onMouseLeave={() => setHovered(null)}
            >
              <circle
                cx={bubble.x}
                cy={bubble.y}
                r={bubble.r}
                fill={color}
                fillOpacity={active ? 0.95 : 0.82}
                stroke="var(--surface-card)"
                strokeWidth="2"
              />
              <rect
                x={label.x - label.width / 2}
                y={label.y - LABEL_TOP_OFFSET}
                width={label.width}
                height={LABEL_HEIGHT}
                rx="4"
                fill={active ? color : "var(--surface-card)"}
                stroke={color}
                strokeOpacity={active ? 1 : 0.55}
                strokeWidth={active ? 1.5 : 1}
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                fill={active ? "#ffffff" : color}
                fontSize="12"
                fontWeight="700"
              >
                {label.label}
              </text>
            </g>
          );
        })}

        <text x={splitX} y={BUBBLE_MATRIX_HEIGHT - 8} textAnchor="middle" fill="var(--text-3)" fontSize="12">
          Acquisition volume, normalized to largest source
        </text>
        <text
          x="10"
          y={splitY}
          transform={`rotate(-90 10 ${splitY})`}
          textAnchor="middle"
          fill="var(--text-3)"
          fontSize="12"
        >
          Repeat adoption
        </text>
      </svg>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={chipStyle}>bubble size: paid endpoint frequency</span>
        <span style={chipStyle}>color: acquisition source</span>
        <span style={{ ...chipStyle, color: "var(--text-mute)" }}>hover a label or bubble to focus</span>
      </div>
    </div>
  );
}
