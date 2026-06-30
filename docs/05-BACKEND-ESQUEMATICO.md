# Backend esquemático — Flovia Stellar

## 1. Componentes del backend

```
apps/bff/                        Servidor HTTP (Bun + Hono)
apps/data/                       Migraciones Postgres + seeds
apps/cli/                        CLI scripts: indexer, seeds, demo
packages/sources/                Clientes a Horizon / Soroban / StellarExpert
packages/intelligence/           Lógica analítica (Trust Score, ranker, AI prompts)
packages/contracts/              Tipos Zod compartidos
code/x402-stellar-middleware/    Paquete publicable, usable por providers
```

## 2. Endpoints REST

### 2.1 Catálogo

#### `GET /providers`
Lista de proveedores.

**Query params:**
- `category?` — `fx|data|ai|cdn|...`
- `kyb?` — `true|false|any` (default any)
- `minScore?` — number 0-100
- `q?` — búsqueda libre (nombre)
- `limit?` — default 25, max 100
- `cursor?` — para paginación

**Respuesta:**
```json
{
  "items": [
    {
      "id": "ctr_C123.../prov_42",
      "name": "FX Rates Oracle",
      "endpoint": "https://fx.example.com/rate",
      "priceUsdc": 0.005,
      "ownerAccount": "GBFXP...",
      "kybStatus": "verified",
      "trustScore": 87,
      "stats24h": { "calls": 248, "volumeUsdc": 1.24 }
    }
  ],
  "nextCursor": null
}
```

#### `GET /providers/:id`
Detalle ligero (sin AI insight ni history pesado).

#### `GET /providers/:id/intelligence`
Payload completo de 7 capas. **Endpoint estrella.**

```json
{
  "provider": { ...ProviderSchema },
  "identity": {
    "owner": "GBFXP...",
    "controlsContract": "C123...",
    "linkedDomains": ["fx.example.com"],
    "knownAliases": []
  },
  "verification": {
    "kybStatus": "verified",
    "kybProvider": "anchor:GANCH...",
    "kybTier": 2,
    "verifiedAt": "2026-05-13T..."
  },
  "finance": {
    "lifetimeVolumeUsdc": 124.55,
    "lifetimeCalls": 6212,
    "avgCallValue": 0.005,
    "balances": [ { "asset": "USDC", "balance": 42.11 } ],
    "topPathsIn": ["GBANCH...", "GBAGEN1..."]
  },
  "trustScore": {
    "total": 87,
    "components": {
      "age":     { "value": 84,  "weight": 0.15, "raw": "76 days" },
      "volume":  { "value": 62,  "weight": 0.30, "raw": "$124 USDC lifetime" },
      "kyb":     { "value": 100, "weight": 0.30, "raw": "verified tier 2" },
      "claims":  { "value": 100, "weight": 0.15, "raw": "0 disputes" },
      "recency": { "value": 100, "weight": 0.10, "raw": "active 3h ago" }
    },
    "computedAt": "2026-06-29T..."
  },
  "aiInsight": {
    "strengths": ["..."],
    "watchOuts": ["..."],
    "bestFitFor": "...",
    "model": "claude-sonnet-4-6",
    "cachedAt": "2026-06-29T..."
  }
}
```

### 2.2 Recomendación

#### `GET /api/recommend`
**Query params:** `need`, `maxPrice`, `kybRequired`, `minScore`, `topN` (default 3).

**Respuesta:**
```json
{
  "query": { "need": "fx", "maxPrice": 0.01, "kybRequired": true },
  "results": [
    {
      "providerId": "...",
      "matchScore": 0.91,
      "reasoning": "Highest Trust Score among KYB-verified FX providers...",
      "estimatedCostUsdc": 0.005,
      "estimatedLatencyMs": 320
    },
    { "providerId": "...", "matchScore": 0.82, "reasoning": "..." }
  ],
  "generatedBy": "claude-sonnet-4-6",
  "cacheTtlSec": 60
}
```

### 2.3 Pago

#### `POST /api/pay/prepare`
Construye XDR para que el agente firme.

**Request:**
```json
{ "providerId": "...", "callContext": { "endpoint": "/rate", "payload": "..." } }
```

**Respuesta:**
```json
{
  "xdrBase64": "AAAAAg...",
  "challenge": {
    "destination": "GBFXP...",
    "asset": { "code": "USDC", "issuer": "GBBD..." },
    "amount": "0.005",
    "memo": "f1c2e3...",
    "expiresAt": "2026-06-29T18:00:00Z"
  }
}
```

#### `POST /api/pay/verify`
Confirma que un pago se hizo (para indexar más rápido).

**Request:** `{ "txHash": "..." }`
**Respuesta:** `{ "verified": true, "providerId": "...", "amountUsdc": 0.005 }`

### 2.4 Cuentas e introspección

