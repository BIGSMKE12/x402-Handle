// code/x402-stellar-middleware/src/replay-cache.ts
//
// Cache en memoria de tx_hashes que ya se consumieron como pago válido.
// Previene replay attacks: una misma tx no puede comprar dos veces el recurso.
//
// Para producción multi-instancia, reemplazar por Redis o por log on-chain
// (log_payment en el contrato Soroban actúa como replay cache distribuido).

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CacheEntry {
  txHash: string;
  consumedAt: number;
}

export interface ReplayCache {
  has(txHash: string): boolean;
  add(txHash: string): void;
  size(): number;
}

export function createReplayCache(opts: { ttlMs?: number } = {}): ReplayCache {
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  const store = new Map<string, CacheEntry>();

  // Purga lazy: cada vez que insertamos algo, limpiamos lo viejo.
  function purgeExpired() {
    const now = Date.now();
    for (const [hash, entry] of store) {
      if (now - entry.consumedAt > ttl) store.delete(hash);
    }
  }

  return {
    has(txHash: string): boolean {
      const entry = store.get(txHash);
      if (!entry) return false;
      if (Date.now() - entry.consumedAt > ttl) {
        store.delete(txHash);
        return false;
      }
      return true;
    },
    add(txHash: string): void {
      purgeExpired();
      store.set(txHash, { txHash, consumedAt: Date.now() });
    },
    size(): number {
      return store.size;
    },
  };
}

// Cache singleton por defecto (se puede overridear en config)
export const defaultReplayCache = createReplayCache();
