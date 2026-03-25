// Cardano Mirror: Mesh SDK for tx construction, UTXORPC (U5CProvider) for submit + confirm
import { Effect, Stream, Schedule } from "effect";
import { MeshWallet, Transaction, KoiosProvider, U5CProvider } from "@meshsdk/core";
import type { IFetcher, ISubmitter } from "@meshsdk/core";
import type { IChainMirror } from "../common/chain-interfaces.js";
import type { BridgeRoute } from "../common/route.js";
import type { DepositEvent, BridgeState } from "../common/types.js";

export class MirrorError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "MirrorError";
  }
}

// Minimal relayer interface
interface RelayerService {
  updateMirrorStatus: (depositTxHash: string, mirrorTxHash: string, status: string, errorMessage?: string) => Effect.Effect<boolean, Error>;
  getBridgeState: (routeId?: string) => Effect.Effect<BridgeState, Error>;
  getPendingDeposits: (routeId?: string) => Effect.Effect<DepositEvent[], Error>;
  subscribeToDeposits: Stream.Stream<DepositEvent, Error>;
}

// Map config network names to Koios slugs
const KOIOS_SLUGS: Record<string, string> = {
  preproduction: "preprod",
  preview: "preview",
  mainnet: "api",
};

/**
 * Cardano-specific chain mirror.
 * Builds mirror txs with MeshWallet (Koios for UTXOs), submits via UTXORPC.
 */
export class CardanoMirror implements IChainMirror {
  readonly chainId: string;

  constructor(
    private readonly route: BridgeRoute,
    private readonly relayer: RelayerService,
  ) {
    this.chainId = route.destination.chainId;
  }

  get run(): Effect.Effect<never, Error> {
    const { route, relayer } = this;

    return Effect.gen(function* () {
      // ── U5CProvider: UTXORPC for submit + confirm ───────────────
      const headers: Record<string, string> = {};
      if (route.destination.utxorpcApiKey) {
        headers["dmtr-api-key"] = route.destination.utxorpcApiKey;
      }
      const submitter = new U5CProvider({
        url: route.destination.utxorpcEndpoint!,
        ...(Object.keys(headers).length > 0 && { headers }),
      });
      console.log(`✅ Mirror [${route.id}]: U5CProvider for ${route.destination.name}`);

      // ── KoiosProvider: UTXO queries + protocol params ───────────
      const koiosSlug = KOIOS_SLUGS[route.destination.name] ?? "preprod";
      const fetcher = new KoiosProvider(koiosSlug);
      console.log(`✅ Mirror [${route.id}]: KoiosProvider for ${route.destination.name}`);

      // ── MeshWallet: hybrid — Koios for reads, U5C for writes ────
      const seed = route.destination.walletSeed ?? "";
      if (!seed) {
        return yield* Effect.fail(new MirrorError(`No wallet seed for route ${route.id}`));
      }

      const wallet = new MeshWallet({
        networkId: 0,
        fetcher: fetcher as unknown as IFetcher,
        submitter: submitter as unknown as ISubmitter,
        key: { type: "mnemonic", words: seed.split(" ") },
      });
      const walletAddr = wallet.getChangeAddress();
      console.log(`✅ Mirror [${route.id}]: Wallet ${walletAddr}`);

      // ── Build + sign mirror tx ──────────────────────────────────
      const buildMirrorTx = (deposit: DepositEvent): Effect.Effect<string, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            const feeAmount = BigInt(route.bridge.feeAmount);
            const netAmount = deposit.amount - feeAmount;

            if (netAmount <= BigInt(1_000_000)) {
              throw new Error(`Insufficient after fees: ${deposit.amount} - ${feeAmount} = ${netAmount}`);
            }

            console.log(`🏗️ Mirror [${route.id}]: ${netAmount} lovelace to ${deposit.senderAddress}`);

            const tx = new Transaction({ initiator: wallet });
            tx.sendLovelace(deposit.senderAddress, netAmount.toString());
            tx.setMetadata(1337, {
              msg: ["VISTA Bridge mirror", deposit.transactionHash.slice(0, 32)],
              originalTx: deposit.transactionHash,
              bridgeVersion: "1.0.0",
            });

            const unsignedTx = await tx.build();
            return await wallet.signTx(unsignedTx);
          },
          catch: (error) => new MirrorError(`Build failed: ${error instanceof Error ? error.message : error}`, error),
        });

