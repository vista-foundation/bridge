// Cardano Mirror: Mesh SDK for tx construction, UTXORPC (U5CProvider) for submit + confirm
import { Effect, Stream, Schedule } from "effect";
import { MeshWallet, Transaction, ForgeScript, KoiosProvider, U5CProvider } from "@meshsdk/core";
import type { IFetcher, ISubmitter } from "@meshsdk/core";
import type { IChainMirror } from "../common/chain-interfaces.js";
import type { BridgeRoute } from "../common/route.js";
import { getAssetConfig } from "../common/route.js";
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
      const walletAddr: string = yield* Effect.promise(() => wallet.getChangeAddress());
      console.log(`✅ Mirror [${route.id}]: Wallet ${walletAddr}`);

      // ── Source-chain wallet for burn operations ────────────────
      // Only initialized when a route has assets with sourceAction: "burn"
      const needsSourceBurn = route.bridge.assetConfigs
        ? Object.values(route.bridge.assetConfigs).some((c) => c.sourceAction === "burn")
        : false;

      let sourceWallet: MeshWallet | null = null;
      let sourceSubmitter: U5CProvider | null = null;
      if (needsSourceBurn && !route.source.walletSeed) {
        return yield* Effect.fail(new MirrorError(`Route ${route.id} has sourceAction "burn" but no source wallet seed configured`));
      }
      if (needsSourceBurn && route.source.walletSeed) {
        const srcHeaders: Record<string, string> = {};
        if (route.source.utxorpcApiKey) srcHeaders["dmtr-api-key"] = route.source.utxorpcApiKey;
        sourceSubmitter = new U5CProvider({
          url: route.source.utxorpcEndpoint!,
          ...(Object.keys(srcHeaders).length > 0 && { headers: srcHeaders }),
        });
        const srcKoiosSlug = KOIOS_SLUGS[route.source.name] ?? "preprod";
        const srcFetcher = new KoiosProvider(srcKoiosSlug);
        sourceWallet = new MeshWallet({
          networkId: 0,
          fetcher: srcFetcher as unknown as IFetcher,
          submitter: sourceSubmitter as unknown as ISubmitter,
          key: { type: "mnemonic", words: route.source.walletSeed.split(" ") },
        });
        const srcAddr: string = yield* Effect.promise(() => sourceWallet!.getChangeAddress());
        console.log(`✅ Mirror [${route.id}]: Source wallet for burns: ${srcAddr}`);
      }

      // Helper: extract UTF-8 asset name from a full unit string (policyId + assetNameHex)
      // Mesh SDK mintAsset expects UTF-8 assetName (it hex-encodes internally)
      const assetNameFromUnit = (unit: string): string => {
        if (unit.length <= 56) throw new MirrorError(`Invalid unit "${unit}" — must be policyId (56 hex) + assetName`);
        const hex = unit.slice(56);
        return Buffer.from(hex, "hex").toString("utf8");
      };

      // ── Build + sign mirror tx ──────────────────────────────────
      const buildMirrorTx = (deposit: DepositEvent): Effect.Effect<string, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            const assetCfg = getAssetConfig(route, deposit.assetType);
            const tx = new Transaction({ initiator: wallet });

            if (deposit.assetType === "ADA") {
              // ── ADA: deduct fee from amount (existing behavior) ──
              const feeAmount = BigInt(assetCfg.feeLovelace);
              const netAmount = deposit.amount - feeAmount;
              if (netAmount <= BigInt(1_000_000)) {
                throw new Error(`Insufficient after fees: ${deposit.amount} - ${feeAmount} = ${netAmount}`);
              }
              console.log(`🏗️ Mirror [${route.id}]: ${netAmount} lovelace to ${deposit.senderAddress}`);
              tx.sendLovelace(deposit.senderAddress, netAmount.toString());
            } else if (assetCfg.destinationAction === "mint") {
              // ── Mint: create tokens via native script (e.g. vHOSKY on Preview) ──
              const forgeScript = ForgeScript.withOneSignature(walletAddr);
              const assetNameHex = assetNameFromUnit(assetCfg.destinationUnit);
              console.log(`🏗️ Mirror [${route.id}]: Minting ${deposit.amount} ${deposit.assetType} to ${deposit.senderAddress}`);
              tx.mintAsset(forgeScript, {
                assetName: assetNameHex,
                assetQuantity: deposit.amount.toString(),
                recipient: { address: deposit.senderAddress },
              });
            } else {
              // ── Send: transfer from wallet balance (e.g. tHOSKY on Preprod) ──
              console.log(`🏗️ Mirror [${route.id}]: Sending ${deposit.amount} ${deposit.assetType} to ${deposit.senderAddress}`);
              tx.sendAssets(deposit.senderAddress, [
                { unit: assetCfg.destinationUnit, quantity: deposit.amount.toString() },
              ]);
            }

            tx.setMetadata(1337, {
              msg: ["VISTA Bridge mirror", deposit.transactionHash.slice(0, 32)],
              originalTx: deposit.transactionHash,
              a: deposit.assetType,
              bridgeVersion: "1.1.0",
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
                  console.log(`⏳ Mirror [${route.id}]: UTxO sync, retry ${attempt}/${maxRetries} in ${attempt * 3}s — ${msg.slice(0, 120)}`);
                  await new Promise((r) => setTimeout(r, attempt * 3000));
                  continue;
                }
                console.error(`❌ Mirror [${route.id}]: Submit error (non-retryable): ${msg}`);
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
                console.log(`🔄 Mirror [${route.id}]: Confirm timeout for ${txHash.slice(0, 16)}..., will retry`);
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

      // ── Burn tokens on source chain after destination mirror confirms ─
      const burnSourceTokens = (deposit: DepositEvent): Effect.Effect<string, MirrorError> =>
        Effect.tryPromise({
          try: async () => {
            const assetCfg = getAssetConfig(route, deposit.assetType);
            if (assetCfg.sourceAction !== "burn") return ""; // no burn needed
            if (!sourceWallet || !sourceSubmitter) {
              throw new Error(`sourceAction is "burn" but source wallet is not configured for route ${route.id}`);
            }

            const srcAddr = await sourceWallet.getChangeAddress();
            const forgeScript = ForgeScript.withOneSignature(srcAddr);

            console.log(`🔥 Mirror [${route.id}]: Burning ${deposit.amount} ${deposit.assetType} on ${route.source.name}`);

            // Retry burn — the deposit UTxO may not be synced to Koios yet
            for (let attempt = 1; attempt <= 5; attempt++) {
              try {
                const tx = new Transaction({ initiator: sourceWallet });
                tx.burnAsset(forgeScript, {
                  unit: assetCfg.sourceUnit,
                  quantity: deposit.amount.toString(),
                });
                tx.setMetadata(1337, {
                  msg: ["VISTA Bridge burn", deposit.transactionHash.slice(0, 32)],
                  a: deposit.assetType,
                  bridgeVersion: "1.1.0",
                });

                const unsignedTx = await tx.build();
                const signedTx = await sourceWallet.signTx(unsignedTx);
                const burnHash = await sourceSubmitter.submitTx(signedTx);

                console.log(`🔥 Mirror [${route.id}]: Burn tx ${burnHash.slice(0, 16)}... submitted`);
                return burnHash;
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (attempt < 5 && (msg.includes("UTxO") || msg.includes("input") || msg.includes("Insufficient"))) {
                  console.log(`⏳ Mirror [${route.id}]: Burn UTxO not synced, retry ${attempt}/5 in ${attempt * 5}s`);
                  await new Promise((r) => setTimeout(r, attempt * 5000));
                  continue;
                }
                throw err;
              }
            }
            throw new Error("Burn failed after 5 retries");
          },
          catch: (error) => new MirrorError(`Burn failed: ${error instanceof Error ? error.message : error}`, error),
        });

      // Track in-flight deposits to prevent concurrent processing
      const inFlight = new Set<string>();

      // ── Process a single deposit ────────────────────────────────
      const processDeposit = (deposit: DepositEvent): Effect.Effect<void, MirrorError> =>
        Effect.gen(function* () {
          const depHash = deposit.transactionHash;

          // Guard: skip if already in-flight or already processed
          if (inFlight.has(depHash)) return;

          const state = yield* relayer.getBridgeState(route.id).pipe(
            Effect.mapError((e) => new MirrorError(`DB check failed: ${e.message}`, e)),
          );
          if (state.processedDeposits.some((d) => d.transactionHash === depHash)) {
            return;
          }

          inFlight.add(depHash);

          try {
            const assetCfg = getAssetConfig(route, deposit.assetType);

            console.log(`🔨 Mirror [${route.id}]: Processing ${depHash.slice(0, 16)}...`);

            const signedTx = yield* buildMirrorTx(deposit);
            const mirrorTxHash = yield* submitTx(signedTx);

            // Mark CONFIRMED immediately — prevents duplicate mirror on retry
            yield* relayer.updateMirrorStatus(depHash, mirrorTxHash, "CONFIRMED").pipe(
              Effect.mapError((e) => new MirrorError(e.message, e)),
            );
            console.log(`✅ Mirror [${route.id}]: ${depHash.slice(0, 16)}... → ${mirrorTxHash.slice(0, 16)}... CONFIRMED`);

            // Burn source tokens if configured (non-fatal — mirror already confirmed)
            if (assetCfg.sourceAction === "burn") {
              yield* burnSourceTokens(deposit).pipe(
                Effect.catchAll((err) => {
                  console.error(`❌ Mirror [${route.id}]: Source burn failed: ${err.message}`);
                  return Effect.void;
                }),
              );
            }
          } finally {
            inFlight.delete(depHash);
          }
        }).pipe(
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              // Don't overwrite CONFIRMED — check DB first
              const state = yield* relayer.getBridgeState(route.id).pipe(
                Effect.catchAll(() => Effect.succeed({ processedDeposits: [], pendingMirrors: [], lastProcessedSlot: BigInt(0), lastProcessedBlockHash: "" })),
              );
              if (state.processedDeposits.some((d) => d.transactionHash === deposit.transactionHash)) {
                return; // Already confirmed by another attempt — don't overwrite
              }
              console.error(`❌ Mirror [${route.id}]: Failed ${deposit.transactionHash.slice(0, 16)}...: ${error.message}`);
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
          console.log(`🔄 Mirror [${route.id}]: Stream interrupted, restarting...`);
          return Stream.empty;
        }),
        Stream.runDrain,
      );

      yield* Effect.never;
    }) as Effect.Effect<never, Error>;
  }
}
