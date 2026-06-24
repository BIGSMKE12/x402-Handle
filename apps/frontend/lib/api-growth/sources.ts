import type { MacroWallet } from "@/lib/macro-metrics/demo";

/**
 * x402 Builder Code attribution (mock demo).
 *
 * Builder Codes are registered, non-PII codes (`^[a-z0-9_]{1,32}$`) that credit a party
 * in an x402 payment: `a` app, `s` service/agent, `w` facilitator. For this demo only the
 * three app sources carry codes; everything stays mock and aggregate-only (no PII).
 */
export type BuilderCodeKind = "app" | "service" | "facilitator";

export type BuilderCode = {
  code: string;
  kind: BuilderCodeKind;
};

// Codes follow the registered Builder Code format `^fl_[a-z0-9_]{7}$` (mock values).
export const SOURCE_BUILDER_CODES: Record<string, BuilderCode> = {
  "App A": { code: "fl_k4m8p2x", kind: "app" },
  "App B": { code: "fl_q7r3t9w", kind: "app" },
  "App C": { code: "fl_b5n1v6z", kind: "app" },
};

export function builderCodeFor(source: string): BuilderCode | undefined {
  return SOURCE_BUILDER_CODES[source];
}

/** "App A" -> "App A (bc_a)"; "Pay.sh" -> "Pay.sh". */
export function sourceDisplayLabel(source: string): string {
  const builderCode = builderCodeFor(source);
  return builderCode ? `${source} (${builderCode.code})` : source;
}

/**
 * Maps a wallet to its acquisition source. Builder-Code-tagged app sources (App A/B/C)
 * replace the former Dexter/Sponge/Partner App channels; AgentCash and Pay.sh replace the
 * former AgentKit MCP and Docs channels.
 */
export function sourceMediumFor(wallet: MacroWallet): string {
  if (wallet.intermediary === "Circle Wallets") return "AgentCash";
  if (wallet.intermediary === "Coinbase CDP") return "App A";
  if (wallet.intermediary === "Privy") return "App B";
  if (wallet.intermediary === "Safe") return "App C";
  if (wallet.source === "Cursor") return "Pay.sh";
  return "Direct";
}
