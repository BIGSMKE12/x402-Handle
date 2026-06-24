// x402 facilitator discovery insights for the AEO page.
//
// The aggregates are served by the BFF (`GET /aeo/x402?service=<host>`,
// `getAeoX402Discovery` in lib/api/client) and rendered by the x402 Discovery
// section. This module re-exports the shared AeoDiscovery contract types,
// derives the service host candidates the BFF is queried with, and keeps the
// curated Pay.sh copy overrides.

import type { GeoSpec } from "./source";

export type {
  AeoChecklistItem,
  AeoDiscovery,
  AeoDiscoveryEndpoint,
  FacilitatorDiscoveryRow,
} from "contracts";

const hostOf = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return (
      url
        .replace(/^https?:\/\//, "")
        .split("/")[0]
        ?.toLowerCase() ?? null
    );
  }
};

// Candidate hosts the BFF discovery endpoint is queried with, most authoritative
// first. Providers often have a null serviceUrl (catalog rows), so observed and
// MPP endpoint hosts are included as fallbacks — e.g. CoinGecko resolves via its
// observed `pro-api.coingecko.com` endpoints, Nansen via its MPP `api.nansen.ai`.
export const aeoServiceHostCandidates = (spec: GeoSpec | null): string[] => {
  if (!spec) return [];
  const hosts: string[] = [];
  const add = (url: string | null | undefined) => {
    const host = hostOf(url);
    if (host && !hosts.includes(host)) hosts.push(host);
  };
  add(spec.serviceUrl);
  for (const endpoint of spec.observedEndpoints) add(endpoint.resource);
  for (const endpoint of spec.mppEndpoints) add(endpoint.resource);
  return hosts;
};

export type AeoPayShText = { description: string; useCase: string };

// Curated Pay.sh description / use case for AEO demo providers, keyed by
// serviceUrl host. Overrides the baked atlas text when present (the baked entry
// can carry a mismatched description for a freshly listed provider).
const PAYSH_TEXT_BY_HOST: Record<string, AeoPayShText> = {
  "stableenrich.dev": {
    description:
      "Unified enrichment gateway for Apollo, Exa, Firecrawl, Google Maps, Hunter, Minerva, Reddit, Serper, Whitepages, Cloudflare, and more. Covers people and company enrichment, web search, scraping, maps, email verification, and property data.",
    useCase:
      "Use for contact enrichment, company lookup, prospect search, web search, page scraping, local business discovery, place details, email verification, social profile enrichment, Reddit research, news and shopping search, people search, and property records.",
  },
};

/** Curated Pay.sh description/use case for a known provider, else null. */
export const getAeoPayShText = (spec: GeoSpec | null): AeoPayShText | null => {
  if (!spec) return null;
  const host = hostOf(spec.serviceUrl);
  return host ? (PAYSH_TEXT_BY_HOST[host] ?? null) : null;
};
