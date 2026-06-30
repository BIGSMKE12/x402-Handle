# Migración de `packages/sources` — De Solana/EVM a Stellar

> Guía archivo-por-archivo para reescribir la capa de fuentes externas del POC, manteniendo intactos `contracts`, `intelligence`, `apps/bff`, `apps/frontend`.

---

## 1. Cambios globales

### 1.1 Borrar
```
packages/sources/x402-discovery.ts       # CDP-specific
packages/sources/cdp-discovery.ts        # Coinbase Developer Platform
packages/sources/bitquery.ts             # se reemplaza por Horizon directo
packages/sources/zerion.ts               # EVM wallet data
packages/sources/mpp-registry.ts         # HitPay específico
```

### 1.2 Conservar
```
packages/sources/transport.ts            # HTTP cliente con retry/timeout — útil
packages/sources/index.ts                # se actualiza el barrel
```

### 1.3 Crear
```
packages/sources/stellar/
├── horizon.ts
├── soroban-rpc.ts
├── usdc.ts
├── stellar-expert.ts
└── index.ts
packages/sources/kyb/
├── sep12-anchor.ts
├── mock.ts
└── index.ts
```

### 1.4 Dependencias

**Quitar de `package.json`:**
```json
"@solana/web3.js": "...",
"@coinbase/cdp-sdk": "..." (si existe)
```

**Agregar:**
```json
"@stellar/stellar-sdk": "^12.3.0"
```

Instalar: `bun add @stellar/stellar-sdk` desde `packages/sources/`.

---

## 2. `packages/sources/stellar/horizon.ts` — NUEVO

```ts
// packages/sources/stellar/horizon.ts
import { Horizon, Asset, Networks } from "@stellar/stellar-sdk";
import { z } from "zod";

const config = {
  url: process.env.HORIZON_URL || "https://horizon-testnet.stellar.org",
  network: process.env.STELLAR_NETWORK === "public"
    ? Networks.PUBLIC
    : Networks.TESTNET,
};

export const horizon = new Horizon.Server(config.url, { allowHttp: false });
export const networkPassphrase = config.network;

// ───────────────────────────── Account

export async function getAccount(publicKey: string) {
  const acc = await horizon.loadAccount(publicKey);
  return {
    id: acc.account_id,
    sequence: acc.sequence,
    subentryCount: acc.subentry_count,
    balances: acc.balances.map((b: any) => ({
      assetType: b.asset_type,
      assetCode: b.asset_code,
      assetIssuer: b.asset_issuer,
      balance: b.balance,
    })),
    lastModifiedTime: acc.last_modified_time,
  };
}

// ───────────────────────────── Payments

export async function listPayments(
  publicKey: string,
  opts: { limit?: number; order?: "asc" | "desc"; cursor?: string } = {}
) {
  const builder = horizon.payments()
    .forAccount(publicKey)
    .limit(opts.limit ?? 50)
    .order(opts.order ?? "desc");
  if (opts.cursor) builder.cursor(opts.cursor);
  const page = await builder.call();
  return {
    records: page.records.map((p: any) => ({
      id: p.id,
      type: p.type,
      txHash: p.transaction_hash,
      from: p.from,
      to: p.to,
      amount: p.amount,
      assetType: p.asset_type,
      assetCode: p.asset_code,
      assetIssuer: p.asset_issuer,
      createdAt: p.created_at,
    })),
    cursor: page.records.length ? page.records[page.records.length - 1].paging_token : null,
  };
}

// ───────────────────────────── Transaction (for x402 verification)

export async function getTransaction(txHash: string) {
  const tx = await horizon.transactions().transaction(txHash).call();
  const opsPage = await horizon.transactions().transaction(txHash).operations().call();
  return {
    hash: tx.hash,
    successful: tx.successful,
    ledger: tx.ledger_attr,
    memo: tx.memo,
    memoType: tx.memo_type,
    createdAt: tx.created_at,
    operations: opsPage.records.map((o: any) => ({
      type: o.type,
      from: o.from,
      to: o.to,
      amount: o.amount,
      assetType: o.asset_type,
      assetCode: o.asset_code,
      assetIssuer: o.asset_issuer,
    })),
  };
}

// ───────────────────────────── Health

export async function ping(): Promise<boolean> {
  try {
    await horizon.ledgers().limit(1).order("desc").call();
    return true;
  } catch {
    return false;
  }
}
```

