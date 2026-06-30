# @flovia/x402-stellar

> Middleware HTTP que implementa el protocolo **x402 sobre Stellar** para cobrar por endpoints en USDC nativo.

## Idea

Un endpoint protegido devuelve `402 Payment Required` con un challenge (destino, monto, memo). El cliente firma una transacción USDC en Stellar, la submitea, y reintenta el request con el header `X-PAYMENT: <tx_hash>`. El middleware verifica el pago en Horizon y sirve el recurso.

## Estructura

```
src/
├── types.ts        # esquemas Zod del protocolo
├── server.ts       # middleware estilo Hono/Express
├── client.ts       # helper para agentes (paga + reintenta)
├── verify.ts       # verificación on-chain (consulta Horizon)
└── replay-cache.ts # idempotencia por tx_hash
```

## Instalación (en el monorepo)

Por ahora vive dentro del repo como `@flovia/x402-stellar`. Para publicarlo a npm más adelante.

```ts
import { x402Stellar } from "@flovia/x402-stellar";
import { Hono } from "hono";

const app = new Hono();

app.use(
  "/api/*",
  x402Stellar({
    destination: process.env.PROVIDER_ACCOUNT!,      // G...
    amountUsdc: "0.005",
    network: "testnet",
    onPaymentVerified: async ({ txHash, payer }) => {
      // opcional: log_payment al contrato Soroban
    },
  })
);

app.get("/api/rate", (c) => c.json({ pair: "EUR/USD", rate: 1.0843 }));

export default app;
```

## Cliente (agente)

```ts
import { x402Pay } from "@flovia/x402-stellar/client";

const data = await x402Pay({
  url: "https://provider.example/api/rate",
  agentSecret: process.env.AGENT_SECRET!,
  network: "testnet",
});
```

## Decisiones clave

- **Sólo USDC.** Multi-asset queda para v2.
- **Memo único** por challenge: garantiza idempotencia.
- **Replay protection** local con TTL de 24h por defecto.
- **Verificación contra Horizon**, nunca contra el cliente.

## Tests

```bash
bun test
```
