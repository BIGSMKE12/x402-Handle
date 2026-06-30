/**
 * Ticket 2.5 — demo end-to-end del flujo x402-Stellar.
 * Criterio de "listo": completa el ciclo en <10s con tx real en testnet.
 *
 * Uso:
 *   bun apps/cli/scripts/demo-call.ts
 *
 * Requiere en .env:
 *   DEMO_AGENT_SECRET, DEMO_PROVIDER_PUBLIC, STELLAR_NETWORK
 *   DEMO_PROVIDER_PORT (default 5402) — el demo-provider debe estar corriendo
 */

import { x402Pay } from "@flovia/x402-stellar/client";
import {
  Horizon,
  Asset,
  TransactionBuilder,
  Networks,
  Operation,
  Keypair,
  Memo,
  BASE_FEE,
} from "@stellar/stellar-sdk";

const AGENT_SECRET = process.env.DEMO_AGENT_SECRET;
const PROVIDER_URL = `http://localhost:${process.env.DEMO_PROVIDER_PORT ?? 5402}`;
const NETWORK = (process.env.STELLAR_NETWORK ?? "testnet") as "testnet" | "public";

if (!AGENT_SECRET) {
  console.error("Missing DEMO_AGENT_SECRET in .env");
  process.exit(1);
}

console.log("=".repeat(60));
console.log("  Flovia x402-Stellar — Demo Call");
console.log("=".repeat(60));
console.log(`  Provider: ${PROVIDER_URL}/api/rate`);
console.log(`  Network:  ${NETWORK}`);
console.log();

// ─── Paso 1: request sin pago → esperar 402 ──────────────────────
console.log("Step 1 — GET /api/rate (sin pago)...");
const probe = await fetch(`${PROVIDER_URL}/api/rate?pair=EUR/USD`);
console.log(`  Status: ${probe.status} (esperamos 402)`);
if (probe.status !== 402) {
  const body = await probe.json();
  console.log("  Body:", JSON.stringify(body, null, 2));
  console.error("  ERROR: el provider no respondió 402. ¿Está corriendo?");
  process.exit(1);
}
const challenge = await probe.json();
console.log("  Challenge recibido:");
console.log(`    amount:      ${challenge.amount} USDC`);
console.log(`    destination: ${challenge.destination.slice(0, 8)}...`);
console.log(`    memo:        ${challenge.memo}`);
console.log(`    expires_at:  ${challenge.expires_at}`);
console.log();

// ─── Paso 2: pagar y consumir (x402Pay hace todo) ────────────────
console.log("Step 2 — Paying and retrying...");
const t0 = Date.now();

const result = await x402Pay({
  url: `${PROVIDER_URL}/api/rate?pair=EUR/USD`,
  agentSecret: AGENT_SECRET,
  network: NETWORK,
  maxAmountUsdc: 0.01,
});

const elapsed = Date.now() - t0;

// ─── Resultado ───────────────────────────────────────────────────
if (result.response.status !== 200) {
  console.error(`  ERROR: respuesta final fue ${result.response.status}`);
  console.error("  Body:", JSON.stringify(result.data, null, 2));
  process.exit(1);
}

console.log("  Pago enviado y verificado:");
console.log(`    txHash:  ${result.payment.txHash.slice(0, 16)}...`);
console.log(`    amount:  ${result.payment.amount} USDC`);
console.log(`    memo:    ${result.payment.memo}`);
console.log();
console.log("Step 3 — Data recibida del provider:");
console.log("  ", JSON.stringify(result.data, null, 2));
console.log();
console.log("=".repeat(60));
console.log(`  DONE — tiempo end-to-end: ${elapsed}ms`);
console.log(`  Ver en Stellar Expert:`);
console.log(`  https://stellar.expert/explorer/testnet/tx/${result.payment.txHash}`);
console.log("=".repeat(60));

// ─── Ticket 2.6: test de edge cases ──────────────────────────────
console.log("\n--- Edge case: replay (misma tx dos veces) ---");
const dupRes = await fetch(`${PROVIDER_URL}/api/rate?pair=EUR/USD`, {
  headers: {
    "X-PAYMENT": `${result.payment.txHash};memo=${result.payment.memo}`,
  },
});
const dupBody = await dupRes.json();
console.log(`  Status: ${dupRes.status} (esperamos 402)`);
console.log(`  Reason: ${(dupBody as any).error} (esperamos "already_consumed")`);
if ((dupBody as any).error !== "already_consumed") {
  console.warn("  WARN: replay protection no funcionó como esperado");
} else {
  console.log("  OK — replay bloqueado correctamente");
}

// ─── Ticket 2.6: memo inválido ────────────────────────────────────
console.log("\n--- Edge case: memo inválido ---");
const badMemoRes = await fetch(`${PROVIDER_URL}/api/rate?pair=EUR/USD`, {
  headers: {
    "X-PAYMENT": `${result.payment.txHash};memo=fl-0000000000`,
  },
});
const badMemoBody = await badMemoRes.json();
console.log(`  Status: ${badMemoRes.status} (esperamos 402)`);
console.log(`  Reason: ${(badMemoBody as any).error} (esperamos "already_consumed" o "memo_mismatch")`);
if (!["already_consumed", "memo_mismatch"].includes((badMemoBody as any).error)) {
  console.warn("  WARN: memo inválido no fue rechazado como esperado");
} else {
  console.log("  OK — memo inválido rechazado correctamente");
}

// ─── Ticket 2.6: underpayment ──────────────────────────────────────
console.log("\n--- Edge case: underpayment ---");
const probe2 = await fetch(`${PROVIDER_URL}/api/rate?pair=EUR/USD`);
const challenge2 = await probe2.json();

const NETWORK_PASSPHRASE = NETWORK === "testnet" ? Networks.TESTNET : Networks.PUBLIC;
const HORIZON_URL =
  NETWORK === "testnet" ? "https://horizon-testnet.stellar.org" : "https://horizon.stellar.org";
const server = new Horizon.Server(HORIZON_URL);
const agentKp = Keypair.fromSecret(AGENT_SECRET);
const usdc = new Asset(challenge2.asset.code, challenge2.asset.issuer);

const account = await server.loadAccount(agentKp.publicKey());
const underpayTx = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: NETWORK_PASSPHRASE,
})
  .addOperation(
    Operation.payment({
      destination: challenge2.destination,
      asset: usdc,
      amount: "0.001", // menor al requerido (0.005)
    })
  )
  .addMemo(Memo.text(challenge2.memo))
  .setTimeout(60)
  .build();
underpayTx.sign(agentKp);
const underpaySubmit = await server.submitTransaction(underpayTx);

const underpayRes = await fetch(`${PROVIDER_URL}/api/rate?pair=EUR/USD`, {
  headers: {
    "X-PAYMENT": `${underpaySubmit.hash};memo=${challenge2.memo}`,
  },
});
const underpayBody = await underpayRes.json();
console.log(`  Status: ${underpayRes.status} (esperamos 402)`);
console.log(`  Reason: ${(underpayBody as any).error} (esperamos "underpayment")`);
if ((underpayBody as any).error !== "underpayment") {
  console.warn("  WARN: underpayment no fue rechazado como esperado");
} else {
  console.log("  OK — underpayment rechazado correctamente");
}
