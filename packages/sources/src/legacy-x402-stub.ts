// Stub for the legacy multi-chain (EVM/Solana) x402 discovery + catalog-merge
// helpers. Flovia is 100% Stellar for the hackathon, so these are intentionally
// no-ops kept only so `apps/bff`'s pre-existing /aeo/x402 routes still compile
// and boot; they do not participate in the Stellar registry data path.
import type { AeoDiscovery } from "contracts";

export const X402_FACILITATORS = ["cdp", "dexter", "payai"] as const;
export type X402Facilitator = (typeof X402_FACILITATORS)[number];

export type X402DiscoveryItem = Record<string, unknown>;

export type FetchX402DiscoveryOptions = {
  mapItem?: (item: X402DiscoveryItem) => X402DiscoveryItem;
  endpoints?: unknown;
  retries?: number;
  fetchFn?: (input: string | URL | Request) => Promise<Response>;
};

export type AeoAggregateOptions = {
  snapshotDate?: string;
  description?: string;
};

export const slimX402DiscoveryItem = (item: X402DiscoveryItem): X402DiscoveryItem => item;

export const fetchX402Discovery = async (
  _options: FetchX402DiscoveryOptions = {},
): Promise<
  Record<X402Facilitator, X402DiscoveryItem[]> & {
    fetchedAt: string;
    errors: Partial<Record<X402Facilitator, string>>;
  }
> => ({
  cdp: [],
  dexter: [],
  payai: [],
  fetchedAt: new Date().toISOString(),
  errors: {},
});

export const aggregateAeoDiscovery = (
  _items: Record<X402Facilitator, X402DiscoveryItem[]>,
  _serviceHost: string,
  _options: AeoAggregateOptions = {},
): AeoDiscovery | null => null;

export const mergeProviderCatalogs = <T>(primary: T, _overlay: unknown): T => primary;
