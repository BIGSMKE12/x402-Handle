import { z } from "zod";

// AEO (Agentic Engine Optimization) x402 discovery contract.
//
// This is the aggregated, render-ready shape the BFF serves for a single
// service and the frontend's x402 Discovery section renders. It is derived
// purely from facilitator discovery JSON (CDP / Dexter / PayAI); it carries no
// usage/demand metrics (those are not present in discovery data).

// Human-facing network labels for the discovery UI. The aggregator stores these
// display labels (matching the legacy hand-curated fixtures) instead of raw
// CAIP-2 ids so the frontend can render them directly.
const NETWORK_DISPLAY_LABELS: Record<string, string> = {
  "eip155:8453": "Base",
  base: "Base",
  "eip155:137": "Polygon",
  polygon: "Polygon",
  "eip155:1": "Ethereum",
  ethereum: "Ethereum",
};

export const networkDisplayLabel = (network: string): string => {
  const value = network.trim();
  const direct = NETWORK_DISPLAY_LABELS[value] ?? NETWORK_DISPLAY_LABELS[value.toLowerCase()];
  if (direct) return direct;
  if (value.toLowerCase().startsWith("solana:")) return "Solana";
  return value;
};

// Per-facilitator registry footprint for one service.
export const FacilitatorDiscoveryRowSchema = z
  .object({
    facilitator: z.string().min(1),
    registered: z.boolean(),
    endpoints: z.number().int().nonnegative(),
    networks: z.array(z.string()),
    schemes: z.array(z.string()),
    priceUsd: z.object({ min: z.number(), max: z.number() }).nullable(),
    // Dexter-style quality signals.
    verificationPass: z.number().int().nonnegative().optional(),
    verificationTotal: z.number().int().nonnegative().optional(),
    avgQualityScore: z.number().optional(),
    // Bazaar / input schema presence (CDP).
    hasSchema: z.boolean().optional(),
    lastUpdated: z.string().optional(),
  })
  .strict();

export type FacilitatorDiscoveryRow = z.infer<typeof FacilitatorDiscoveryRowSchema>;

export const AeoChecklistItemSchema = z
  .object({
    label: z.string().min(1),
    ok: z.boolean(),
    hint: z.string(),
  })
  .strict();

export type AeoChecklistItem = z.infer<typeof AeoChecklistItemSchema>;

// Per-endpoint coverage across facilitator registries.
export const AeoDiscoveryEndpointSchema = z
  .object({
    path: z.string().min(1),
    name: z.string(),
    networks: z.array(z.string()),
    priceUsd: z.number(),
    onCdp: z.boolean(),
    onDexter: z.boolean(),
    onPayai: z.boolean(),
    qualityScore: z.number().optional(), // Dexter quality
    // CDP-only rolling 30-day usage signals.
    cdpL30DaysTotalCalls: z.number().int().nonnegative().optional(),
    cdpL30DaysUniquePayers: z.number().int().nonnegative().optional(),
  })
  .strict();

export type AeoDiscoveryEndpoint = z.infer<typeof AeoDiscoveryEndpointSchema>;

export const AeoDiscoverySchema = z
  .object({
    snapshotDate: z.string(),
    description: z.string(),
    coverage: z
      .object({
        registered: z.number().int().nonnegative(),
        total: z.number().int().nonnegative(),
      })
      .strict(),
    totalEndpoints: z.number().int().nonnegative(),
    verificationPassRate: z.number().min(0).max(1),
    checklist: z.array(AeoChecklistItemSchema),
    facilitators: z.array(FacilitatorDiscoveryRowSchema),
    endpoints: z.array(AeoDiscoveryEndpointSchema),
    /** Optional note shown under the per-endpoint table (e.g. grouping caveats). */
    endpointsNote: z.string().optional(),
  })
  .strict();

export type AeoDiscovery = z.infer<typeof AeoDiscoverySchema>;
