# Vista Bridge — Architecture

## Overview

Vista Bridge is a cross-chain bridge protocol that enables asset transfers between Cardano networks (and extensible to other chains). It runs as a Bun monorepo with three workspaces.

## System Diagram

```
                          ┌─────────────────────┐
                          │   Frontend (Next.js) │
                          │   /app page          │
                          │   BridgePanel.tsx     │
                          └─────────┬────────────┘
                                    │ HTTP
                          ┌─────────▼────────────┐
                          │   Elysia API Server   │
                          │   /api/routes         │
                          │   /api/config         │
                          │   /api/state          │
                          │   /api/deposit/*      │
                          └─────────┬────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
    ┌─────────▼──────────┐  ┌──────▼──────┐  ┌──────────▼─────────┐
    │   CardanoIndexer   │  │   Relayer   │  │   CardanoMirror    │
    │   (per route)      │  │   (shared)  │  │   (per route)      │
    │                    │  │             │  │                    │
    │  UTXORPC Watch ────┼─►│  Queue +    │◄─┼── MeshWallet       │
    │  Deposit detection │  │  SQLite DB  │  │   (Koios fetcher)  │
    └────────────────────┘  └─────────────┘  │   U5CProvider      │
                                             │   (UTXORPC submit) │
                                             └────────────────────┘
```

## Workspaces

| Workspace | Path | Purpose |
|-----------|------|---------|
| `frontend` | `frontend/` | Next.js 16 UI — wallet connection, bridge form, tx tracker |
| `offchain` | `offchain/` | Effect-TS bridge worker — indexer, relayer, mirror, API |
| `shared` | `packages/shared/` | `@vista-bridge/shared` — API types shared between workspaces |

## Core Concepts

### Bridge Route

A `BridgeRoute` defines a one-way path: source chain → destination chain. For bidirectional bridging, configure two routes (A→B and B→A).

```typescript
interface BridgeRoute {
  id: string;                 // "preprod-to-preview"
  source: ChainConfig;        // Where deposits are watched
  destination: ChainConfig;   // Where mirror txs are sent
  bridge: { feeAmount, minDepositAmount, maxTransferAmount, allowedAssets };
  security: { requiredConfirmations, retryAttempts, retryDelayMs };
}
```

### Chain Interfaces

```typescript
// Implement per blockchain
interface IChainIndexer {
  chainId: string;
  run: Effect<never, Error>;  // Long-running deposit watcher
}

interface IChainMirror {
  chainId: string;
  run: Effect<never, Error>;  // Long-running mirror tx processor
}
```

### Chain Factory

`chain-factory.ts` maps `chainType` → implementation:

```typescript
createIndexerForRoute(route, relayer) → IChainIndexer
createMirrorForRoute(route, relayer)  → IChainMirror
```

Currently supports `"cardano"`. Add new cases for EVM, Solana, etc.

## Deposit Flow

1. **User** sends ADA to the bridge deposit address (source chain)
2. **CardanoIndexer** detects the deposit via UTXORPC watch stream
3. **Indexer** validates (amount, asset type) and publishes a `DepositEvent` to the **Relayer**
4. **Relayer** stores as `PendingMirror` in SQLite, publishes to queue
5. **CardanoMirror** picks up the deposit, builds a mirror transaction:
   - Uses **MeshWallet** (with KoiosProvider for UTXOs) to construct + sign the tx
   - Submits via **U5CProvider** (UTXORPC) with retry logic
   - Waits for on-chain confirmation
6. **Relayer** moves deposit from `pending_mirrors` → `processed_deposits`
7. **Frontend** polls `/api/deposit/:txHash` and shows status in `TransactionTracker`

## Provider Architecture

| Component | Provider | Protocol | Purpose |
|-----------|----------|----------|---------|
| Indexer | CardanoWatchClient | UTXORPC gRPC | Watch deposit addresses |
| Mirror (submit) | U5CProvider | UTXORPC gRPC | Submit + confirm mirror txs |
| Mirror (build) | KoiosProvider | Koios REST | UTXO queries + protocol params |
| Frontend | CIP-30 Wallet API | Browser extension | Balance, sign, submit |

**Why Koios for tx construction?** The Demeter UTXORPC query service doesn't support UTXO lookups (protobuf compatibility issue). Koios is used only as a read-only fetcher for MeshWallet — all writes go through UTXORPC.

## Database

SQLite with three tables:

| Table | Purpose |
|-------|---------|
| `processed_deposits` | Completed bridge transfers (route_id, tx_hash, mirror_hash, status) |
| `pending_mirrors` | Deposits awaiting mirror tx (route_id, deposit_data, retry_count) |
| `bridge_config` | Key-value metadata (last processed slot per route) |

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Service health check |
| GET | `/api/routes` | All configured bridge routes |
| GET | `/api/config` | First route config (backward compat) |
| GET | `/api/state` | Bridge state (processed/pending counts) |
| GET | `/api/deposit/:txHash` | Status of a specific deposit |
| POST | `/api/deposit/register` | Register a new deposit (with routeId) |

## Testing

- **81 unit tests** (vitest + bun:test) — config, database, relayer, API, shared types, bridge-data, API client
- **8 Playwright E2E tests** — health, config, wallet connect, address validation, full bridge flow
- **Injected CIP-30 wallet** for E2E — delegates signing to backend test endpoints via Koios/Lucid