#### `GET /accounts/:G/intelligence`
Perfil de cualquier cuenta Stellar (no sólo providers): balances, actividad, conexiones con providers conocidos. Útil para que el reviewer SCF pueda investigar.

### 2.5 Stats

#### `GET /stats/overview`
Métricas globales: total providers, total payments, volumen acumulado, # agentes únicos.

### 2.6 Salud

#### `GET /health`
`{ "ok": true, "horizon": "ok", "sorobanRpc": "ok", "db": "ok", "lastIndexedLedger": 12345678 }`

## 3. Esquema de base de datos (Postgres / Drizzle)

```sql
-- providers: espejo enriquecido del registry on-chain
CREATE TABLE providers (
  id              text PRIMARY KEY,           -- "contractId/providerId"
  contract_id     text NOT NULL,
  provider_id     bigint NOT NULL,
  name            text NOT NULL,
  endpoint        text NOT NULL,
  price_usdc      numeric(20,7) NOT NULL,
  owner_account   text NOT NULL,
  payment_asset   text NOT NULL DEFAULT 'USDC',
  category        text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL,
  last_seen_at    timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX providers_owner_idx ON providers(owner_account);
CREATE INDEX providers_category_idx ON providers(category);
CREATE INDEX providers_score_idx ON providers((metadata->>'trustScore') NULLS LAST);

-- verifications: KYB / KYC
CREATE TABLE verifications (
  provider_id   text REFERENCES providers(id),
  kyb_status    text NOT NULL,                -- 'verified' | 'pending' | 'none'
  kyb_provider  text,                          -- "anchor:G..."
  kyb_tier      smallint,
  verified_at   timestamptz,
  source        text,                          -- 'sep-12' | 'manual' | 'mock'
  PRIMARY KEY (provider_id)
);

-- payments: log de pagos detectados on-chain
CREATE TABLE payments (
  tx_hash         text PRIMARY KEY,
  provider_id     text REFERENCES providers(id),
  payer_account   text NOT NULL,
  amount_usdc     numeric(20,7) NOT NULL,
  memo            text,
  ledger          bigint NOT NULL,
  paid_at         timestamptz NOT NULL,
  served_ok       boolean,                    -- el provider sirvió el recurso?
  latency_ms      integer
);
CREATE INDEX payments_provider_idx ON payments(provider_id, paid_at DESC);
CREATE INDEX payments_payer_idx ON payments(payer_account, paid_at DESC);

-- trust_score_history
CREATE TABLE trust_score_history (
  provider_id   text REFERENCES providers(id),
  computed_at   timestamptz NOT NULL,
  total         smallint NOT NULL,
  components    jsonb NOT NULL,
  PRIMARY KEY (provider_id, computed_at)
);

-- ai_recommendations: cache de respuestas LLM
CREATE TABLE ai_recommendations (
  cache_key     text PRIMARY KEY,             -- hash de (provider_id + version)
  payload       jsonb NOT NULL,
  model         text NOT NULL,
  generated_at  timestamptz NOT NULL,
  expires_at    timestamptz NOT NULL
);

-- events: analítica del propio Flovia
CREATE TABLE events (
  id            bigserial PRIMARY KEY,
  type          text NOT NULL,
  payload       jsonb NOT NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_type_idx ON events(type, occurred_at DESC);

-- indexer_state: cursor del indexer
CREATE TABLE indexer_state (
  key            text PRIMARY KEY,            -- 'last_ledger'
  value          text NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
```

## 4. Jobs / procesos en background

### 4.1 Indexer (`apps/cli/indexer.ts`)
- Corre cada 10 segundos.
- Pull de eventos Soroban desde `last_ledger`.
- Upsert en `providers` y `payments`.
- Recalcula `trustScore` para providers con actividad nueva.
- Inserta snapshot en `trust_score_history`.

### 4.2 AI cache warmer (`apps/cli/ai-warmer.ts`)
- Corre cada hora.
- Para cada provider activo, regenera el insight si la cache expiró.

### 4.3 Stats aggregator (`apps/cli/stats.ts`)
- Corre cada 5 min.
- Calcula stats globales y los cachea para `/stats/overview`.

## 5. Capa de fuentes (`packages/sources`)

```
packages/sources/
├── stellar/
│   ├── horizon.ts          # GET /accounts, /transactions, /payments
│   ├── soroban-rpc.ts      # invocations al contract, getEvents
│   ├── stellar-expert.ts   # perfil de cuenta enriquecido
│   └── usdc.ts             # constantes y helpers USDC en Stellar
├── kyb/
│   ├── sep12-anchor.ts     # stub que consulta un anchor
│   └── mock.ts             # tabla local para hackathon
└── transport.ts            # fetch con retry + timeout (se conserva)
```

Detalle de migración en `11-MIGRACION-PACKAGES-SOURCES.md`.

