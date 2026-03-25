import type { ChainConfig } from "./chain-interfaces.js";

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
  };
  /** Security parameters for this route */
  security: {
    requiredConfirmations: number;
    retryAttempts: number;
    retryDelayMs: number;
  };
}
