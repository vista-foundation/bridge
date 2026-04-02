// ── Network definitions ──────────────────────────────────────────────
export interface Network {
  id: string;
  name: string;
  image: string;
  /** Address format regex for validation */
  addressRegex: RegExp;
  /** Human-readable address prefix hint */
  addressHint: string;
  /** Wallet type required */
  walletType: "evm" | "cardano" | "bitcoin" | "solana" | "bnb" | "ton" | "xrp";
}

export const NETWORKS: Network[] = [
  {
    id: "cardano",
    name: "Cardano",
    image: "/assets/tokens/cardano.png",
    addressRegex: /^addr[0-9a-z_]+$/i,
    addressHint: "addr...",
    walletType: "cardano",
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    image: "/assets/tokens/bitcoin.png",
    addressRegex: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
    addressHint: "bc1... / 1... / 3...",
    walletType: "bitcoin",
  },
  {
    id: "ethereum",
    name: "Ethereum",
    image: "/assets/tokens/ethereum.png",
    addressRegex: /^0x[a-fA-F0-9]{40}$/,
    addressHint: "0x...",
    walletType: "evm",
  },
  {
    id: "solana",
    name: "Solana",
    image: "/assets/tokens/solana.png",
    addressRegex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    addressHint: "Base58 address",
    walletType: "solana",
  },
  {
    id: "bnb",
    name: "BNB Chain",
    image: "/assets/tokens/bnb.png",
    addressRegex: /^0x[a-fA-F0-9]{40}$/,
    addressHint: "0x...",
    walletType: "evm",
  },
  {
    id: "agrologos",
    name: "Agrologos",
    image: "/assets/tokens/agrologos.svg",
    addressRegex: /^agro[0-9a-z]{38,58}$/i,
    addressHint: "agro...",
    walletType: "evm",
  },
];

// ─────────────────────────────────────────────────────────────────────
// ── Vista Bridge Naming Schema ───────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────
//
//  Prefix: "v"  = Vista Bridge wrapped asset
//
//  Pattern:  v{SYMBOL}  (lowercase "v", uppercase symbol)
//
//  Examples:
//    BTC  bridged TO Cardano   →  vBTC      (Vista-wrapped Bitcoin)
//    ETH  bridged TO Cardano   →  vETH      (Vista-wrapped Ether)
//    ADA  bridged TO Ethereum  →  vADA      (Vista-wrapped ADA)
//    ADA  bridged TO Bitcoin   →  vADA
//    SOL  bridged TO Cardano   →  vSOL      (Vista-wrapped Solana)
//    BNB  bridged TO Ethereum  →  vBNB      (Vista-wrapped BNB)
//    HOSKY bridged TO Ethereum →  vHOSKY    (Vista-wrapped HOSKY)
//
//  Stablecoins (USDT, USDC) bridge as themselves — no wrapping needed
//  since they already exist natively on multiple chains.
//
//  The "v" prefix is unique to Vista Bridge and immediately tells users
//  the asset was bridged through the Vista protocol.
// ─────────────────────────────────────────────────────────────────────

// ── Token definitions (per network) ──────────────────────────────────
export interface Token {
  symbol: string;
  name: string;
  image: string;
  bgColor: string;
  /** Which networks this token is natively available on */
  networks: string[];
  /** Is this a Vista Bridge wrapped token? */
  isWrapped?: boolean;
}

// Native tokens — exist on their home chains
export const TOKENS: Token[] = [
  { symbol: "ADA", name: "Cardano", image: "/assets/tokens/ada.png", bgColor: "#ffffff", networks: ["cardano"] },
  { symbol: "HOSKY", name: "Hosky", image: "/assets/tokens/hosky.png", bgColor: "#226dd3", networks: ["cardano"] },
  { symbol: "BTC", name: "Bitcoin", image: "/assets/tokens/bitcoin.png", bgColor: "#f7931a", networks: ["bitcoin"] },
  { symbol: "ETH", name: "Ethereum", image: "/assets/tokens/ethereum.png", bgColor: "#627eea", networks: ["ethereum"] },
  { symbol: "USDT", name: "Tether", image: "/assets/tokens/usdt.png", bgColor: "#26a17b", networks: ["ethereum", "bnb", "solana", "cardano"] },
  { symbol: "USDC", name: "USD Coin", image: "/assets/tokens/usdt.png", bgColor: "#2775ca", networks: ["ethereum", "bnb", "solana", "cardano"] },
  { symbol: "SOL", name: "Solana", image: "/assets/tokens/solana.png", bgColor: "#000000", networks: ["solana"] },
  { symbol: "BNB", name: "BNB", image: "/assets/tokens/bnb.png", bgColor: "#f0b90b", networks: ["bnb"] },
];

