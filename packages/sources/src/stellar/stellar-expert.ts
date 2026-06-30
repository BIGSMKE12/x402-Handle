import { fetchWithRetry } from "../transport";

const BASE =
  process.env.STELLAR_NETWORK === "public"
    ? "https://api.stellar.expert/explorer/public"
    : "https://api.stellar.expert/explorer/testnet";

export async function getAccountProfile(publicKey: string) {
  const res = await fetchWithRetry(
    `${BASE}/account/${publicKey}`,
    {},
    { retries: 2, timeoutMs: 5000 }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as any;
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
