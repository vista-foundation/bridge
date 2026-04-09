import { Effect, Stream, Schedule } from "effect";
import { CardanoWatchClient } from "@utxorpc/sdk";
import type { IChainIndexer } from "../common/chain-interfaces.js";
import type { BridgeRoute } from "../common/route.js";
import { getAssetConfig } from "../common/route.js";
import type { DepositEvent } from "../common/types.js";
import { IndexerError } from "../common/types.js";
import { addressToBytes, extractDepositsFromTx } from "../common/utxorpc.js";

// Minimal relayer interface needed by the indexer
interface RelayerService {
  publishDeposit: (event: DepositEvent) => Effect.Effect<{ success: boolean; messageId: string }, Error>;
}

/**
 * Cardano-specific chain indexer.
 * Watches deposit addresses via UTXORPC and publishes DepositEvents to the relayer.
 */
export class CardanoIndexer implements IChainIndexer {
  readonly chainId: string;

  constructor(
    private readonly route: BridgeRoute,
    private readonly relayer: RelayerService,
  ) {
    this.chainId = route.source.chainId;
  }

  get run(): Effect.Effect<never, Error> {
    const { route, relayer } = this;
    // Dedup by tx hash — downstream pipeline (relayer, mirror, DB) keys on tx hash only
    const processedTxHashes = new Set<string>();

    // Build a map of on-chain unit → symbol for token extraction
    const allowedAssetUnits = new Map<string, string>();
    if (route.bridge.assetConfigs) {
      for (const [symbol, cfg] of Object.entries(route.bridge.assetConfigs)) {
        if (cfg.sourceUnit) {
          allowedAssetUnits.set(cfg.sourceUnit, symbol);
        }
      }
    }

    const validateDeposit = (deposit: DepositEvent): Effect.Effect<void, IndexerError> =>
      Effect.gen(function* () {
        if (!route.bridge.allowedAssets.includes(deposit.assetType)) {
          return yield* Effect.fail(new IndexerError(`Asset ${deposit.assetType} not allowed`));
        }
        const assetCfg = getAssetConfig(route, deposit.assetType);
        const minAmount = BigInt(assetCfg.minDepositAmount);
        const maxAmount = BigInt(assetCfg.maxTransferAmount);

        if (deposit.amount < minAmount) {
          return yield* Effect.fail(new IndexerError(`Amount ${deposit.amount} below min ${minAmount}`));
        }
        if (deposit.amount > maxAmount) {
          return yield* Effect.fail(new IndexerError(`Amount ${deposit.amount} above max ${maxAmount}`));
        }
      });

    const processDeposit = (deposit: DepositEvent): Effect.Effect<void, IndexerError> =>
      Effect.gen(function* () {
        if (processedTxHashes.has(deposit.transactionHash)) return;

        // Tag with route ID
        deposit.routeId = route.id;

        console.log(`💰 Indexer [${route.id}]: Deposit ${deposit.transactionHash} — ${deposit.amount} lovelace`);
        yield* validateDeposit(deposit);

        processedTxHashes.add(deposit.transactionHash);

        const result = yield* relayer.publishDeposit(deposit).pipe(
          Effect.mapError((e) => new IndexerError(`Publish failed: ${e.message}`, e)),
        );

        if (result.success) {
          console.log(`✅ Indexer [${route.id}]: Published ${deposit.transactionHash}`);
        } else {
          return yield* Effect.fail(new IndexerError(`Publish failed for ${deposit.transactionHash}`));
        }
      });

    return Effect.gen(function* () {
      const depositAddresses = route.source.addresses;
      if (depositAddresses.length === 0) {
        return yield* Effect.fail(new IndexerError(`No deposit addresses for route ${route.id}`));
      }

      // Create UTXORPC watch client for source chain
      const headers: Record<string, string> = {};
      if (route.source.utxorpcApiKey) {
        headers["dmtr-api-key"] = route.source.utxorpcApiKey;
      }

      const watchClient = new CardanoWatchClient({
        uri: route.source.utxorpcEndpoint!,
        ...(Object.keys(headers).length > 0 && { headers }),
      });

      console.log(`👀 Indexer [${route.id}]: Watching ${depositAddresses.length} addresses on ${route.source.utxorpcEndpoint}`);

      // Watch addresses and process deposits
      const depositStream = Stream.async<DepositEvent, IndexerError>((emit) => {
        for (const address of depositAddresses) {
          const addrBytes = addressToBytes(address);

          (async () => {
            try {
              const txEvents = watchClient.watchTxForAddress(addrBytes);
              for await (const event of txEvents) {
                if (event.action === "apply" && event.Tx) {
                  const deposits = await extractDepositsFromTx(event.Tx, address, allowedAssetUnits);
                  for (const dep of deposits) {
                    dep.routeId = route.id;
                    emit.single(dep);
                  }
                }
              }
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              emit.fail(new IndexerError(`Watch stream failed: ${msg}`, error));
            }
          })();
        }

        return Effect.sync(() => {});
      });

      yield* depositStream.pipe(
        Stream.mapEffect(processDeposit),
        Stream.runDrain,
      );
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          console.log(`🔄 Indexer [${route.id}]: Stream interrupted, reconnecting in 30s...`);
          yield* Effect.sleep("30 seconds");
        }),
      ),
      Effect.repeat(Schedule.forever),
    ) as Effect.Effect<never, Error>;
  }
}