// Vista-wrapped tokens — exist on destination chains after bridging
export const WRAPPED_TOKENS: Token[] = [
  // Wrapped versions on Cardano
  { symbol: "vBTC", name: "Vista Bitcoin", image: "/assets/tokens/bitcoin.png", bgColor: "#f7931a", networks: ["cardano"], isWrapped: true },
  { symbol: "vETH", name: "Vista Ether", image: "/assets/tokens/ethereum.png", bgColor: "#627eea", networks: ["cardano"], isWrapped: true },
  { symbol: "vSOL", name: "Vista Solana", image: "/assets/tokens/solana.png", bgColor: "#000000", networks: ["cardano"], isWrapped: true },
  { symbol: "vBNB", name: "Vista BNB", image: "/assets/tokens/bnb.png", bgColor: "#f0b90b", networks: ["cardano"], isWrapped: true },
  // Wrapped versions on Ethereum
  { symbol: "vADA", name: "Vista ADA", image: "/assets/tokens/ada.png", bgColor: "#ffffff", networks: ["ethereum"], isWrapped: true },
  { symbol: "vBTC", name: "Vista Bitcoin", image: "/assets/tokens/bitcoin.png", bgColor: "#f7931a", networks: ["ethereum"], isWrapped: true },
  { symbol: "vHOSKY", name: "Vista HOSKY", image: "/assets/tokens/hosky.png", bgColor: "#226dd3", networks: ["ethereum"], isWrapped: true },
  // Wrapped versions on Bitcoin
  { symbol: "vADA", name: "Vista ADA", image: "/assets/tokens/ada.png", bgColor: "#ffffff", networks: ["bitcoin"], isWrapped: true },
  { symbol: "vETH", name: "Vista Ether", image: "/assets/tokens/ethereum.png", bgColor: "#627eea", networks: ["bitcoin"], isWrapped: true },
  // Wrapped versions on Solana
  { symbol: "vADA", name: "Vista ADA", image: "/assets/tokens/ada.png", bgColor: "#ffffff", networks: ["solana"], isWrapped: true },
  { symbol: "vBTC", name: "Vista Bitcoin", image: "/assets/tokens/bitcoin.png", bgColor: "#f7931a", networks: ["solana"], isWrapped: true },
  // Wrapped versions on BNB Chain
  { symbol: "vADA", name: "Vista ADA", image: "/assets/tokens/ada.png", bgColor: "#ffffff", networks: ["bnb"], isWrapped: true },
  { symbol: "vETH", name: "Vista Ether", image: "/assets/tokens/ethereum.png", bgColor: "#627eea", networks: ["bnb"], isWrapped: true },
  // Wrapped versions on Agrologos
  { symbol: "vADA", name: "Vista ADA", image: "/assets/tokens/ada.png", bgColor: "#ffffff", networks: ["agrologos"], isWrapped: true },
  { symbol: "vETH", name: "Vista Ether", image: "/assets/tokens/ethereum.png", bgColor: "#627eea", networks: ["agrologos"], isWrapped: true },
  { symbol: "vBTC", name: "Vista Bitcoin", image: "/assets/tokens/bitcoin.png", bgColor: "#f7931a", networks: ["agrologos"], isWrapped: true },
];

/** Get native tokens available for bridging on a given network */
export function getTokensForNetwork(networkId: string): Token[] {
  return TOKENS.filter((t) => t.networks.includes(networkId));
}

