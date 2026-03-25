import type {
  DepositEvent,
  BridgeConfig,
  ProcessedDeposit,
  PendingMirror,
  BridgeState,
  MirrorStatus,
} from "../common/types.js";
import type { BridgeRoute } from "../common/route.js";

// ── Default route ID for tests ─────────────────────────────────────────
export const DEFAULT_ROUTE_ID = "default";

// ── Mock deposit events ────────────────────────────────────────────────

export function mockDepositEvent(
  overrides: Partial<DepositEvent> = {},
): DepositEvent {
  return {
    routeId: DEFAULT_ROUTE_ID,
    transactionHash:
      "abc123def456789012345678901234567890123456789012345678901234abcd",
    senderAddress:
      "addr_test1qpnueplse6f4d55eumh7f3tzp3wx882xk7qs6ydxtynrfsw89vzfjf0v4yca056el40n7pr568rdls6lp6eu0dwek9nqku88yp",
    recipientAddress:
      "addr_test1qpg5fj3gsmt673lpxlpzhum6mrw2z0hyk3u455swep39zdt6yr3r556e70k6uvrj8jyey6jwnaeamenujatxuqs50ljq2mq4xl",
    amount: BigInt(5_000_000),
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
    routeId: DEFAULT_ROUTE_ID,
    transactionHash:
      "processed_tx_hash_0123456789abcdef0123456789abcdef0123456789abcdef01234567",
    processedAt: BigInt(Date.now()),
    mirrorTxHash:
      "mirror_tx_hash_0123456789abcdef0123456789abcdef0123456789abcdef01234567",
    status: 3 as MirrorStatus,
    ...overrides,
  };
}

export function mockPendingMirror(
  overrides: Partial<PendingMirror> = {},
): PendingMirror {
  return {
    routeId: DEFAULT_ROUTE_ID,
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

// ── Mock bridge route ──────────────────────────────────────────────────

export function mockBridgeRoute(
  overrides: Partial<BridgeRoute> = {},
): BridgeRoute {
  return {
    id: DEFAULT_ROUTE_ID,
    source: {
      chainId: "cardano-preprod",
      chainType: "cardano",
      name: "preproduction",
      utxorpcEndpoint: "https://cardano-preprod.utxorpc-m1.demeter.run",
      lucidProvider: "https://preprod.koios.rest/api/v1",
      lucidNetwork: "Preprod",
      addresses: [
        "addr_test1qpnueplse6f4d55eumh7f3tzp3wx882xk7qs6ydxtynrfsw89vzfjf0v4yca056el40n7pr568rdls6lp6eu0dwek9nqku88yp",
      ],
    },
    destination: {
      chainId: "cardano-preview",
      chainType: "cardano",
      name: "preview",
      utxorpcEndpoint: "https://cardano-preview.utxorpc-m1.demeter.run",
      lucidProvider: "https://preview.koios.rest/api/v1",
      lucidNetwork: "Preview",
      addresses: [
        "addr_test1qpg5fj3gsmt673lpxlpzhum6mrw2z0hyk3u455swep39zdt6yr3r556e70k6uvrj8jyey6jwnaeamenujatxuqs50ljq2mq4xl",
      ],
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
    ...overrides,
  };
}

// ── Mock bridge config ─────────────────────────────────────────────────

export function mockBridgeConfig(
  overrides: Partial<BridgeConfig> = {},
): BridgeConfig {
  const route = mockBridgeRoute();
  return {
    routes: [route],
    networks: {
      source: {
        name: "preproduction",
        utxorpcEndpoint: "https://cardano-preprod.utxorpc-m1.demeter.run",
        lucidProvider: "https://preprod.koios.rest/api/v1",
        lucidNetwork: "Preproduction",
        depositAddresses: route.source.addresses,
      },
      destination: {
        name: "preview",
        utxorpcEndpoint: "https://cardano-preview.utxorpc-m1.demeter.run",
        lucidProvider: "https://preview.koios.rest/api/v1",
        lucidNetwork: "Preview",
        senderAddresses: route.destination.addresses,
      },
    },
    bridge: route.bridge,
    security: route.security,
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
