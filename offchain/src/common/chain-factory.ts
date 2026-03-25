import type { IChainIndexer, IChainMirror } from "./chain-interfaces.js";
import type { BridgeRoute } from "./route.js";
import { CardanoIndexer } from "../cardano-indexer/index.js";
import { CardanoMirror } from "../cardano-mirror/index.js";

// ── Relayer service type (minimal interface needed by factories) ────────
interface RelayerService {
  publishDeposit: (event: import("./types.js").DepositEvent) => import("effect").Effect.Effect<{ success: boolean; messageId: string }, Error>;
  subscribeToDeposits: import("effect").Stream.Stream<import("./types.js").DepositEvent, Error>;
  updateMirrorStatus: (depositTxHash: string, mirrorTxHash: string, status: string, errorMessage?: string) => import("effect").Effect.Effect<boolean, Error>;
  getBridgeState: (routeId?: string) => import("effect").Effect.Effect<import("./types.js").BridgeState, Error>;
  getPendingDeposits: (routeId?: string) => import("effect").Effect.Effect<import("./types.js").DepositEvent[], Error>;
}

/**
 * Creates the appropriate chain indexer for a bridge route.
 * Add new chain types here as they are implemented.
 */
export function createIndexerForRoute(
  route: BridgeRoute,
  relayer: RelayerService,
): IChainIndexer {
  switch (route.source.chainType) {
    case "cardano":
      return new CardanoIndexer(route, relayer);
    default:
      throw new Error(
        `Unsupported source chain type: ${route.source.chainType} (route: ${route.id})`,
      );
  }
}

/**
 * Creates the appropriate chain mirror for a bridge route.
 * Add new chain types here as they are implemented.
 */
export function createMirrorForRoute(
  route: BridgeRoute,
  relayer: RelayerService,
): IChainMirror {
  switch (route.destination.chainType) {
    case "cardano":
      return new CardanoMirror(route, relayer);
    default:
      throw new Error(
        `Unsupported destination chain type: ${route.destination.chainType} (route: ${route.id})`,
      );
  }
}
