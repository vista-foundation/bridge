# Vista Bridge

Open-source cross-chain bridge protocol for Cardano. Enables asset transfers between Cardano networks with real-time deposit detection, automatic mirror transactions, and on-chain confirmation tracking.

**Live and tested** — real ADA transfers verified between Cardano Preprod and Preview testnets with full E2E automated testing.

## Features

- **Bidirectional bridging** — Preprod ↔ Preview (extensible to any Cardano network pair)
- **Real-time deposit detection** via UTXORPC watch streams
- **Automatic mirror transactions** — deposits trigger mirror txs on the destination chain
- **On-chain confirmation tracking** — deposits only marked CONFIRMED after real block confirmation
- **Multi-route architecture** — configure multiple bridge paths from a single instance
- **Chain-agnostic interfaces** — `IChainIndexer` / `IChainMirror` make adding new blockchains straightforward
- **100 automated tests** — 92 unit tests + 8 Playwright E2E tests (including real on-chain transactions)

## Architecture

```
Frontend (Next.js) ──HTTP──▶ Elysia API Server
                                    │
                    ┌────────────────┼────────────────┐
                    │                │                │
             CardanoIndexer      Relayer       CardanoMirror
             (UTXORPC Watch)   (SQLite DB)    (Mesh SDK + UTXORPC)
             per route          shared         per route
```

Each **bridge route** defines a one-way path (e.g., Preprod→Preview). The system spawns an indexer + mirror pair per route. For bidirectional bridging, configure two routes.

See [docs/architecture.md](docs/architecture.md) for the full system design, deposit flow, and provider architecture.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.3+
- Cardano testnet credentials ([Demeter.run](https://demeter.run) for UTXORPC API keys)

### Install

```bash
git clone https://github.com/vista-foundation/bridge.git
cd bridge
bun install
```

### Configure

```bash
cp offchain/config/env.template offchain/.env
# Edit offchain/.env with your UTXORPC API keys, deposit addresses, and wallet seeds
```

For bidirectional bridging, see [docs/route-configuration.md](docs/route-configuration.md).

### Run

```bash
# Terminal 1 — Backend
cd offchain && bun run dev

# Terminal 2 — Frontend
cd frontend && bun run dev
```

- Frontend: http://localhost:3000/app
- API: http://localhost:3001/api/routes

## Project Structure

```
├── frontend/           Next.js 16 bridge UI (React 19, Tailwind, Mesh SDK)
├── offchain/           Effect-TS bridge worker (UTXORPC, Elysia API, SQLite)
│   ├── src/
│   │   ├── cardano-indexer/   CardanoIndexer — watches deposits via UTXORPC
│   │   ├── cardano-mirror/    CardanoMirror — builds + submits mirror txs
│   │   ├── relayer/           Chain-agnostic event bus + SQLite persistence
│   │   ├── api/               Elysia HTTP server (health, routes, state, deposits)
│   │   └── common/            Interfaces, types, config, chain factory
│   └── config/
│       ├── env.template       Environment variable template
│       └── routes.json        Multi-route bridge configuration
├── packages/shared/    @vista-bridge/shared API types
└── docs/               Architecture and integration guides
```

## Testing

```bash
# Unit tests (92 tests)
cd offchain && bun run test        # vitest: config, database, relayer, chain factory
cd offchain && bun run test:api    # bun:test: Elysia API endpoints
cd frontend && bun run test        # vitest: bridge-data, API client

# E2E tests (8 tests — real on-chain transactions)
cd frontend && npx playwright test
```

The E2E suite uses an **injected CIP-30 wallet** that delegates signing to backend test endpoints, enabling fully automated on-chain bridge testing without browser wallet extensions.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Service health check |
| GET | `/api/routes` | All configured bridge routes |
| GET | `/api/config` | First route config (backward compat) |
| GET | `/api/state` | Bridge state — processed/pending counts |
| GET | `/api/deposit/:txHash` | Status of a specific deposit |
| POST | `/api/deposit/register` | Register a deposit (with `routeId`) |

## Adding a New Chain

Vista Bridge is designed to be extended to new blockchains. The chain-agnostic interfaces make it clear what to implement:

1. Create `<chain>-indexer/` implementing `IChainIndexer`
2. Create `<chain>-mirror/` implementing `IChainMirror`
3. Add the chain type to the factory in `chain-factory.ts`
4. Add a route entry in your configuration

See [docs/adding-a-new-chain.md](docs/adding-a-new-chain.md) for the full step-by-step guide.

## Route Configuration

Bridge routes are configured via environment variables (single route) or a JSON file (multiple routes). Secrets (API keys, wallet seeds) are always loaded from environment variables.

See [docs/route-configuration.md](docs/route-configuration.md) for the complete configuration reference.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | [Bun](https://bun.sh/) |
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Effect-TS, Elysia |
| Cardano SDK | Mesh SDK, UTXORPC |
| Database | SQLite |
| Testing | Vitest, Playwright |
| Wallet | CIP-30 (Lace, Eternl, Yoroi + injected test wallet) |

## License

CC-BY-SA-4.0 — [Agrow Labs](https://github.com/vista-foundation)
