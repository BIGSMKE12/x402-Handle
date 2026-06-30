// MOCK_KYB: Reemplazar en mes 1-3 por integración real con SEP-12 anchor.

type KybRecord = {
  providerId: string;
  status: "verified" | "pending" | "none";
  kybProvider?: string;
  kybTier?: 1 | 2 | 3;
  verifiedAt?: string;
};

const MOCKS: Record<string, KybRecord> = {};

export async function getKybStatus(providerId: string): Promise<KybRecord> {
  console.warn(`[MOCK_KYB] fetching ${providerId}`);
  return MOCKS[providerId] ?? { providerId, status: "none" };
}

export async function setKybStatus(rec: KybRecord) {
  MOCKS[rec.providerId] = rec;
}