---

## 3. `packages/sources/stellar/soroban-rpc.ts` — NUEVO

```ts
// packages/sources/stellar/soroban-rpc.ts
import {
  rpc,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Account,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { networkPassphrase } from "./horizon";

const sorobanUrl =
  process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";

export const sorobanRpc = new rpc.Server(sorobanUrl);

// ───────────────────────────── Simulate (read-only contract call)

export async function simulateContractCall(opts: {
  readerAccount: string;       // any funded account works for simulation
  contractId: string;
  fn: string;
  args: xdr.ScVal[];
}) {
  const contract = new Contract(opts.contractId);
  const account = await sorobanRpc.getAccount(opts.readerAccount);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(opts.fn, ...opts.args))
    .setTimeout(30)
    .build();

  const sim = await sorobanRpc.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  if (!sim.result?.retval) {
    throw new Error("Simulation returned no value");
  }
  return scValToNative(sim.result.retval);
}

// ───────────────────────────── Events (for indexer)

export async function getContractEvents(opts: {
  contractId: string;
  fromLedger: number;
  limit?: number;
}) {
  const res = await sorobanRpc.getEvents({
    startLedger: opts.fromLedger,
    filters: [
      {
        type: "contract",
        contractIds: [opts.contractId],
      },
    ],
    limit: opts.limit ?? 100,
  });
  return res.events.map((e: any) => ({
    ledger: e.ledger,
    timestamp: e.ledgerClosedAt,
    contractId: e.contractId,
    topics: e.topic.map((t: any) => scValToNative(t)),
    value: scValToNative(e.value),
    type: e.type,
  }));
}

// ───────────────────────────── Health

export async function pingSoroban(): Promise<boolean> {
  try {
    await sorobanRpc.getHealth();
    return true;
  } catch {
    return false;
  }
}

export async function getLatestLedger(): Promise<number> {
  const r = await sorobanRpc.getLatestLedger();
  return r.sequence;
}
```

---

## 4. `packages/sources/stellar/usdc.ts` — NUEVO

```ts
// packages/sources/stellar/usdc.ts
import { Asset } from "@stellar/stellar-sdk";

const USDC_ISSUERS = {
  testnet: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  public:  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // Circle
};

export const USDC_ISSUER =
  process.env.STELLAR_NETWORK === "public"
    ? USDC_ISSUERS.public
    : USDC_ISSUERS.testnet;

export const USDC = new Asset("USDC", USDC_ISSUER);

export const usdcInfo = {
  code: "USDC",
  issuer: USDC_ISSUER,
  decimals: 7, // Stellar standard
};

/**
 * Convierte un monto en USDC humano-legible (string como "0.005")
 * a stroops (string como "50000") — la unidad on-chain.
 */
export function usdcToStroops(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return (Math.round(n * 10 ** 7)).toString();
}

export function stroopsToUsdc(stroops: string | number): number {
  const n = typeof stroops === "string" ? Number(stroops) : stroops;
  return n / 10 ** 7;
}
```

---

## 5. `packages/sources/stellar/stellar-expert.ts` — NUEVO (opcional)

