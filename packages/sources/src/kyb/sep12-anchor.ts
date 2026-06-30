// SEP-12 KYC API integration.
// https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md
// En hackathon: stub. En mes 1-3: implementación completa.

import { fetchWithRetry } from "../transport";

export async function querySep12Anchor(opts: {
  anchorBaseUrl: string;
  account: string;
  jwt: string;
}) {
  const res = await fetchWithRetry(
    `${opts.anchorBaseUrl}/customer?account=${opts.account}`,
    { headers: { Authorization: `Bearer ${opts.jwt}` } }
  );
  if (!res.ok) return null;
  return await res.json();
}
