import { Effect } from "effect";

// ── Chain-agnostic interfaces ──────────────────────────────────────────
// Implement these for each blockchain to add bridge support.

/**
 * Watches a source chain for deposit transactions and emits DepositEvents.
 * Each blockchain needs its own implementation (e.g. CardanoIndexer, EvmIndexer).
 */
export interface IChainIndexer {
  /** Unique chain identifier for this indexer instance (e.g. "cardano-preprod") */
  readonly chainId: string;
  /** Long-running effect that watches for deposits and publishes to the relayer */
  readonly run: Effect.Effect<never, Error>;
}

/**
 * Builds, signs, submits, and confirms mirror transactions on a destination chain.
 * Each blockchain needs its own implementation (e.g. CardanoMirror, EvmMirror).
 */
export interface IChainMirror {
  /** Unique chain identifier for this mirror instance (e.g. "cardano-preview") */
  readonly chainId: string;
  /** Long-running effect that processes pending deposits and creates mirror txs */
  readonly run: Effect.Effect<never, Error>;
}

/**
 * Per-chain endpoint and credential configuration.
 * Uses optional fields for chain-specific settings — the `chainType` discriminator
 * tells the factory which implementation to instantiate.
 */
export interface ChainConfig {
  /** Unique identifier, e.g. "cardano-preprod", "ethereum-sepolia" */
  chainId: string;
  /** Discriminator for the chain factory */
  chainType: "cardano" | "evm" | "solana" | "bitcoin";
  /** Human-readable name, e.g. "Cardano Preproduction" */
  name: string;

  // ── Cardano-specific ─────────────────────────────────────────────
  /** UTXORPC gRPC endpoint (Cardano) */
  utxorpcEndpoint?: string;
  /** UTXORPC API key env var name or direct value */
  utxorpcApiKey?: string;
  /** Koios REST URL for MeshWallet UTXO queries (Cardano) */
  lucidProvider?: string;
  /** Lucid network name: "Preprod" | "Preview" | "Mainnet" */
  lucidNetwork?: string;

  // ── EVM-specific (future) ────────────────────────────────────────
  /** JSON-RPC endpoint (EVM, Solana) */
  rpcEndpoint?: string;
  /** Chain ID (EVM) */
  evmChainId?: number;

  // ── Common ───────────────────────────────────────────────────────
  /** Deposit addresses (when used as source) or sender addresses (when used as destination) */
  addresses: string[];
  /** Wallet seed phrase or private key for signing mirror txs (destination only) */
  walletSeed?: string;
}
