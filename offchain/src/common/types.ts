// Bridge message types corresponding to protobuf definitions

export interface DepositEvent {
  routeId: string; // Which bridge route this deposit belongs to
  transactionHash: string;
  senderAddress: string;
  recipientAddress: string;
  amount: bigint; // Amount in lovelace
  assetType: string; // "ADA" for now, future: policy_id
  blockSlot: bigint;
  blockHash: string;
  outputIndex: number;
  metadata: Record<string, string>; // Transaction metadata
  timestamp: bigint;
}

export interface MirrorRequest {
  depositTxHash: string;
  deposit: DepositEvent;
  bridgeId: string;
  retryCount: number;
}

export enum MirrorStatus {
  UNSPECIFIED = 0,
  PENDING = 1,
  SUBMITTED = 2,
  CONFIRMED = 3,
  FAILED = 4,
}

export interface MirrorResponse {
  mirrorTxHash: string;
  status: MirrorStatus;
  errorMessage?: string;
  feePaid: bigint;
}

export interface ProcessedDeposit {
  routeId: string;
  transactionHash: string;
  processedAt: bigint;
  mirrorTxHash: string;
  status: MirrorStatus;
}

export interface PendingMirror {
  routeId: string;
  depositTxHash: string;
  deposit: DepositEvent;
  retryCount: number;
  lastRetryAt: bigint;
  errorMessage?: string;
}

export interface BridgeState {
  processedDeposits: ProcessedDeposit[];
  pendingMirrors: PendingMirror[];
  lastProcessedSlot: bigint;
  lastProcessedBlockHash: string;
}

export interface HealthCheckRequest {
  serviceName: string;
}

export interface HealthCheckResponse {
  healthy: boolean;
  statusMessage: string;
  metrics: Record<string, string>;
}

// Network and address configuration types
export interface NetworkConfig {
  name: string;
  utxorpcEndpoint: string;
  lucidProvider: string;
  lucidNetwork: string;
  depositAddresses?: string[]; // For source network
  senderAddresses?: string[]; // For destination network
}

import type { BridgeRoute } from "./route.js";

export interface BridgeConfig {
  routes: BridgeRoute[];
  // Legacy fields kept for backward compat with existing code that reads them
  networks: {
    source: NetworkConfig;
    destination: NetworkConfig;
  };
  bridge: {
    allowedAssets: string[];
    minDepositAmount: string;
    maxTransferAmount: string;
    feeAmount: string;
  };
  security: {
    requiredConfirmations: number;
    retryAttempts: number;
    retryDelayMs: number;
  };
  grpc: {
    indexerPort: number;
    relayerPort: number;
    mirrorPort: number;
  };
  api: {
    port: number;
  };
}

// Asset types
export interface AssetAmount {
  policyId: string; // Empty string for ADA
  assetName: string; // Empty string for ADA
  amount: bigint;
}

// Address management types
export interface AddressKeypair {
  address: string;
  privateKey: string;
  publicKey: string;
}

export interface MultiSigAddress {
  address: string;
  signers: string[]; // Public keys
  requiredSignatures: number;
}

// Error types
export class BridgeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}

export class IndexerError extends BridgeError {
  constructor(message: string, details?: any) {
    super(message, 'INDEXER_ERROR', details);
    this.name = 'IndexerError';
  }
}

export class MirrorError extends BridgeError {
  constructor(message: string, details?: any) {
    super(message, 'MIRROR_ERROR', details);
    this.name = 'MirrorError';
  }
}

export class RelayerError extends BridgeError {
  constructor(message: string, details?: any) {
    super(message, 'RELAYER_ERROR', details);
    this.name = 'RelayerError';
  }
} 