```ts
// packages/sources/stellar/stellar-expert.ts
import { fetchWithRetry } from "../transport";

const BASE = process.env.STELLAR_NETWORK === "public"
  ? "https://api.stellar.expert/explorer/public"
  : "https://api.stellar.expert/explorer/testnet";

/**
 * Perfil enriquecido de una cuenta: tags, dominio, alias, etc.
 * Es complementario a Horizon (que sólo da datos crudos).
 */
export async function getAccountProfile(publicKey: string) {
  const res = await fetchWithRetry(
    `${BASE}/account/${publicKey}`,
    {},
    { retries: 2, timeoutMs: 5000 }
  );
  if (!res.ok) return null;
  const data = await res.json() as any;
  return {
    publicKey: data.account,
    tags: data.tags ?? [],
    domain: data.domain ?? null,
    home_domain: data.home_domain ?? null,
    name: data.name ?? null,
    payments: data.payments ?? null,
    created: data.created ?? null,
  };
}
```

---

## 6. `packages/sources/stellar/index.ts` — barrel

```ts
// packages/sources/stellar/index.ts
export * from "./horizon";
export * from "./soroban-rpc";
export * from "./usdc";
export * from "./stellar-expert";
```

---

## 7. `packages/sources/kyb/mock.ts` — NUEVO

```ts
// packages/sources/kyb/mock.ts
//
// MOCK_KYB: Reemplazar en mes 1-3 por integración real con SEP-12 anchor.
// La forma del dato respeta el contrato real.
//

type KybRecord = {
  providerId: string;
  status: "verified" | "pending" | "none";
  kybProvider?: string;       // "anchor:G..."
  kybTier?: 1 | 2 | 3;
  verifiedAt?: string;
};

const MOCKS: Record<string, KybRecord> = {
  // se carga vía seed; placeholders:
};

export async function getKybStatus(providerId: string): Promise<KybRecord> {
  console.warn(`[MOCK_KYB] fetching ${providerId}`);
  return MOCKS[providerId] ?? { providerId, status: "none" };
}

export async function setKybStatus(rec: KybRecord) {
  MOCKS[rec.providerId] = rec;
}
```

---

## 8. `packages/sources/kyb/sep12-anchor.ts` — NUEVO (placeholder real)

```ts
// packages/sources/kyb/sep12-anchor.ts
//
// SEP-12 KYC API integration.
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md
//
// En hackathon: stub que retorna mock. En mes 1-3: implementación completa.

import { fetchWithRetry } from "../transport";

export async function querySep12Anchor(opts: {
  anchorBaseUrl: string;       // ej. https://api.anchor.example/sep12
  account: string;             // G...
  jwt: string;                 // obtained via SEP-10 flow
}) {
  const res = await fetchWithRetry(
    `${opts.anchorBaseUrl}/customer?account=${opts.account}`,
    {
      headers: { Authorization: `Bearer ${opts.jwt}` },
    }
  );
  if (!res.ok) return null;
  return await res.json();
}
```

---

## 9. Actualizar `packages/sources/index.ts`

```ts
// packages/sources/index.ts
export * as stellar from "./stellar";
export * as kyb from "./kyb";
export * from "./transport";
```

---

## 10. Variables de entorno nuevas (en `.env.example`)

```diff
- # Solana
- SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
- SOLANA_MPP_PAYER_PRIVATE_KEY=
- BITQUERY_API_KEY=
- ZERION_API_KEY=
- CDP_API_KEY=

+ # Stellar
+ STELLAR_NETWORK=testnet
+ HORIZON_URL=https://horizon-testnet.stellar.org
+ SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
+ USDC_ASSET_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
+ REGISTRY_CONTRACT_ID=
+ READER_ACCOUNT=G...            # cuenta cualquiera con fondos para simulate()
+ DEMO_AGENT_SECRET=S...         # cuenta del agente del playground
+ DEMO_PROVIDER_SECRET=S...      # cuenta del provider del playground
```

---

## 11. Actualizar `packages/contracts/`

### Tipos que se borran
```
packages/contracts/src/solana.ts
packages/contracts/src/bitquery.ts
packages/contracts/src/cdp.ts
packages/contracts/src/zerion.ts
```

### Tipos nuevos

