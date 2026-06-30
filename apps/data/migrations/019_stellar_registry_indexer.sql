-- Día 3 (Flovia/Stellar): tablas que el indexer (apps/cli/indexer.ts)
-- mantiene como espejo del registry on-chain (Soroban) + log de pagos.

CREATE TABLE IF NOT EXISTS providers (
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
CREATE INDEX IF NOT EXISTS providers_owner_idx ON providers(owner_account);
CREATE INDEX IF NOT EXISTS providers_category_idx ON providers(category);

CREATE TABLE IF NOT EXISTS payments (
  tx_hash         text PRIMARY KEY,
  provider_id     text REFERENCES providers(id),
  payer_account   text NOT NULL,
  amount_usdc     numeric(20,7) NOT NULL,
  memo            text,
  ledger          bigint NOT NULL,
  paid_at         timestamptz NOT NULL,
  served_ok       boolean,
  latency_ms      integer
);
CREATE INDEX IF NOT EXISTS payments_provider_idx ON payments(provider_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS payments_payer_idx ON payments(payer_account, paid_at DESC);

CREATE TABLE IF NOT EXISTS indexer_state (
  key            text PRIMARY KEY,            -- 'last_ledger'
  value          text NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
