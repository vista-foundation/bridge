import { describe, it, expect } from "vitest";
import {
  NETWORKS,
  TOKENS,
  WRAPPED_TOKENS,
  EMPTY_BALANCES,
  getTokensForNetwork,
  getAllTokensForNetwork,
  getInventoryForNetwork,
  getBridgeResult,
  validateAddress,
  type WalletBalance,
} from "./bridge-data";

// ── Network definitions ────────────────────────────────────────────────

describe("NETWORKS", () => {
  it("has 5 supported networks", () => {
    expect(NETWORKS).toHaveLength(5);
  });

  it("contains cardano, bitcoin, ethereum, solana, bnb", () => {
    const ids = NETWORKS.map((n) => n.id);
    expect(ids).toContain("cardano");
    expect(ids).toContain("bitcoin");
    expect(ids).toContain("ethereum");
    expect(ids).toContain("solana");
    expect(ids).toContain("bnb");
  });

  it("each network has required fields", () => {
    for (const net of NETWORKS) {
      expect(net.id).toBeTruthy();
      expect(net.name).toBeTruthy();
      expect(net.image).toBeTruthy();
      expect(net.addressRegex).toBeInstanceOf(RegExp);
      expect(net.addressHint).toBeTruthy();
      expect(net.walletType).toBeTruthy();
    }
  });
});

// ── Token definitions ──────────────────────────────────────────────────

describe("TOKENS", () => {
  it("has native tokens", () => {
    expect(TOKENS.length).toBeGreaterThan(0);
  });

  it("ADA is a Cardano native token", () => {
    const ada = TOKENS.find((t) => t.symbol === "ADA");
    expect(ada).toBeDefined();
    expect(ada!.networks).toContain("cardano");
    expect(ada!.isWrapped).toBeFalsy();
  });

  it("stablecoins are multi-network", () => {
    const usdt = TOKENS.find((t) => t.symbol === "USDT");
    expect(usdt).toBeDefined();
    expect(usdt!.networks.length).toBeGreaterThan(1);
  });
});

describe("WRAPPED_TOKENS", () => {
  it("all have isWrapped = true", () => {
    for (const token of WRAPPED_TOKENS) {
      expect(token.isWrapped).toBe(true);
    }
  });

  it("all have v-prefix symbols", () => {
    for (const token of WRAPPED_TOKENS) {
      expect(token.symbol.startsWith("v")).toBe(true);
    }
  });
});

// ── getTokensForNetwork ────────────────────────────────────────────────

describe("getTokensForNetwork", () => {
  it("returns ADA and HOSKY for cardano", () => {
    const tokens = getTokensForNetwork("cardano");
    const symbols = tokens.map((t) => t.symbol);
    expect(symbols).toContain("ADA");
    expect(symbols).toContain("HOSKY");
  });

  it("returns BTC for bitcoin", () => {
    const tokens = getTokensForNetwork("bitcoin");
    const symbols = tokens.map((t) => t.symbol);
    expect(symbols).toContain("BTC");
  });

  it("returns empty for unknown network", () => {
    const tokens = getTokensForNetwork("unknown");
    expect(tokens).toHaveLength(0);
  });

  it("does not return wrapped tokens", () => {
    const tokens = getTokensForNetwork("cardano");
    const wrapped = tokens.filter((t) => t.isWrapped);
    expect(wrapped).toHaveLength(0);
  });
});

// ── getAllTokensForNetwork ──────────────────────────────────────────────

describe("getAllTokensForNetwork", () => {
  it("includes both native and wrapped tokens for cardano", () => {
    const tokens = getAllTokensForNetwork("cardano");
    const symbols = tokens.map((t) => t.symbol);
    expect(symbols).toContain("ADA");
    expect(symbols).toContain("vBTC");
    expect(symbols).toContain("vETH");
  });

  it("does not duplicate symbols", () => {
    const tokens = getAllTokensForNetwork("ethereum");
    const symbols = tokens.map((t) => t.symbol);
    const unique = new Set(symbols);
    expect(unique.size).toBe(symbols.length);
  });
});

// ── getInventoryForNetwork ─────────────────────────────────────────────