```ts
// packages/contracts/src/stellar.ts
import { z } from "zod";

export const StellarAccountSchema = z.object({
  publicKey: z.string().regex(/^G[A-Z2-7]{55}$/),
  sequence: z.string(),
  balances: z.array(z.object({
    assetType: z.string(),
    assetCode: z.string().optional(),
    assetIssuer: z.string().optional(),
    balance: z.string(),
  })),
});

export const StellarPaymentSchema = z.object({
  txHash: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  assetCode: z.string(),
  assetIssuer: z.string().optional(),
  memo: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type StellarAccount = z.infer<typeof StellarAccountSchema>;
export type StellarPayment = z.infer<typeof StellarPaymentSchema>;
```

```ts
// packages/contracts/src/provider.ts (NUEVO)
import { z } from "zod";

export const ProviderSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  providerId: z.number(),
  name: z.string(),
  endpoint: z.string().url(),
  priceUsdc: z.number().positive(),
  ownerAccount: z.string(),
  paymentAsset: z.literal("USDC"),
  category: z.string().optional(),
  active: z.boolean(),
  createdAt: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

export type Provider = z.infer<typeof ProviderSchema>;
```

```ts
// packages/contracts/src/trust.ts (NUEVO)
import { z } from "zod";

export const TrustScoreComponentSchema = z.object({
  value: z.number().min(0).max(100),
  weight: z.number(),
  raw: z.string(),
});

export const TrustScoreSchema = z.object({
  total: z.number().int().min(0).max(100),
  components: z.object({
    age: TrustScoreComponentSchema,
    volume: TrustScoreComponentSchema,
    kyb: TrustScoreComponentSchema,
    claims: TrustScoreComponentSchema,
    recency: TrustScoreComponentSchema,
  }),
  computedAt: z.string().datetime(),
});

export type TrustScore = z.infer<typeof TrustScoreSchema>;
```

---

## 12. Actualizar `packages/intelligence/`

### Borrar
```
packages/intelligence/customer.ts   # era wallet-EVM specific
packages/intelligence/market.ts     # se reescribe
```

### Nuevo / actualizado

```
packages/intelligence/trust.ts      # ya descrito en TRD § 7
packages/intelligence/ranker.ts     # nuevo
packages/intelligence/ai.ts         # nuevo (Anthropic)
packages/intelligence/prompts/
  insight.ts
  recommend.ts
```

---

## 13. Checklist post-migración

- [ ] `bun typecheck` pasa sin errores en todo el monorepo.
- [ ] `packages/sources/index.ts` solo exporta cosas Stellar.
- [ ] Nada importa de `@solana/web3.js` ni de `bitquery` ni de `zerion`.
- [ ] `apps/bff` arranca y `/health` devuelve `horizon: ok, sorobanRpc: ok`.
- [ ] Test manual: `bun run apps/cli/test-stellar.ts <G>` imprime balances.
- [ ] `.env.example` actualizado, viejas variables Solana removidas.
- [ ] README del repo actualizado (no menciona Solana).
- [ ] El package.json raíz no tiene dependencias EVM/Solana.

---

## 14. Mapping rápido (memoria)

| Concepto viejo (Solana/EVM) | Equivalente Stellar |
|---|---|
| Solana RPC | Horizon + Soroban RPC |
| `@solana/web3.js` | `@stellar/stellar-sdk` |
| Public key Solana (base58) | Account ID Stellar (`G...` base32) |
| Wallet privada (Uint8Array) | Secret seed (`S...`) |
| Bitquery (indexer EVM) | Horizon `/payments`, `/transactions` |
| Zerion (wallet EVM) | Stellar Expert + Horizon |
| CDP (Coinbase) | (no aplica) — el x402 lo implementamos nosotros |
| MPP / HitPay | (no aplica) — el registry lo implementamos en Soroban |
| Token EVM (ERC-20) | Asset Stellar (issuer + code) |
| USDC on Base/Solana | USDC nativo Circle on Stellar |
| Smart contract (Solidity) | Soroban contract (Rust) |
| `eth_sendRawTransaction` | `horizon.submitTransaction(signed)` |
| Memo / call data | Stellar memo (28 bytes) o `manageData` op |
