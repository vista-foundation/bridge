// ── JSON-safe API types for HTTP transport ─────────────────────────────
// All bigint fields from the backend are serialized as strings.

export interface ApiBridgeConfig {
  sourceNetwork: string;
  destinationNetwork: string;
  allowedAssets: string[];
  /** Minimum deposit in lovelace (as string) */
  minDepositAmount: string;
  /** Maximum transfer in lovelace (as string) */
  maxTransferAmount: string;
  /** Bridge fee in lovelace (as string) */
  feeAmount: string;
  /** Addresses where users should send deposits */
  depositAddresses: string[];
  /** Block confirmations required */
  requiredConfirmations: number;
}

export type DepositStatusType = "PENDING" | "SUBMITTED" | "CONFIRMED" | "FAILED";

export interface ApiDepositStatus {
  depositTxHash: string;
  mirrorTxHash: string;
  status: DepositStatusType;
  /** Amount in lovelace (as string) */
  amount: string;
  senderAddress: string;
  recipientAddress: string;
  errorMessage?: string;
  /** Unix timestamp in ms (as string) */
  timestamp: string;
}

export interface ApiBridgeState {
  processedCount: number;
  pendingCount: number;
  lastProcessedSlot: string;
  recentDeposits: ApiDepositStatus[];
}

export interface ApiHealthResponse {
  healthy: boolean;
  services: {
    indexer: boolean;
    relayer: boolean;
    mirror: boolean;
  };
  uptime: number;
}

export interface ApiRegisterDepositRequest {
  depositTxHash: string;
  senderAddress: string;
  recipientAddress: string;
  /** Amount in lovelace (as string) */
  amount: string;
  sourceNetwork: string;
}

export interface ApiRegisterDepositResponse {
  success: boolean;
  bridgeId: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
}

export interface ApiBalanceAsset {
  /** "lovelace" for ADA, or policyId.assetName hex for native tokens */
  unit: string;
  /** Human-readable symbol (e.g. "ADA", "HOSKY") */
  symbol: string;
  /** Raw quantity as string */
  quantity: string;
}

export interface ApiBalanceResponse {
  address: string;
  network: string;
  assets: ApiBalanceAsset[];
  /** Total ADA balance (lovelace as string) */
  lovelace: string;
}