## 6. Capa de inteligencia (`packages/intelligence`)

```
packages/intelligence/
├── trust.ts               # cálculo de Trust Score (puro, testeable)
├── ranker.ts              # ranking para /api/recommend
├── ai.ts                  # llamada a Claude con prompts
└── prompts/
    ├── insight.ts         # prompt para perfil
    └── recommend.ts       # prompt para recomendación
```

### 6.1 Trust score (signature)
```ts
export function computeTrustScore(input: {
  registeredAt: Date;
  volumeUsdc30d: number;
  kybStatus: 'verified' | 'pending' | 'none';
  kybTier?: number;
  disputes: number;
  totalPayments: number;
  lastActivityAt: Date | null;
}): TrustScoreResult; // { total, components }
```

### 6.2 Ranker (signature)
```ts
export function rankProviders(
  candidates: ProviderWithIntelligence[],
  query: { need?: string; maxPrice?: number; kybRequired?: boolean; minScore?: number }
): RankedProvider[]; // sort by combined match score
```

## 7. Stellar SDK — patterns que repetimos

### 7.1 Conexión
```ts
import { Horizon, SorobanRpc, Networks } from "@stellar/stellar-sdk";

export const horizon = new Horizon.Server(env.HORIZON_URL);
export const soroban = new SorobanRpc.Server(env.SOROBAN_RPC_URL);
export const networkPassphrase = env.STELLAR_NETWORK === 'public'
  ? Networks.PUBLIC : Networks.TESTNET;
```

### 7.2 Verificar pago USDC
```ts
export async function verifyUsdcPayment(opts: {
  txHash: string;
  expectedDest: string;
  expectedAmount: string;
  expectedMemo: string;
}): Promise<{ ok: true } | { ok: false, reason: string }> {
  const tx = await horizon.transactions().transaction(opts.txHash).call();
  if (tx.memo !== opts.expectedMemo) return { ok: false, reason: 'memo mismatch' };
  const ops = await tx.operations();
  const payment = ops.records.find(o => o.type === 'payment');
  if (!payment) return { ok: false, reason: 'no payment op' };
  if (payment.to !== opts.expectedDest) return { ok: false, reason: 'destination mismatch' };
  if (payment.asset_code !== 'USDC') return { ok: false, reason: 'wrong asset' };
  if (Number(payment.amount) < Number(opts.expectedAmount)) return { ok: false, reason: 'underpayment' };
  return { ok: true };
}
```

### 7.3 Invocar contract Soroban (read)
```ts
import { Contract, scValToNative, TransactionBuilder, BASE_FEE } from "@stellar/stellar-sdk";

export async function getProvider(contractId: string, providerId: bigint) {
  const contract = new Contract(contractId);
  const account = await soroban.getAccount(env.READER_ACCOUNT);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(contract.call("get_provider", /* args */))
    .setTimeout(30).build();
  const sim = await soroban.simulateTransaction(tx);
  return scValToNative(sim.result!.retval);
}
```

## 8. Pipeline LLM (recomendación e insight)

### 8.1 Prompt skeleton para `/api/recommend`
```ts
const sys = `You are Flovia, an agentic-payments intelligence service on Stellar.
Given a need and a list of candidate providers (with Trust Score, KYB, price, recent activity),
pick the top N and explain succinctly why. JSON only.`;

const user = JSON.stringify({ query, candidates });

const res = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 800,
  system: sys,
  messages: [{ role: "user", content: user }],
});
```

### 8.2 Estructura JSON forzada
Validamos la salida con Zod (`RecommendResponseSchema`). Si falla parsing, reintentamos con `temperature: 0`.

## 9. Despliegue local

```bash
# 1. Variables
cp .env.example .env
# Editar STELLAR_*, ANTHROPIC_API_KEY, DATABASE_URL

# 2. DB
docker compose up -d postgres
bun --filter=@flovia/data migrate
bun --filter=@flovia/data seed

# 3. Contrato (una vez)
cd code/soroban-registry
stellar contract build
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/flovia_registry.wasm \
  --network testnet --source <admin-secret>
# guardar el contract id en .env como REGISTRY_CONTRACT_ID

# 4. BFF + indexer + frontend
bun --filter=@flovia/bff dev      # puerto 4000
bun --filter=@flovia/cli indexer  # corre en otra terminal
bun --filter=@flovia/frontend dev # puerto 3000
```

## 10. Checklist de listo-para-demo

- [ ] Contrato deployado en testnet, ID en `.env`.
- [ ] 5+ providers seedeados con datos reales (no lorem ipsum).
- [ ] Indexer corriendo en background y al día.
- [ ] Playground hace el end-to-end en < 10s sin errores.
- [ ] `/health` devuelve todo `ok`.
- [ ] Variables sensibles NO en repo (review pre-push).
- [ ] Video grabado como fallback.
