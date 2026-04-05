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
  /** Amount in smallest unit (lovelace for ADA, raw quantity for tokens) */
  amount: string;
  senderAddress: string;
  recipientAddress: string;
  errorMessage?: string;
  /** Unix timestamp in ms (as string) */
  timestamp: string;
  /** Asset being bridged — "ADA" if omitted */
  assetType?: string;
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
  /** Amount in smallest unit (lovelace for ADA, raw quantity for tokens) */
  amount: string;
  sourceNetwork: string;
  /** Route ID for multi-route bridges (optional, defaults to first route) */
  routeId?: string;
  /** Asset being bridged — "ADA" if omitted (backward compat) */
  assetType?: string;
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

// ── Bridge routes ──────────────────────────────────────────────────────

/** Per-asset configuration exposed to the frontend */
export interface ApiAssetConfig {
  symbol: string;
  /** policyId+assetNameHex on source chain ("" for ADA) */
  sourceUnit: string;
  /** policyId+assetNameHex on destination chain ("" for ADA) */
  destinationUnit: string;
  /** "send" = transfer from wallet balance, "mint" = mint via native script */
  destinationAction: "send" | "mint";
  minDepositAmount: string;
  maxTransferAmount: string;
  /** Fee in lovelace */
  feeLovelace: string;
  /** Token decimals for display */
  decimals: number;
}

export interface ApiBridgeRoute {
  id: string;
  sourceNetwork: string;
  sourceChainId: string;
  destinationNetwork: string;
  destinationChainId: string;
  depositAddresses: string[];
  allowedAssets: string[];
  minDepositAmount: string;
  maxTransferAmount: string;
  feeAmount: string;
  requiredConfirmations: number;
  /** Per-asset configs (undefined = ADA-only route using top-level defaults) */
  assetConfigs?: ApiAssetConfig[];
}

export interface ApiBridgeRoutesResponse {
  routes: ApiBridgeRoute[];
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
