# Vista Bridge — Claude Code Instructions

## Pre-Commit Review Protocol

Before every `git commit`, you MUST:

1. **Self-review** all your changes thoroughly — check for bugs, security vulnerabilities, performance issues, type errors, missing error handling, and code quality problems
2. Fix any issues you find from your self-review
3. Then attempt the commit — the automated Codex review hook will run automatically

If the Codex review hook blocks your commit with findings:

1. Fix ALL findings reported by Codex
2. Do another self-review of your fixes (don't introduce new bugs while fixing)
3. Retry the commit
4. Repeat until the commit succeeds

Both you AND Codex must agree the changes are clean before a commit goes through.

## Project Structure

Bun monorepo with three workspaces:

- `frontend/` — Next.js 16 bridge UI (React 19, Tailwind, Mesh SDK for Cardano wallets)
- `offchain/` — Effect-TS bridge worker (UTXORPC indexer, Mesh SDK mirror, Elysia API)
- `packages/shared/` — `@vista-bridge/shared` API types shared between frontend and offchain

## Running

```bash
# Install
bun install

# Backend
cd offchain && bun run dev

# Frontend
cd frontend && bun run dev

# Tests
cd offchain && bun run test          # vitest unit tests
cd offchain && bun run test:api      # bun:test API tests (Elysia)
cd frontend && bun run test          # vitest unit tests
cd frontend && bun run test:e2e      # Playwright E2E (starts both servers)
```

## Architecture

- **Indexer**: Watches source chain deposit addresses via UTXORPC, emits `DepositEvent` to Relayer
- **Relayer**: Chain-agnostic event bus + SQLite persistence (pending/processed deposits)
- **Mirror**: Builds mirror txs with MeshWallet (Koios for UTXOs), submits via UTXORPC, waits for on-chain confirmation
- **API**: Elysia server — health, config, routes, state, deposit status/register

## Key Patterns

- Effect-TS for service composition and dependency injection
- `BridgeRoute` defines a one-way bridge path (source chain → destination chain)
- `routeId` on every `DepositEvent`, `PendingMirror`, `ProcessedDeposit`
- `IChainIndexer` / `IChainMirror` interfaces — implement per blockchain
- UTXORPC for chain monitoring + tx submission, Koios only for UTXO queries (UTXORPC query has protobuf compat issues with Demeter endpoints)

## Credentials

- `.env` files are gitignored — copy from `offchain/config/env.template`
- `.env.test` has E2E test wallet seed (Preprod)
- UTXORPC API keys from Demeter.run
- Wallet seeds for mirror signing