      // ── Submit via UTXORPC with retry ───────────────────────────
      const submitTx = (signedTx: string, maxRetries = 5): Effect.Effect<string, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              try {
                const txHash = await submitter.submitTx(signedTx);
                console.log(`✅ Mirror [${route.id}]: Submitted — ${txHash}`);
                return txHash;
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes("already") || msg.includes("AlreadyExists")) {
                  console.log(`ℹ️ Mirror [${route.id}]: TX already on-chain`);
                  throw new Error("ALREADY_SUBMITTED");
                }
                if (msg.includes("UTxO") || msg.includes("input") || msg.includes("spent")) {
                  console.log(`⏳ Mirror [${route.id}]: UTxO sync, retry ${attempt}/${maxRetries} in ${attempt * 3}s`);
                  await new Promise((r) => setTimeout(r, attempt * 3000));
                  continue;
                }
                throw err;
              }
            }
            throw new Error(`Submit failed after ${maxRetries} retries`);
          },
          catch: (error) => new MirrorError(`Submit failed: ${error instanceof Error ? error.message : error}`, error),
        });

      // ── Wait for on-chain confirmation ──────────────────────────
      const waitForConfirmation = (txHash: string, timeoutMs = 120_000): Effect.Effect<boolean, MirrorError> =>
        Effect.tryPromise({
          try: () =>
            new Promise<boolean>((resolve) => {
              const timer = setTimeout(() => {
                console.warn(`⚠️ Mirror [${route.id}]: Confirm timeout for ${txHash.slice(0, 16)}...`);
                resolve(false);
              }, timeoutMs);

              try {
                submitter.onTxConfirmed(txHash, () => {
                  clearTimeout(timer);
                  console.log(`✅ Mirror [${route.id}]: ${txHash.slice(0, 16)}... confirmed`);
                  resolve(true);
                });
              } catch {
                clearTimeout(timer);
                console.warn(`⚠️ Mirror [${route.id}]: onTxConfirmed unavailable, treating as confirmed`);
                resolve(true);
              }
            }),
          catch: (error) => new MirrorError(`Confirm failed: ${error}`, error),
        });

      // ── Process a single deposit ────────────────────────────────
      const processDeposit = (deposit: DepositEvent): Effect.Effect<void, MirrorError> =>
        Effect.gen(function* () {
          console.log(`🔨 Mirror [${route.id}]: Processing ${deposit.transactionHash.slice(0, 16)}...`);

          const signedTx = yield* buildMirrorTx(deposit);
          const txHash = yield* submitTx(signedTx);

          yield* relayer.updateMirrorStatus(deposit.transactionHash, txHash, "SUBMITTED").pipe(
            Effect.mapError((e) => new MirrorError(e.message, e)),
          );

          const confirmed = yield* waitForConfirmation(txHash);

          if (confirmed) {
            yield* relayer.updateMirrorStatus(deposit.transactionHash, txHash, "CONFIRMED").pipe(
              Effect.mapError((e) => new MirrorError(e.message, e)),
            );
            console.log(`✅ Mirror [${route.id}]: ${deposit.transactionHash.slice(0, 16)}... → ${txHash.slice(0, 16)}... CONFIRMED`);
          }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              console.error(`❌ Mirror [${route.id}]: Failed ${deposit.transactionHash.slice(0, 16)}...:`, error.message);
              yield* relayer.updateMirrorStatus(deposit.transactionHash, "", "FAILED", error.message).pipe(
                Effect.mapError((e) => new MirrorError(e.message, e)),
                Effect.catchAll(() => Effect.void),
              );
            }),
          ),
        );

      // ── Main loop ───────────────────────────────────────────────
      console.log(`🔄 Mirror [${route.id}]: Started — Mesh SDK + UTXORPC`);

      // Periodic check for pending deposits (filtered by route)
      yield* Effect.gen(function* () {
        const pending = yield* relayer.getPendingDeposits(route.id).pipe(
          Effect.mapError((e) => new MirrorError(e.message, e)),
        );
        if (pending.length > 0) {
          console.log(`🔍 Mirror [${route.id}]: ${pending.length} pending deposits`);
          yield* Effect.forEach(pending, processDeposit, { concurrency: 3 });
        }
      }).pipe(
        Effect.catchAll((error) => {
          console.error(`❌ Mirror [${route.id}]: Pending check error:`, error);
          return Effect.void;
        }),
        Effect.repeat(Schedule.fixed("5 seconds")),
        Effect.fork,
      );

      // Subscribe to new deposits (filtered by route)
      yield* relayer.subscribeToDeposits.pipe(
        Stream.filter((dep) => dep.routeId === route.id),
        Stream.mapEffect(processDeposit),
        Stream.catchAll((error) => {
          console.error(`❌ Mirror [${route.id}]: Stream error:`, error);
          return Stream.empty;
        }),
        Stream.runDrain,
      );

      yield* Effect.never;
    }) as Effect.Effect<never, Error>;
  }
}
