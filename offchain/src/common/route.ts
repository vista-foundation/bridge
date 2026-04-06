import type { ChainConfig } from "./chain-interfaces.js";

/**
 * Per-asset configuration for a bridge route.
 * Defines how a specific token is handled on source and destination chains.
 */
export interface AssetConfig {
  /** policyId+assetNameHex on source chain ("" for ADA/lovelace) */
  sourceUnit: string;
  /** policyId+assetNameHex on destination chain ("" for ADA/lovelace) */
  destinationUnit: string;
  /** What happens on source after deposit: "lock" (hold) or "burn" (destroy via native script) */
  sourceAction?: "lock" | "burn";
  /** "send" = transfer from wallet balance, "mint" = mint via native script */
  destinationAction: "send" | "mint";
  /** For mint/burn: native script type. "sig" = simple key witness */
  mintScriptType?: "sig";
  /** Min deposit in asset's smallest unit */
  minDepositAmount: string;
  /** Max transfer in asset's smallest unit */
  maxTransferAmount: string;
  /** Fee in lovelace. For ADA: deducted from amount. For tokens: separate ADA charge */
  feeLovelace: string;
  /** Token decimals for display (6 for ADA, 0 for HOSKY) */
  decimals: number;
}

/**
 * A bridge route defines a one-way path between two chains.
 * For bidirectional bridging, configure two routes (A→B and B→A).
 */
export interface BridgeRoute {
  /** Unique route identifier, e.g. "preprod-to-preview" */
  id: string;
  /** Source chain — where deposits are watched */
  source: ChainConfig;
  /** Destination chain — where mirror txs are sent */
  destination: ChainConfig;
  /** Bridge parameters for this route */
  bridge: {
    allowedAssets: string[];
    minDepositAmount: string;
    maxTransferAmount: string;
    feeAmount: string;
    /** Per-asset config keyed by symbol (e.g. "HOSKY"). ADA uses route-level defaults. */
    assetConfigs?: Record<string, AssetConfig>;
  };
  /** Security parameters for this route */
  security: {
    requiredConfirmations: number;
    retryAttempts: number;
    retryDelayMs: number;
  };
}

/**
 * Get asset config for a given symbol on a route.
 * Returns explicit config if defined, or synthesized ADA defaults from the route-level fields.
 */
export function getAssetConfig(route: BridgeRoute, symbol: string): AssetConfig {
  if (symbol !== "ADA" && route.bridge.assetConfigs?.[symbol]) {
    return route.bridge.assetConfigs[symbol];
  }
  // ADA defaults from route-level fields
  return {
    sourceUnit: "",
    destinationUnit: "",
    destinationAction: "send",
    minDepositAmount: route.bridge.minDepositAmount,
    maxTransferAmount: route.bridge.maxTransferAmount,
    feeLovelace: route.bridge.feeAmount,
    decimals: 6,
  };
}
