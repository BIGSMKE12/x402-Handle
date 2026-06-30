/**
 * Ticket 1.6 — test manual: imprime balances + últimos 5 pagos USDC de una cuenta testnet.
 * Uso: bun apps/cli/scripts/test-stellar.ts <G...>
 */

import { stellar } from "sources";
const { getAccount, listPayments } = stellar;

const account = process.argv[2];
if (!account || !account.startsWith("G")) {
  console.error("Uso: bun apps/cli/scripts/test-stellar.ts <G...>");
  process.exit(1);
}

const acc = await getAccount(account);
console.log("\n=== Account ===");
console.log("ID:", acc.id);
console.log("Sequence:", acc.sequence);
console.log("Balances:");
for (const b of acc.balances) {
  const asset = b.assetCode ? `${b.assetCode}/${b.assetIssuer?.slice(0, 6)}` : "XLM";
  console.log(`  ${asset}: ${b.balance}`);
}

const payments = await listPayments(account, { limit: 5 });
console.log("\n=== Last 5 payments ===");
if (payments.records.length === 0) {
  console.log("  (no payments found)");
} else {
  for (const p of payments.records) {
    const asset = p.assetCode ?? "XLM";
    const dir = p.to === account ? "IN " : "OUT";
    console.log(`  [${dir}] ${p.amount} ${asset} — ${p.createdAt} — tx: ${p.txHash?.slice(0, 12)}...`);
  }
}
