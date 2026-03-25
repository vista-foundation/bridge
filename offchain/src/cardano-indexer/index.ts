import { Effect, Context, Layer, Stream } from "effect";
import type { DepositEvent } from "../common/types.js";
import { IndexerError } from "../common/types.js";
import { Utxorpc } from "../common/utxorpc.js";
import { Relayer } from "../relayer/index.js";
import { Config } from "../common/config.js";

// Define an Indexer Service using Context.Tag
export class Indexer extends Context.Tag("Indexer")<Indexer, {
  readonly run: Effect.Effect<never, IndexerError>;
}>() {}

// Indexer service implementation
const makeIndexerService = (
  config: Context.Tag.Service<Config>,
  utxorpc: Context.Tag.Service<Utxorpc>,
  relayer: Context.Tag.Service<Relayer>
): Effect.Effect<Context.Tag.Service<Indexer>, IndexerError> =>
  Effect.gen(function* () {
    const processedDeposits = new Set<string>();

    const validateDeposit = (deposit: DepositEvent): Effect.Effect<void, IndexerError> =>
      Effect.gen(function* () {
        const minAmount = BigInt(config.bridge.minDepositAmount);
        const maxAmount = BigInt(config.bridge.maxTransferAmount);

        if (deposit.amount < minAmount) {
          yield* Effect.fail(new IndexerError(`Deposit amount ${deposit.amount} below minimum ${minAmount}`));
        }

        if (deposit.amount > maxAmount) {
          yield* Effect.fail(new IndexerError(`Deposit amount ${deposit.amount} above maximum ${maxAmount}`));
        }

        if (!config.bridge.allowedAssets.includes(deposit.assetType)) {
          yield* Effect.fail(new IndexerError(`Asset type ${deposit.assetType} not allowed`));
        }
      });

    const processDeposit = (deposit: DepositEvent): Effect.Effect<void, IndexerError> =>
      Effect.gen(function* () {
        // Check if already processed
        if (processedDeposits.has(deposit.transactionHash)) {
          return;
        }

        console.log(`💰 Indexer: Found deposit ${deposit.transactionHash} - ${deposit.amount} lovelace`);

        // Validate deposit
        yield* validateDeposit(deposit);

        // Mark as processed
        processedDeposits.add(deposit.transactionHash);

        // Publish to relayer
        const result = yield* relayer.publishDeposit(deposit).pipe(
          Effect.mapError((error) => new IndexerError(`Failed to publish deposit: ${error.message}`, error))
        );
        
        if (result.success) {
          console.log(`✅ Indexer: Processed deposit ${deposit.transactionHash}`);
        } else {
          yield* Effect.fail(new IndexerError(`Failed to publish deposit ${deposit.transactionHash}`));
        }
      });

    const watchAddresses = Effect.gen(function* () {
      const depositAddresses = config.networks.source.depositAddresses || [];
      
      if (depositAddresses.length === 0) {
        yield* Effect.fail(new IndexerError("No deposit addresses configured"));
      }

      console.log(`🔍 Watching ${depositAddresses.length} addresses on ${config.networks.source.utxorpcEndpoint}`);
      
      // Watch addresses using UTXORPC and process deposits
      const depositStream = utxorpc.watchAddresses(depositAddresses);
      
      yield* depositStream.pipe(
        Stream.mapEffect(processDeposit),
        Stream.catchAll((error) => 
          Effect.gen(function* () {
            console.error("❌ Error watching addresses:", error);
            console.log("⚠️ UTXORPC stream failed. This could be due to:");
            console.log("  1. Network connectivity issues");
            console.log("  2. Invalid API credentials");
            console.log("  3. Endpoint configuration problems");
            console.log("  4. Service unavailability");
            console.log("🔄 Retrying connection in 30 seconds...");
            
            // Wait before retrying
            yield* Effect.sleep("30 seconds");
            
            // Re-throw the error to trigger retry
            return Effect.fail(new IndexerError(`UTXORPC stream error: ${error.message}`));
          })
        ),
        Stream.runDrain
      );
    });

    return {
      run: Effect.gen(function* () {
        console.log("👀 Indexer: Starting to watch for deposits...");
        
        yield* watchAddresses.pipe(
          Effect.catchAll((error) => {
            console.error("❌ Critical indexer error:", error);
            return Effect.fail(new IndexerError(`Indexer failed: ${error}`));
          })
        );
        
        // This should never be reached as watchAddresses runs forever
        yield* Effect.never;
      }) as Effect.Effect<never, IndexerError>
    };
  });

// Create a Layer that provides the Indexer service
export const IndexerLive = Layer.effect(
  Indexer,
  Effect.all([Config, Utxorpc, Relayer]).pipe(
    Effect.flatMap(([config, utxorpc, relayer]) => makeIndexerService(config, utxorpc, relayer))
  )
); 