import type { StoredProvider } from "@/lib/types";

// Display priority groups (lower rank = shown first):
//   0: Stable Enrich      (pinned to the very top)
//   1: QuickNode          (current x402 data focus)
//   2: Nansen             (string match in identity)
//   3: CoinGecko          (string match in identity)
//   4: everything else    (sorted by observed usage)
const PINNED_PROVIDER_MARKS = ["stableenrich", "quicknode", "nansen", "coingecko"] as const;
const DEFAULT_RANK = PINNED_PROVIDER_MARKS.length;

function pinnedProviderRank(provider: StoredProvider): number {
  const identity = `${provider.providerId} ${provider.serviceId ?? ""} ${provider.name} ${
    provider.serviceName ?? ""
  }`.toLowerCase();
  for (let i = 0; i < PINNED_PROVIDER_MARKS.length; i++) {
    if (identity.includes(PINNED_PROVIDER_MARKS[i]!)) return i;
  }
  return DEFAULT_RANK;
}

function usageRank(provider: StoredProvider): number {
  return provider.transactionCount ?? 0;
}

export function orderProvidersPinnedFirst<T extends StoredProvider>(providers: T[]): T[] {
  return providers
    .map((provider, originalIndex) => ({ provider, originalIndex }))
    .sort((left, right) => {
      const leftRank = pinnedProviderRank(left.provider);
      const rightRank = pinnedProviderRank(right.provider);
      if (leftRank !== rightRank) return leftRank - rightRank;
      if (leftRank === DEFAULT_RANK) {
        const usageDiff = usageRank(right.provider) - usageRank(left.provider);
        if (usageDiff !== 0) return usageDiff;
      }
      return left.originalIndex - right.originalIndex;
    })
    .map((entry) => entry.provider);
}
