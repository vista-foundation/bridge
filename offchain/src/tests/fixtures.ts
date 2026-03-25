import type {
  DepositEvent,
  BridgeConfig,
  ProcessedDeposit,
  PendingMirror,
  BridgeState,
  MirrorStatus,
} from "../common/types.js";

// ── Mock deposit events ────────────────────────────────────────────────

export function mockDepositEvent(
  overrides: Partial<DepositEvent> = {},
): DepositEvent {
  return {
    transactionHash:
      "abc123def456789012345678901234567890123456789012345678901234abcd",
    senderAddress:
      "addr_test1qpnueplse6f4d55eumh7f3tzp3wx882xk7qs6ydxtynrfsw89vzfjf0v4yca056el40n7pr568rdls6lp6eu0dwek9nqku88yp",
    recipientAddress:
      "addr_test1qpg5fj3gsmt673lpxlpzhum6mrw2z0hyk3u455swep39zdt6yr3r556e70k6uvrj8jyey6jwnaeamenujatxuqs50ljq2mq4xl",
    amount: BigInt(5_000_000), // 5 ADA
    assetType: "ADA",
    blockSlot: BigInt(1000),
    blockHash: "blockhash_abc123",
    outputIndex: 0,
    metadata: { destination: "addr_test1..." },
    timestamp: BigInt(Date.now()),
    ...overrides,
  };
}

export function mockProcessedDeposit(
  overrides: Partial<ProcessedDeposit> = {},
): ProcessedDeposit {
  return {
    transactionHash:
      "processed_tx_hash_0123456789abcdef0123456789abcdef0123456789abcdef01234567",
    processedAt: BigInt(Date.now()),
    mirrorTxHash:
      "mirror_tx_hash_0123456789abcdef0123456789abcdef0123456789abcdef01234567",
    status: 3 as MirrorStatus, // CONFIRMED
    ...overrides,
  };
}

export function mockPendingMirror(
  overrides: Partial<PendingMirror> = {},
): PendingMirror {
  return {
    depositTxHash:
      "pending_tx_hash_0123456789abcdef0123456789abcdef0123456789abcdef01234567",
    deposit: mockDepositEvent({
      transactionHash:
        "pending_tx_hash_0123456789abcdef0123456789abcdef0123456789abcdef01234567",
    }),
    retryCount: 0,
    lastRetryAt: BigInt(Date.now()),
    ...overrides,
  };
}

export function mockBridgeState(
  overrides: Partial<BridgeState> = {},
): BridgeState {
  return {
    processedDeposits: [],
    pendingMirrors: [],
    lastProcessedSlot: BigInt(0),
    lastProcessedBlockHash: "genesis",
    ...overrides,
  };
}

// ── Mock bridge config ─────────────────────────────────────────────────

export function mockBridgeConfig(
  overrides: Partial<BridgeConfig> = {},
): BridgeConfig {
  return {
    networks: {
      source: {
        name: "preproduction",
        utxorpcEndpoint: "https://preprod.utxorpc-v0.demeter.run",
        lucidProvider:
          "https://preprod.koios.rest/api/v1",
        lucidNetwork: "Preproduction",
        depositAddresses: [
          "addr_test1qpnueplse6f4d55eumh7f3tzp3wx882xk7qs6ydxtynrfsw89vzfjf0v4yca056el40n7pr568rdls6lp6eu0dwek9nqku88yp",
        ],
      },
      destination: {
        name: "preview",
        utxorpcEndpoint: "https://preview.utxorpc-v0.demeter.run",
        lucidProvider: "https://preview.koios.rest/api/v1",
        lucidNetwork: "Preview",
        senderAddresses: [
          "addr_test1qpg5fj3gsmt673lpxlpzhum6mrw2z0hyk3u455swep39zdt6yr3r556e70k6uvrj8jyey6jwnaeamenujatxuqs50ljq2mq4xl",
        ],
      },
    },
    bridge: {
      allowedAssets: ["ADA"],
      minDepositAmount: "2000000",
      maxTransferAmount: "100000000000",
      feeAmount: "1000000",
    },
    security: {
      requiredConfirmations: 5,
      retryAttempts: 3,
      retryDelayMs: 5000,
    },
    grpc: {
      indexerPort: 50051,
      relayerPort: 50052,
      mirrorPort: 50053,
    },
    api: {
      port: 3001,
    },
    ...overrides,
  };
}