/** Get ALL tokens that could appear in a wallet on a given network (native + wrapped) */
export function getAllTokensForNetwork(networkId: string): Token[] {
  const native = TOKENS.filter((t) => t.networks.includes(networkId));
  // De-dupe wrapped tokens by symbol for this network
  const seen = new Set(native.map((t) => t.symbol));
  const wrapped = WRAPPED_TOKENS.filter((t) => {
    if (!t.networks.includes(networkId)) return false;
    if (seen.has(t.symbol)) return false;
    seen.add(t.symbol);
    return true;
  });
  return [...native, ...wrapped];
}

// ── Wallet balance type ──────────────────────────────────────────────
export interface WalletBalance {
  symbol: string;
  balance: string;
}

/** Placeholder balances shown when wallet is not connected or backend is unavailable */
export const EMPTY_BALANCES: WalletBalance[] = [];

/** Build inventory items for a connected wallet on a given network */
export interface InventoryItem {
  symbol: string;
  name: string;
  balance: string;
  image: string;
  bgColor: string;
  isWrapped: boolean;
}

export function getInventoryForNetwork(
  networkId: string,
  balances: WalletBalance[] = [],
): InventoryItem[] {
  const allTokens = getAllTokensForNetwork(networkId);

  return balances.map((bal) => {
    const token = allTokens.find((t) => t.symbol === bal.symbol);
    return {
      symbol: bal.symbol,
      name: token?.name ?? bal.symbol,
      balance: bal.balance,
      image: token?.image ?? "/assets/tokens/ada.png",
      bgColor: token?.bgColor ?? "#555555",
      isWrapped: token?.isWrapped ?? bal.symbol.startsWith("v"),
    };
  });
}

// ── Bridging / wrapping logic (Vista "v" prefix) ─────────────────────
export interface BridgeResult {
  outputSymbol: string;
  description: string;
}

/**
 * Determines what token is produced on the destination chain using
 * the Vista Bridge v-prefix naming schema.
 */
export function getBridgeResult(
  token: Token,
  fromNetworkId: string,
  toNetworkId: string
): BridgeResult {
  if (fromNetworkId === toNetworkId) {
    return { outputSymbol: token.symbol, description: "Same network transfer" };
  }

  const sym = token.symbol.toUpperCase();

  // Stablecoins bridge as themselves
  if (sym === "USDT" || sym === "USDC") {
    return {
      outputSymbol: token.symbol,
      description: `${token.symbol} bridged to ${getNetworkName(toNetworkId)}`,
    };
  }

  // If the token is already a Vista-wrapped token (vXYZ), unwrap to the base
  // e.g. vBTC on Cardano -> Bitcoin  = BTC (unwrap)
  //      vADA on Ethereum -> Cardano = ADA (unwrap)
  if (sym.startsWith("V") && token.isWrapped) {
    const baseSymbol = sym.slice(1); // "vBTC" -> "BTC"
    const baseToken = TOKENS.find((t) => t.symbol.toUpperCase() === baseSymbol);
    if (baseToken && baseToken.networks.includes(toNetworkId)) {
      return {
        outputSymbol: baseToken.symbol,
        description: `Unwrap ${token.symbol} back to native ${baseToken.symbol} on ${getNetworkName(toNetworkId)}`,
      };
    }
    // Wrapped to another non-native chain stays wrapped
    return {
      outputSymbol: token.symbol,
      description: `${token.symbol} bridged to ${getNetworkName(toNetworkId)}`,
    };
  }

  // Native token -> different chain = wrap with v-prefix
  return {
    outputSymbol: `v${token.symbol}`,
    description: `${token.symbol} wrapped as v${token.symbol} on ${getNetworkName(toNetworkId)} via Vista Bridge`,
  };
}

function getNetworkName(id: string): string {
  return NETWORKS.find((n) => n.id === id)?.name ?? id;
}

// ── Address validation ───────────────────────────────────────────────
export function validateAddress(
  address: string,
  network: Network
): { valid: boolean; error?: string } {
  if (!address.trim()) {
    return { valid: false, error: "Please enter a receiver address" };
  }

  if (!network.addressRegex.test(address.trim())) {
    return {
      valid: false,
      error: `Invalid ${network.name} address. Expected format: ${network.addressHint}`,
    };
  }

  return { valid: true };
}
