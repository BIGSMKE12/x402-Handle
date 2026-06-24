import { describe, expect, test } from "bun:test";
import { networkLabel, networkLabels } from "./network-label";

describe("networkLabel", () => {
  test("maps known CAIP-2 ids to labels", () => {
    expect(networkLabel("eip155:8453")).toBe("Base");
    expect(networkLabel("eip155:84532")).toBe("Base Sepolia");
    expect(networkLabel("eip155:137")).toBe("Polygon");
    expect(networkLabel("eip155:80002")).toBe("Polygon Amoy");
    expect(networkLabel("eip155:196")).toBe("X Layer");
  });

  test("maps solana clusters", () => {
    expect(networkLabel("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")).toBe("Solana");
    expect(networkLabel("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1")).toBe("Solana Devnet");
    expect(networkLabel("solana:anything-else")).toBe("Solana");
  });

  test("is idempotent for already-human values", () => {
    expect(networkLabel("Base")).toBe("Base");
    expect(networkLabel("base")).toBe("Base");
    expect(networkLabel("x-layer")).toBe("X Layer");
  });

  test("collapses unknown chain ids to Other", () => {
    expect(networkLabel("eip155:1952")).toBe("Other");
    expect(networkLabel("eip155:5042002")).toBe("Other");
  });
});

describe("networkLabels", () => {
  test("converts and de-duplicates while preserving order (QuickNode case)", () => {
    expect(
      networkLabels([
        "Base",
        "Solana",
        "Polygon",
        "eip155:1952",
        "eip155:196",
        "eip155:5042002",
        "eip155:80002",
        "eip155:84532",
      ]),
    ).toEqual(["Base", "Solana", "Polygon", "Other", "X Layer", "Polygon Amoy", "Base Sepolia"]);
  });

  test("de-duplicates labels that resolve identically", () => {
    expect(networkLabels(["base", "eip155:8453", "Base"])).toEqual(["Base"]);
  });
});
