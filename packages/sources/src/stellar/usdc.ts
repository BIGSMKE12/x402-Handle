import { Asset } from "@stellar/stellar-sdk";

const USDC_ISSUERS = {
  testnet: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  public: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // Circle
};

export const USDC_ISSUER =
  process.env.STELLAR_NETWORK === "public"
    ? USDC_ISSUERS.public
    : USDC_ISSUERS.testnet;

export const USDC = new Asset("USDC", USDC_ISSUER);

export const usdcInfo = {
  code: "USDC",
  issuer: USDC_ISSUER,
  decimals: 7,
};

export function usdcToStroops(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return Math.round(n * 10 ** 7).toString();
}

export function stroopsToUsdc(stroops: string | number): number {
  const n = typeof stroops === "string" ? Number(stroops) : stroops;
  return n / 10 ** 7;
}
