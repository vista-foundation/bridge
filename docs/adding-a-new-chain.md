# Adding a New Chain to Vista Bridge

This guide walks through adding support for a new blockchain (e.g., Ethereum, Solana) to the bridge.

## Prerequisites

- Familiarity with the target chain's transaction model
- An RPC/API endpoint for the target chain
- A way to monitor the chain for incoming transactions (WebSocket, polling, etc.)
- A way to construct, sign, and submit transactions programmatically

## Step-by-Step

### 1. Add chain type to `ChainConfig`

In `offchain/src/common/chain-interfaces.ts`, add the new chain type:

```typescript
export interface ChainConfig {
  chainType: "cardano" | "evm" | "solana" | "bitcoin" | "YOUR_CHAIN";
  // Add chain-specific optional fields:
  yourChainRpcEndpoint?: string;
  yourChainApiKey?: string;
  // ...
}
```

### 2. Create the Indexer

Create `offchain/src/your-chain-indexer/index.ts`:

```typescript
import type { IChainIndexer } from "../common/chain-interfaces.js";
import type { BridgeRoute } from "../common/route.js";
import type { DepositEvent } from "../common/types.js";

export class YourChainIndexer implements IChainIndexer {
  readonly chainId: string;

  constructor(
    private readonly route: BridgeRoute,
    private readonly relayer: RelayerService,
  ) {
    this.chainId = route.source.chainId;
  }

  get run() {
    return Effect.gen(function* () {
      // 1. Connect to your chain's RPC/WebSocket
      // 2. Watch the deposit addresses in route.source.addresses
      // 3. When a deposit is detected:
      //    - Create a DepositEvent with routeId = route.id
      //    - Call relayer.publishDeposit(event)
      // 4. Handle reconnection on errors
      yield* Effect.never;
    });
  }
}
```

Key requirements:
- Set `deposit.routeId = this.route.id` on every event
- Validate deposits against `route.bridge.minDepositAmount` / `maxTransferAmount`
- Deduplicate by `transactionHash`
- Handle connection errors with retry logic

### 3. Create the Mirror

Create `offchain/src/your-chain-mirror/index.ts`:

```typescript
import type { IChainMirror } from "../common/chain-interfaces.js";

export class YourChainMirror implements IChainMirror {
  readonly chainId: string;

  constructor(
    private readonly route: BridgeRoute,
    private readonly relayer: RelayerService,
  ) {
    this.chainId = route.destination.chainId;
  }

  get run() {
    return Effect.gen(function* () {
      // Poll relayer.getPendingDeposits(route.id) every 5 seconds
      // For each pending deposit:
      //   1. Build a transaction sending (amount - fee) to deposit.senderAddress
      //   2. Sign with the wallet key from route.destination.walletSeed
      //   3. Submit to the chain
      //   4. relayer.updateMirrorStatus(txHash, mirrorHash, "SUBMITTED")
      //   5. Wait for confirmation
      //   6. relayer.updateMirrorStatus(txHash, mirrorHash, "CONFIRMED")
      yield* Effect.never;
    });
  }
}
```

Key requirements:
- Filter deposits by `route.id` (don't process other routes' deposits)
- Deduct `route.bridge.feeAmount` from the mirror amount
- Implement retry logic for submission failures
- Only mark as `CONFIRMED` after actual on-chain confirmation

### 4. Register in the Chain Factory

In `offchain/src/common/chain-factory.ts`:

```typescript
import { YourChainIndexer } from "../your-chain-indexer/index.js";
import { YourChainMirror } from "../your-chain-mirror/index.js";

export function createIndexerForRoute(route, relayer) {
  switch (route.source.chainType) {
    case "cardano": return new CardanoIndexer(route, relayer);
    case "your_chain": return new YourChainIndexer(route, relayer);  // ADD
    default: throw new Error(`Unsupported: ${route.source.chainType}`);
  }
}

export function createMirrorForRoute(route, relayer) {
  switch (route.destination.chainType) {
    case "cardano": return new CardanoMirror(route, relayer);
    case "your_chain": return new YourChainMirror(route, relayer);  // ADD
    default: throw new Error(`Unsupported: ${route.destination.chainType}`);
  }
}
```

### 5. Add a Route Configuration

In your config (`.env` or `routes.json`):

```json
{
  "id": "cardano-to-your-chain",
  "source": {
    "chainId": "cardano-preprod",
    "chainType": "cardano",
    "addresses": ["addr_test1..."]
  },
  "destination": {
    "chainId": "your-chain-testnet",
    "chainType": "your_chain",
    "rpcEndpoint": "https://your-chain-rpc.example.com",
    "addresses": ["0x..."],
    "walletSeed": "your wallet secret"
  }
}
```

### 6. Add Frontend Support (Optional)

If you want users to bridge FROM your chain:
- Add the chain to `NETWORKS` in `frontend/src/lib/app/bridge-data.ts`
- Add wallet connection logic in `BridgePanel.tsx` `handleWalletSelect`
- Add the chain's address validation regex

## What You Don't Need to Change

- **Relayer** — fully chain-agnostic, works with any `DepositEvent`
- **Database** — stores deposits by `routeId`, no chain-specific schema
- **API** — `GET /api/routes` auto-discovers new routes from config
- **TransactionTracker** — polls deposit status, works for any chain

## Testing

1. Write unit tests for your indexer and mirror
2. Create a test wallet for E2E testing (see `offchain/src/api/test-wallet.ts` for the Cardano example)
3. Run the full test suite: `cd offchain && bun run test:all`
