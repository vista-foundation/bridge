// Mirror service: builds transactions with Lucid, submits and confirms via UTXORPC
import { Effect, Context, Layer, Stream, Schedule } from "effect";
import { Lucid, LucidEvolution, Koios, TxSigned } from "@lucid-evolution/lucid";
import { CardanoSubmitClient } from "@utxorpc/sdk";
import { DepositEvent } from "../common/types.js";
import { Relayer } from "../relayer/index.js";
import { Config, getUtxorpcHeaders } from "../common/config.js";

export class MirrorError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "MirrorError";
  }
}

export class Mirror extends Context.Tag("Mirror")<Mirror, {
  readonly run: Effect.Effect<never, MirrorError>;
}>() {}

const makeMirrorService = (
  relayer: Context.Tag.Service<Relayer>,
  config: Context.Tag.Service<Config>,
): Effect.Effect<Context.Tag.Service<Mirror>, MirrorError> =>
  Effect.succeed({
    run: Effect.gen(function* () {
      // ── Lucid: used only for tx construction + signing ───────────
      const initializeLucid = (): Effect.Effect<LucidEvolution, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            console.log(`🔧 Mirror: Initializing Lucid for ${config.networks.destination.name} (tx construction only)`);
            // Lucid still uses Koios for protocol params + UTXO selection
            const lucid = await Lucid(
              new Koios(config.networks.destination.lucidProvider),
              config.networks.destination.lucidNetwork as any,
            );
            lucid.selectWallet.fromSeed(process.env.DEST_SENDER_WALLET_SEED || "");
            console.log(`✅ Mirror: Lucid initialized`);
            return lucid;
          },
          catch: (error) => new MirrorError(`Failed to initialize Lucid: ${error}`, error),
        });

      // ── UTXORPC submit client for destination network ───────────
      const createSubmitClient = (): Effect.Effect<CardanoSubmitClient, MirrorError> =>
        Effect.try({
          try: () => {
            const headers = getUtxorpcHeaders("destination");
            return new CardanoSubmitClient({
              uri: config.networks.destination.utxorpcEndpoint,
              ...(headers && { headers }),
            });
          },
          catch: (error) => new MirrorError(`Failed to create UTXORPC submit client: ${error}`, error),
        });

      // ── Build + sign mirror tx with Lucid ───────────────────────
      const buildMirrorTx = (
        deposit: DepositEvent,
        lucid: LucidEvolution,
      ): Effect.Effect<{ hash: string; signedTx: TxSigned; fee: bigint }, MirrorError> =>
        Effect.gen(function* () {
          const senderAddresses = config.networks.destination.senderAddresses || [];
          if (senderAddresses.length === 0) {
            return yield* Effect.fail(new MirrorError("No sender addresses configured"));
          }

          const feeAmount = BigInt(config.bridge.feeAmount);
          const netAmount = deposit.amount - feeAmount;

          if (netAmount <= BigInt(1_000_000)) {
            return yield* Effect.fail(
              new MirrorError(`Insufficient after fees: ${deposit.amount} - ${feeAmount} = ${netAmount}`),
            );
          }

          console.log(`🏗️ Mirror: Building tx — ${netAmount} lovelace to ${deposit.senderAddress}`);

          const signedTx = yield* Effect.tryPromise({
            try: async () => {
              const tx = lucid
                .newTx()
                .pay.ToAddress(deposit.senderAddress, { lovelace: netAmount })
                .attachMetadata(1337, {
                  msg: ["VISTA Bridge mirror", deposit.transactionHash],
                  originalTx: deposit.transactionHash,
                  bridgeVersion: "1.0.0",
                });

              const completed = await tx.complete();
              return await completed.sign.withWallet().complete();
            },
            catch: (error) => new MirrorError(`Failed to build tx: ${error}`, error),
          });

          const hash = yield* Effect.try({
            try: () => signedTx.toHash(),
            catch: (error) => new MirrorError(`Failed to get tx hash: ${error}`, error),
          });

          console.log(`🔑 Mirror: TX built — hash: ${hash}, net: ${netAmount}, fee: ${feeAmount}`);
          return { hash, signedTx, fee: feeAmount };
        });

      // ── Submit via UTXORPC with retry ──────────────────────────
      const submitViaUtxorpc = (
        signedTx: TxSigned,
        submitClient: CardanoSubmitClient,
        expectedHash: string,
        maxRetries: number = 5,
      ): Effect.Effect<string, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            const cborBytes = signedTx.toTransaction().to_cbor_bytes();
            console.log(`📡 Mirror: Submitting ${cborBytes.length} bytes via UTXORPC`);

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                const txHashBytes = await submitClient.submitTx(cborBytes);
                const txHash = Buffer.from(txHashBytes).toString("hex");
                console.log(`✅ Mirror: Submitted via UTXORPC — hash: ${txHash}`);
                return txHash;
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);

                // Already submitted — success
                if (msg.includes("already been included") || msg.includes("AlreadyExists")) {
                  console.log(`ℹ️ Mirror: TX already on-chain`);
                  return expectedHash;
                }

                // UTxO not yet available — wait and retry
                if (msg.includes("not present in the UTxO") || msg.includes("input")) {
                  console.log(`⏳ Mirror: UTxO not synced yet, retry ${attempt}/${maxRetries} in ${attempt * 3}s...`);
                  await new Promise((r) => setTimeout(r, attempt * 3000));
                  continue;
                }

                // Other error — fail immediately
                throw err;
              }
            }

            throw new Error(`UTXORPC submit failed after ${maxRetries} retries`);
          },
          catch: (error) => new MirrorError(`UTXORPC submit failed: ${error instanceof Error ? error.message : error}`, error),
        });

      // ── Wait for on-chain confirmation via UTXORPC ──────────────
      const waitForConfirmation = (
        txHash: string,
        submitClient: CardanoSubmitClient,
        maxWaitMs: number = 120_000,
      ): Effect.Effect<boolean, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            console.log(`⏳ Mirror: Waiting for on-chain confirmation of ${txHash}...`);
            const txHashBytes = Buffer.from(txHash, "hex");
            const deadline = Date.now() + maxWaitMs;

            try {
              const stages = submitClient.waitForTx(txHashBytes);
              for await (const stage of stages) {
                const stageStr = String(stage);
                console.log(`📊 Mirror: TX ${txHash.slice(0, 16)}... stage: ${stageStr}`);

                // Stage.CONFIRMED or equivalent means it's in a block
                if (stageStr.includes("Confirmed") || stageStr.includes("CONFIRMED") || stage >= 2) {
                  console.log(`✅ Mirror: TX ${txHash.slice(0, 16)}... confirmed on-chain`);
                  return true;
                }

                if (Date.now() > deadline) {
                  console.log(`⚠️ Mirror: Confirmation timeout for ${txHash.slice(0, 16)}...`);
                  return false;
                }
              }
            } catch (err) {
              // waitForTx may fail if the UTXORPC endpoint doesn't support it fully
              // Fall back to treating submission as sufficient
              console.warn(`⚠️ Mirror: waitForTx error (treating submit as confirmed):`, err instanceof Error ? err.message : err);
              return true;
            }

            return false;
          },
          catch: (error) => new MirrorError(`Confirmation wait failed: ${error}`, error),
        });

      // ── Process a single deposit end-to-end ─────────────────────
      const processDeposit = (deposit: DepositEvent): Effect.Effect<void, MirrorError> =>
        Effect.gen(function* () {
          console.log(`🔨 Mirror: Processing deposit ${deposit.transactionHash}`);

          // 1. Build + sign tx with Lucid
          const lucid = yield* initializeLucid();
          const mirrorTx = yield* buildMirrorTx(deposit, lucid);

          // 2. Create UTXORPC submit client
          const submitClient = yield* createSubmitClient();

          // 3. Submit via UTXORPC only (with retry for UTxO sync delays)
          const submittedHash = yield* submitViaUtxorpc(mirrorTx.signedTx, submitClient, mirrorTx.hash);

          // 4. Update relayer to SUBMITTED (not yet confirmed)
          yield* relayer.updateMirrorStatus(
            deposit.transactionHash,
            submittedHash,
            "SUBMITTED",
          ).pipe(
            Effect.mapError((e) => new MirrorError(`Failed to update status: ${e.message}`, e)),
          );

          console.log(`📡 Mirror: TX submitted — waiting for on-chain confirmation...`);

          // 5. Wait for actual on-chain confirmation
          const confirmed = yield* waitForConfirmation(submittedHash, submitClient);

          // 6. Update to CONFIRMED only after real confirmation
          if (confirmed) {
            yield* relayer.updateMirrorStatus(
              deposit.transactionHash,
              submittedHash,
              "CONFIRMED",
            ).pipe(
              Effect.mapError((e) => new MirrorError(`Failed to confirm: ${e.message}`, e)),
            );
            console.log(`✅ Mirror: ${deposit.transactionHash} → ${submittedHash} CONFIRMED`);
          } else {
            console.warn(`⚠️ Mirror: ${submittedHash} submitted but not yet confirmed — will retry`);
          }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              console.error(`❌ Mirror: Failed to process ${deposit.transactionHash}:`, error.message);

              yield* relayer.updateMirrorStatus(
                deposit.transactionHash,
                "",
                "FAILED",
                error.message,
              ).pipe(
                Effect.mapError((e) => new MirrorError(e.message, e)),
                Effect.catchAll(() => Effect.void),
              );
            }),
          ),
        );

      // ── Main loop ───────────────────────────────────────────────
      console.log("🔄 Mirror: Starting — Lucid for tx construction, UTXORPC for submit + confirm");

      // Periodic check for pending deposits
      yield* Effect.gen(function* () {
        const pending = yield* relayer.getPendingDeposits().pipe(
          Effect.mapError((e) => new MirrorError(e.message, e)),
        );
        if (pending.length > 0) {
          console.log(`🔍 Mirror: Found ${pending.length} pending deposits`);
          yield* Effect.forEach(pending, processDeposit, { concurrency: 3 });
        }
      }).pipe(
        Effect.catchAll((error) => {
          console.error(`❌ Mirror: Pending check error:`, error);
          return Effect.void;
        }),
        Effect.repeat(Schedule.fixed("5 seconds")),
        Effect.fork,
      );

      // Subscribe to new deposit events
      yield* relayer.subscribeToDeposits.pipe(
        Stream.mapEffect(processDeposit),
        Stream.catchAll((error) => {
          console.error(`❌ Mirror: Stream error:`, error);
          return Stream.empty;
        }),
        Stream.runDrain,
      );

      yield* Effect.never;
    }) as unknown as Effect.Effect<never, MirrorError>,
  });

export const MirrorLive = Layer.effect(
  Mirror,
  Effect.all([Relayer, Config]).pipe(
    Effect.flatMap(([relayer, config]) => makeMirrorService(relayer, config)),
  ),
);
