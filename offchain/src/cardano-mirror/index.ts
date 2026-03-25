// Simple mirror service for processing deposits and creating mirror transactions
import { Effect, Context, Layer, Stream, Schedule } from "effect";
import { Lucid, LucidEvolution, Koios, TxSigned } from "@lucid-evolution/lucid";
// import { CardanoSubmitClient } from "@utxorpc/sdk";
import { DepositEvent } from "../common/types.js";
import { Relayer } from "../relayer/index.js";
// import { Config, getUtxorpcHeaders } from "../common/config.js";
import { Config } from "../common/config.js";

// Mirror Error types
export class MirrorError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "MirrorError";
  }
}

// Define a Mirror Service using Context.Tag
export class Mirror extends Context.Tag("Mirror")<Mirror, {
  readonly run: Effect.Effect<never, MirrorError>;
}>() {}

// Mirror service implementation
const makeMirrorService = (
  relayer: Context.Tag.Service<Relayer>,
  config: Context.Tag.Service<Config>
): Effect.Effect<Context.Tag.Service<Mirror>, MirrorError> =>
  Effect.succeed({
    run: Effect.gen(function* () {
      // Initialize Lucid for destination network
      const initializeLucid = (): Effect.Effect<LucidEvolution, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            console.log(`🔧 Mirror: Initializing Lucid for ${config.networks.destination.name} network`);
            
            // Initialize Lucid with Blockfrost provider
            const lucid = await Lucid(
              new Koios(config.networks.destination.lucidProvider),
              config.networks.destination.lucidNetwork as any
            );

            lucid.selectWallet.fromSeed(process.env.DEST_SENDER_WALLET_SEED || "");

            console.log(`✅ Mirror: Lucid initialized for ${config.networks.destination.name}`);
            return lucid;
          },
          catch: (error) => new MirrorError(`Failed to initialize Lucid: ${error}`, error)
        });

      // Create a real mirror transaction using Lucid
      const createMirrorTransaction = (deposit: DepositEvent, lucid: LucidEvolution): Effect.Effect<{ hash: string; fee: bigint; signedTx: TxSigned }, MirrorError> =>
        Effect.gen(function* () {
          console.log(`🏗️ Mirror: Building real mirror transaction for ${deposit.amount} lovelace`);
          
          // Get sender addresses from config
          const senderAddresses = config.networks.destination.senderAddresses || [];
          if (senderAddresses.length === 0) {
            yield* Effect.fail(new MirrorError("No sender addresses configured for destination network"));
          }

          const senderAddress = senderAddresses[0];
          console.log(`📝 Mirror: Using sender address: ${senderAddress}`);

          // Calculate fee (2 ADA as configured)
          const feeAmount = BigInt(config.bridge.feeAmount);
          const netAmount = deposit.amount - feeAmount;
          
          if (netAmount <= BigInt(1000000)) { // Must leave at least 1 ADA
            yield* Effect.fail(new MirrorError(`Insufficient amount after fees: ${deposit.amount} - ${feeAmount} = ${netAmount} (minimum 1 ADA required)`));
          }

          // Build transaction using Lucid
          const tx = yield* Effect.tryPromise({
            try: async () => {
              const txBuilder = lucid
                .newTx()
                .pay.ToAddress(deposit.senderAddress, { lovelace: netAmount })
                .attachMetadata(1337, {
                  msg: [`VISTA Bridge: Mirroring deposit`, deposit.transactionHash],
                  originalTx: deposit.transactionHash,
                  bridgeVersion: "1.0.0",
                  timestamp: Date.now()
                });

              const completeTx = await txBuilder.complete();
              const signedTx = await completeTx.sign.withWallet().complete();
              console.log(`💎 Mirror: Built transaction with ${netAmount} lovelace to ${deposit.senderAddress}`);
              
              return signedTx;
            },
            catch: (error) => new MirrorError(`Failed to build transaction: ${error}`, error)
          });

          // Get transaction hash before signing
          const txHash = yield* Effect.tryPromise({
            try: async () => {
              return tx.toHash();
            },
            catch: (error) => new MirrorError(`Failed to get transaction hash: ${error}`, error)
          });

          console.log(`🔑 Mirror: Transaction hash: ${txHash}`);
          console.log(`�� Mirror: Net amount: ${netAmount} lovelace, Fee: ${feeAmount} lovelace`);
          
          return {
            hash: txHash,
            fee: feeAmount,
            signedTx: tx // Store for submission
          };
        });

      // Create destination UTXORPC submit client
      // const createDestinationSubmitClient = (): Effect.Effect<CardanoSubmitClient, MirrorError> =>
      //   Effect.try({
      //     try: () => {
      //       const headers = getUtxorpcHeaders('destination');
      //       console.log(`🔧 Mirror: Creating destination UTXORPC client for ${config.networks.destination.utxorpcEndpoint}`);
            
      //       const clientOptions = {
      //         uri: config.networks.destination.utxorpcEndpoint,
      //         ...(headers && { headers }),
      //       };

      //       return new CardanoSubmitClient(clientOptions);
      //     },
      //     catch: (error) => new MirrorError(`Failed to create destination UTXORPC client: ${error}`, error)
      //   });

      // Submit transaction using UTXORPC SubmitClient
      const submitTransaction = (mirrorTx: { hash: string; fee: bigint; signedTx: TxSigned }): Effect.Effect<void, MirrorError> =>
        Effect.gen(function* () {
          console.log(`📡 Mirror: Submitting transaction ${mirrorTx.hash} to ${config.networks.destination.name} network`);
          
          // Create destination submit client
          // const submitClient = yield* createDestinationSubmitClient();
          
          // Sign the transaction with the wallet
          console.log(`🔐 Mirror: Signing transaction ${mirrorTx.hash}...`);
          const signedTx = mirrorTx.signedTx;

          const submittedTxHash = yield* Effect.tryPromise({
            try: async () => {
              const hash = await signedTx.submit();
              return hash;
            },
            catch: (error) => new MirrorError(`Failed to submit transaction: ${error}`, error)
          });
          
          // Convert to CBOR for UTXORPC submission
          // const txCbor = yield* Effect.try({
          //   try: () => {
          //     const cbor_bytes = signedTx.toTransaction().to_cbor_bytes()
          //     return cbor_bytes;
          //   },
          //   catch: (error) => new MirrorError(`Failed to convert transaction to CBOR: ${error}`, error)
          // });
          
          // console.log(`📦 Mirror: Transaction CBOR size: ${txCbor.length} bytes`);
          
          // // Submit via UTXORPC
          // const submittedTxHash = yield* Effect.tryPromise({
          //   try: async () => {
          //     const txHashBytes = await submitClient.submitTx(txCbor);
          //     return Buffer.from(txHashBytes).toString('hex');
          //   },
          //   catch: (error) => new MirrorError(`Failed to submit transaction: ${error}`, error)
          // });
          
          console.log(`✅ Mirror: Transaction submitted successfully to ${config.networks.destination.name}`);
          console.log(`🎯 Mirror: Submitted hash: ${submittedTxHash}`);
          
          // Verify the hash matches
          if (submittedTxHash !== mirrorTx.hash) {
            console.warn(`⚠️ Mirror: Hash mismatch - expected: ${mirrorTx.hash}, got: ${submittedTxHash}`);
          }
        });

      // Process a single deposit
      const processDeposit = (deposit: DepositEvent): Effect.Effect<void, MirrorError> =>
        Effect.gen(function* () {
          console.log(`🔨 Mirror: Processing deposit ${deposit.transactionHash}`);

          // Initialize Lucid
          const lucid = yield* initializeLucid();

          // Create mirror transaction
          const mirrorTx = yield* createMirrorTransaction(deposit, lucid);
          
          // Submit transaction
          yield* submitTransaction(mirrorTx);
          
          // Update relayer with success
          const updateResult = yield* relayer.updateMirrorStatus(
            deposit.transactionHash,
            mirrorTx.hash,
            "CONFIRMED"
          ).pipe(
            Effect.mapError((error) => new MirrorError(`Failed to update relayer: ${error.message}`, error))
          );

          if (updateResult) {
            console.log(`✅ Mirror: Successfully mirrored ${deposit.transactionHash} → ${mirrorTx.hash}`);
          } else {
            yield* Effect.fail(new MirrorError(`Failed to update mirror status for ${deposit.transactionHash}`));
          }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              console.error(`❌ Mirror: Failed to process ${deposit.transactionHash}:`, error);
              
              // Update relayer with failure
              yield* relayer.updateMirrorStatus(
                deposit.transactionHash,
                "",
                "FAILED",
                error.message
              ).pipe(
                Effect.mapError((relayerError) => new MirrorError(`Failed to update relayer with error: ${relayerError.message}`, relayerError)),
                Effect.catchAll(() => Effect.void) // Ignore relayer update failures
              );
              
              // Re-throw the original error
              return Effect.fail(error);
            })
          )
        );

      // Check for pending deposits that might need processing
      const checkPendingDeposits = (): Effect.Effect<void, MirrorError> =>
        Effect.gen(function* () {
          const pendingDeposits = yield* relayer.getPendingDeposits().pipe(
            Effect.mapError((error) => new MirrorError(`Failed to get pending deposits: ${error.message}`, error))
          );
          
          if (pendingDeposits.length > 0) {
            console.log(`🔍 Mirror: Found ${pendingDeposits.length} pending deposits to process`);
            
            // Process pending deposits
            yield* Effect.forEach(pendingDeposits, processDeposit, { concurrency: 3 });
          }
        }).pipe(
          Effect.catchAll((error) => {
            console.error(`❌ Mirror: Error checking pending deposits:`, error);
            return Effect.void;
          })
        );

      console.log("🔄 Mirror: Starting to process deposits with Lucid integration...");

      // Start periodic check for pending deposits in background
      yield* checkPendingDeposits().pipe(
        Effect.repeat(Schedule.fixed("5 seconds")),
        Effect.fork
      );

      // Subscribe to deposit events from relayer and process them (this runs forever)
      yield* relayer.subscribeToDeposits.pipe(
        Stream.mapEffect(processDeposit),
        Stream.catchAll((error) => {
          console.error(`❌ Mirror: Stream processing error:`, error);
          return Stream.empty;
        }),
        Stream.runDrain
      );
      
      // This should never be reached as the stream runs forever
      yield* Effect.never;
    }) as unknown as Effect.Effect<never, MirrorError>
  });

// Create a Layer that provides the Mirror service
export const MirrorLive = Layer.effect(
  Mirror,
  Effect.all([Relayer, Config]).pipe(
    Effect.flatMap(([relayer, config]) => makeMirrorService(relayer, config))
  )
); 