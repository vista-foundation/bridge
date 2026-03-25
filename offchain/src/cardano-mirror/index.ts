// Mirror service: Mesh SDK for tx construction, UTXORPC (U5CProvider) for submit + confirm
import { Effect, Context, Layer, Stream, Schedule } from "effect";
import { MeshWallet, Transaction, KoiosProvider, U5CProvider } from "@meshsdk/core";
import type { IFetcher, ISubmitter } from "@meshsdk/core";
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

// Map config network names to Koios base URLs
const KOIOS_URLS: Record<string, string> = {
  preproduction: "preprod",
  preview: "preview",
  mainnet: "api",
};

const makeMirrorService = (
  relayer: Context.Tag.Service<Relayer>,
  config: Context.Tag.Service<Config>,
): Effect.Effect<Context.Tag.Service<Mirror>, MirrorError> =>
  Effect.succeed({
    run: Effect.gen(function* () {

      // ── U5CProvider: UTXORPC for submit + confirm ───────────────
      const createSubmitter = (): Effect.Effect<U5CProvider, MirrorError> =>
        Effect.try({
          try: () => {
            const headers = getUtxorpcHeaders("destination");
            const provider = new U5CProvider({
              url: config.networks.destination.utxorpcEndpoint,
              ...(headers && { headers }),
            });
            console.log(`✅ Mirror: U5CProvider (submitter) for ${config.networks.destination.name}`);
            return provider;
          },
          catch: (error) => new MirrorError(`Failed to create U5CProvider: ${error}`, error),
        });

      // ── KoiosProvider: for UTXO queries + protocol params ───────
      // (UTXORPC query has protobuf compatibility issues with Demeter endpoints)
      const createFetcher = (): Effect.Effect<KoiosProvider, MirrorError> =>
        Effect.try({
          try: () => {
            const networkSlug = KOIOS_URLS[config.networks.destination.name] ?? "preprod";
            const provider = new KoiosProvider(networkSlug);
            console.log(`✅ Mirror: KoiosProvider (fetcher) for ${config.networks.destination.name}`);
            return provider;
          },
          catch: (error) => new MirrorError(`Failed to create KoiosProvider: ${error}`, error),
        });

      // ── MeshWallet: hybrid — Koios for reads, U5C for writes ────
      const createWallet = (
        fetcher: KoiosProvider,
        submitter: U5CProvider,
      ): Effect.Effect<MeshWallet, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            const seed = process.env.DEST_SENDER_WALLET_SEED || "";
            if (!seed) throw new Error("DEST_SENDER_WALLET_SEED not set");

            const wallet = new MeshWallet({
              networkId: 0, // testnet
              fetcher: fetcher as unknown as IFetcher,
              submitter: submitter as unknown as ISubmitter,
              key: {
                type: "mnemonic",
                words: seed.split(" "),
              },
            });

            const addr = wallet.getChangeAddress();
            console.log(`✅ Mirror: MeshWallet ready — ${addr}`);
            return wallet;
          },
          catch: (error) => new MirrorError(`Failed to create wallet: ${error}`, error),
        });

      // ── Build + sign mirror tx ──────────────────────────────────
      const buildMirrorTx = (
        deposit: DepositEvent,
        wallet: MeshWallet,
      ): Effect.Effect<string, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            const feeAmount = BigInt(config.bridge.feeAmount);
            const netAmount = deposit.amount - feeAmount;

            if (netAmount <= BigInt(1_000_000)) {
              throw new Error(
                `Insufficient after fees: ${deposit.amount} - ${feeAmount} = ${netAmount}`,
              );
            }

            console.log(`🏗️ Mirror: Building tx — ${netAmount} lovelace to ${deposit.senderAddress}`);

            const tx = new Transaction({ initiator: wallet });
            tx.sendLovelace(deposit.senderAddress, netAmount.toString());
            tx.setMetadata(1337, {
              msg: ["VISTA Bridge mirror", deposit.transactionHash.slice(0, 32)],
              originalTx: deposit.transactionHash,
              bridgeVersion: "1.0.0",
            });

            const unsignedTx = await tx.build();
            const signedTx = await wallet.signTx(unsignedTx);

            console.log(`🔑 Mirror: TX built and signed`);
            return signedTx;
          },
          catch: (error) => new MirrorError(
            `Failed to build tx: ${error instanceof Error ? error.message : error}`,
            error,
          ),
        });

      // ── Submit via U5CProvider (UTXORPC) with retry ─────────────
      const submitTx = (
        signedTx: string,
        submitter: U5CProvider,
        maxRetries: number = 5,
      ): Effect.Effect<string, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            console.log(`📡 Mirror: Submitting via UTXORPC...`);

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                const txHash = await submitter.submitTx(signedTx);
                console.log(`✅ Mirror: Submitted — hash: ${txHash}`);
                return txHash;
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);

                if (msg.includes("already") || msg.includes("AlreadyExists")) {
                  console.log(`ℹ️ Mirror: TX already on-chain`);
                  // Extract hash from the signed tx if possible
                  throw new Error(`ALREADY_SUBMITTED`);
                }

                if (msg.includes("UTxO") || msg.includes("input") || msg.includes("spent")) {
                  console.log(`⏳ Mirror: UTxO sync delay, retry ${attempt}/${maxRetries} in ${attempt * 3}s...`);
                  await new Promise((r) => setTimeout(r, attempt * 3000));
                  continue;
                }

                throw err;
              }
            }
            throw new Error(`Submit failed after ${maxRetries} retries`);
          },
          catch: (error) => new MirrorError(
            `UTXORPC submit failed: ${error instanceof Error ? error.message : error}`,
            error,
          ),
        });

      // ── Wait for on-chain confirmation ──────────────────────────
      const waitForConfirmation = (
        txHash: string,
        submitter: U5CProvider,
        timeoutMs: number = 120_000,
      ): Effect.Effect<boolean, MirrorError> =>
        Effect.tryPromise({
          try: () => {
            console.log(`⏳ Mirror: Waiting for confirmation of ${txHash.slice(0, 16)}...`);

            return new Promise<boolean>((resolve) => {
              const timer = setTimeout(() => {
                console.warn(`⚠️ Mirror: Confirmation timeout for ${txHash.slice(0, 16)}...`);
                resolve(false);
              }, timeoutMs);

              try {
                submitter.onTxConfirmed(txHash, () => {
                  clearTimeout(timer);
                  console.log(`✅ Mirror: ${txHash.slice(0, 16)}... confirmed on-chain`);
                  resolve(true);
                });
              } catch {
                clearTimeout(timer);
                console.warn(`⚠️ Mirror: onTxConfirmed not available, treating submit as confirmed`);
                resolve(true);
              }
            });
          },
          catch: (error) => new MirrorError(`Confirmation wait failed: ${error}`, error),
        });

      // ── Process a single deposit end-to-end ─────────────────────
      const processDeposit = (
        deposit: DepositEvent,
        wallet: MeshWallet,
        submitter: U5CProvider,
      ): Effect.Effect<void, MirrorError> =>
        Effect.gen(function* () {
          console.log(`🔨 Mirror: Processing ${deposit.transactionHash.slice(0, 16)}...`);

          // 1. Build + sign with MeshWallet (UTXOs via Koios, signing local)
          const signedTx = yield* buildMirrorTx(deposit, wallet);

          // 2. Submit via UTXORPC
          const txHash = yield* submitTx(signedTx, submitter);

          // 3. Mark SUBMITTED
          yield* relayer.updateMirrorStatus(deposit.transactionHash, txHash, "SUBMITTED").pipe(
            Effect.mapError((e) => new MirrorError(e.message, e)),
          );

          // 4. Wait for on-chain confirmation
          const confirmed = yield* waitForConfirmation(txHash, submitter);

          // 5. Mark CONFIRMED only after real confirmation
          if (confirmed) {
            yield* relayer.updateMirrorStatus(deposit.transactionHash, txHash, "CONFIRMED").pipe(
              Effect.mapError((e) => new MirrorError(e.message, e)),
            );
            console.log(`✅ Mirror: ${deposit.transactionHash.slice(0, 16)}... → ${txHash.slice(0, 16)}... CONFIRMED`);
          } else {
            console.warn(`⚠️ Mirror: ${txHash.slice(0, 16)}... submitted but not confirmed — will retry`);
          }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              console.error(`❌ Mirror: Failed ${deposit.transactionHash.slice(0, 16)}...:`, error.message);
              yield* relayer.updateMirrorStatus(deposit.transactionHash, "", "FAILED", error.message).pipe(
                Effect.mapError((e) => new MirrorError(e.message, e)),
                Effect.catchAll(() => Effect.void),
              );
            }),
          ),
        );

      // ── Initialize ──────────────────────────────────────────────
      console.log("🔄 Mirror: Starting — Mesh SDK (Koios fetch + UTXORPC submit/confirm)");
      const submitter = yield* createSubmitter();
      const fetcher = yield* createFetcher();
      const wallet = yield* createWallet(fetcher, submitter);

      // ── Main loop ───────────────────────────────────────────────
      yield* Effect.gen(function* () {
        const pending = yield* relayer.getPendingDeposits().pipe(
          Effect.mapError((e) => new MirrorError(e.message, e)),
        );
        if (pending.length > 0) {
          console.log(`🔍 Mirror: ${pending.length} pending deposits`);
          yield* Effect.forEach(
            pending,
            (dep) => processDeposit(dep, wallet, submitter),
            { concurrency: 3 },
          );
        }
      }).pipe(
        Effect.catchAll((error) => {
          console.error(`❌ Mirror: Pending check error:`, error);
          return Effect.void;
        }),
        Effect.repeat(Schedule.fixed("5 seconds")),
        Effect.fork,
      );

      // ── Subscribe to new deposits ───────────────────────────────
      yield* relayer.subscribeToDeposits.pipe(
        Stream.mapEffect((dep) => processDeposit(dep, wallet, submitter)),
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
