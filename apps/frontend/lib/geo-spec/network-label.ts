// Frontend network label resolution for the AEO discovery tables.
//
// Facilitator discovery data carries a mix of human names ("base", "solana")
// and raw CAIP-2 chain ids ("eip155:8453", "solana:5eykt4..."). The BFF only
// maps a handful, so unmapped ids leak into the UI as raw strings. This module
// resolves any network value to a human label on the frontend and de-duplicates
// the result (e.g. several unknown chains collapse into a single "Other").

const UNKNOWN_LABEL = "Other";

// Known CAIP-2 ids and name slugs → display label. Keyed lowercase.
const NETWORK_LABELS: Record<string, string> = {
  // EVM mainnets
  "eip155:1": "Ethereum",
  "eip155:8453": "Base",
  "eip155:137": "Polygon",
  "eip155:42161": "Arbitrum",
  "eip155:10": "Optimism",
  "eip155:56": "BNB Chain",
  "eip155:43114": "Avalanche",
  "eip155:480": "World Chain",
  "eip155:196": "X Layer",
  "eip155:999": "HyperEVM",
  "eip155:146": "Sonic",
  "eip155:1329": "Sei",
  "eip155:130": "Unichain",
  // EVM testnets
  "eip155:84532": "Base Sepolia",
  "eip155:80002": "Polygon Amoy",
  // Name slugs (already-human values stay idempotent)
  ethereum: "Ethereum",
  base: "Base",
  "base-sepolia": "Base Sepolia",
  "base sepolia": "Base Sepolia",
  polygon: "Polygon",
  "polygon-amoy": "Polygon Amoy",
  "polygon amoy": "Polygon Amoy",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  "bnb chain": "BNB Chain",
  avalanche: "Avalanche",
  "world chain": "World Chain",
  "x-layer": "X Layer",
  "x layer": "X Layer",
  hyperevm: "HyperEVM",
  sonic: "Sonic",
  sei: "Sei",
  unichain: "Unichain",
  solana: "Solana",
};

// Solana cluster addresses we recognize beyond the bare "solana" slug.
const SOLANA_CLUSTERS: Record<string, string> = {
  "solana:5eykt4usfv8p8njdtrepy1vzqkqzkvdp": "Solana",
  "solana:etwtrabzayq6imfeykouru166vu2xqa1": "Solana Devnet",
};

/** Resolve a single network value (CAIP-2 id or name) to a human label. */
export function networkLabel(network: string): string {
  const value = network.trim();
  if (!value) return UNKNOWN_LABEL;
  const key = value.toLowerCase();
  const direct = NETWORK_LABELS[key];
  if (direct) return direct;
  const solana = SOLANA_CLUSTERS[key];
  if (solana) return solana;
  if (key.startsWith("solana:")) return "Solana";
  // Unmapped chain ids should never surface as raw "eip155:NNN" to the user.
  if (key.startsWith("eip155:")) return UNKNOWN_LABEL;
  return value;
}

/** Map a network list to labels, de-duplicating while preserving order. */
export function networkLabels(networks: string[]): string[] {
  const out: string[] = [];
  for (const network of networks) {
    const label = networkLabel(network);
    if (!out.includes(label)) out.push(label);
  }
  return out;
}