describe("getInventoryForNetwork", () => {
  it("returns empty for no balances", () => {
    const items = getInventoryForNetwork("cardano", []);
    expect(items).toHaveLength(0);
  });

  it("returns empty by default (EMPTY_BALANCES)", () => {
    const items = getInventoryForNetwork("cardano", EMPTY_BALANCES);
    expect(items).toHaveLength(0);
  });

  it("maps balances to inventory items", () => {
    const balances: WalletBalance[] = [
      { symbol: "ADA", balance: "100.00" },
      { symbol: "vBTC", balance: "0.05" },
    ];
    const items = getInventoryForNetwork("cardano", balances);
    expect(items).toHaveLength(2);

    expect(items[0].symbol).toBe("ADA");
    expect(items[0].balance).toBe("100.00");
    expect(items[0].name).toBe("Cardano");
    expect(items[0].isWrapped).toBe(false);

    expect(items[1].symbol).toBe("vBTC");
    expect(items[1].balance).toBe("0.05");
    expect(items[1].isWrapped).toBe(true);
  });

  it("handles unknown tokens gracefully", () => {
    const balances: WalletBalance[] = [
      { symbol: "UNKNOWN", balance: "999" },
    ];
    const items = getInventoryForNetwork("cardano", balances);
    expect(items).toHaveLength(1);
    expect(items[0].symbol).toBe("UNKNOWN");
    expect(items[0].name).toBe("UNKNOWN");
  });
});

// ── getBridgeResult ────────────────────────────────────────────────────

describe("getBridgeResult", () => {
  const ada = TOKENS.find((t) => t.symbol === "ADA")!;
  const btc = TOKENS.find((t) => t.symbol === "BTC")!;
  const usdt = TOKENS.find((t) => t.symbol === "USDT")!;
  const vBtc = WRAPPED_TOKENS.find(
    (t) => t.symbol === "vBTC" && t.networks.includes("cardano"),
  )!;

  it("same network = same token", () => {
    const result = getBridgeResult(ada, "cardano", "cardano");
    expect(result.outputSymbol).toBe("ADA");
    expect(result.description).toContain("Same network");
  });

  it("native token to different chain = v-prefix", () => {
    const result = getBridgeResult(ada, "cardano", "ethereum");
    expect(result.outputSymbol).toBe("vADA");
    expect(result.description).toContain("wrapped");
  });

  it("BTC to Cardano = vBTC", () => {
    const result = getBridgeResult(btc, "bitcoin", "cardano");
    expect(result.outputSymbol).toBe("vBTC");
  });

  it("stablecoins bridge as themselves", () => {
    const result = getBridgeResult(usdt, "ethereum", "cardano");
    expect(result.outputSymbol).toBe("USDT");
  });

  it("wrapped token to its native chain = unwrap", () => {
    const result = getBridgeResult(vBtc, "cardano", "bitcoin");
    expect(result.outputSymbol).toBe("BTC");
    expect(result.description).toContain("Unwrap");
  });
});

// ── validateAddress ────────────────────────────────────────────────────

describe("validateAddress", () => {
  const cardano = NETWORKS.find((n) => n.id === "cardano")!;
  const ethereum = NETWORKS.find((n) => n.id === "ethereum")!;
  const bitcoin = NETWORKS.find((n) => n.id === "bitcoin")!;

  it("accepts valid Cardano address", () => {
    const result = validateAddress(
      "addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2qd4a6gtmvpt4ks2sggz",
      cardano,
    );
    expect(result.valid).toBe(true);
  });

  it("rejects invalid Cardano address", () => {
    const result = validateAddress("0x1234567890abcdef", cardano);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid");
  });

  it("accepts valid Ethereum address", () => {
    const result = validateAddress(
      "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80",
      ethereum,
    );
    expect(result.valid).toBe(true);
  });

  it("rejects invalid Ethereum address (too short)", () => {
    const result = validateAddress("0x1234", ethereum);
    expect(result.valid).toBe(false);
  });

  it("accepts valid Bitcoin address (bc1)", () => {
    const result = validateAddress(
      "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
      bitcoin,
    );
    expect(result.valid).toBe(true);
  });

  it("rejects empty address", () => {
    const result = validateAddress("", cardano);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("enter a receiver");
  });

  it("rejects whitespace-only address", () => {
    const result = validateAddress("   ", cardano);
    expect(result.valid).toBe(false);
  });
});
