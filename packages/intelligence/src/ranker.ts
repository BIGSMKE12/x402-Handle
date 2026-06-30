// Ticket 4.2 — Ranker determinístico: ordena providers candidatos combinando
// Trust Score, ajuste de precio y match de categoría. Es la entrada que después
// consume la capa de IA (packages/intelligence/ai.ts, pendiente) para elegir
// el top-N y explicar el motivo — pero el ranking en sí no depende de un LLM.
import type { StellarProvider, TrustScore } from "contracts";

export interface RankCandidate {
  provider: StellarProvider;
  trustScore: TrustScore;
}

export interface RankOptions {
  /** Categoría buscada (ej. "fx", "data"). Si se omite, no penaliza por categoría. */
  category?: string;
  /** Presupuesto máximo en USDC por call. Si se omite, no penaliza por precio. */
  maxPriceUsdc?: number;
}

export interface RankedProvider {
  provider: StellarProvider;
  trustScore: number;
  matchScore: number; // 0-1
  reasons: string[];
}

const WEIGHTS = {
  trust: 0.6,
  price: 0.25,
  category: 0.15,
} as const;

function priceFit(priceUsdc: number, maxPriceUsdc?: number): number {
  if (maxPriceUsdc === undefined) return 1;
  if (priceUsdc <= maxPriceUsdc) return 1;
  if (maxPriceUsdc <= 0) return 0;
  return Math.max(0, 1 - (priceUsdc - maxPriceUsdc) / maxPriceUsdc);
}

function categoryMatch(providerCategory: string | null, category?: string): number {
  if (!category) return 1;
  if (!providerCategory) return 0;
  return providerCategory.toLowerCase() === category.toLowerCase() ? 1 : 0;
}

/**
 * Rankea providers activos por match score descendente. Providers inactivos
 * se excluyen siempre — un agente no debería ni considerarlos.
 */
export function rankProviders(
  candidates: RankCandidate[],
  opts: RankOptions = {},
): RankedProvider[] {
  return candidates
    .filter((c) => c.provider.active)
    .map((c) => {
      const trustNorm = c.trustScore.score / 100;
      const price = priceFit(c.provider.priceUsdc, opts.maxPriceUsdc);
      const category = categoryMatch(c.provider.category, opts.category);

      const matchScore =
        WEIGHTS.trust * trustNorm + WEIGHTS.price * price + WEIGHTS.category * category;

      const reasons: string[] = [];
      if (c.trustScore.score >= 80) reasons.push("high_trust_score");
      if (opts.maxPriceUsdc !== undefined && c.provider.priceUsdc <= opts.maxPriceUsdc) {
        reasons.push("within_budget");
      }
      if (opts.category && category === 1) reasons.push("category_match");

      return {
        provider: c.provider,
        trustScore: c.trustScore.score,
        matchScore,
        reasons,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
