// Simple relayer service for managing bridge events
import { Effect, Context, Layer, Stream, Queue } from "effect";
import { DepositEvent, BridgeState, ProcessedDeposit, PendingMirror } from "../common/types.js";
import { DatabaseService } from "../common/database.js";

// Relayer Error types
export class RelayerError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "RelayerError";
  }
}

// Define a Relayer Service using Context.Tag
export class Relayer extends Context.Tag("Relayer")<Relayer, {
  readonly publishDeposit: (event: DepositEvent) => Effect.Effect<{ success: boolean; messageId: string }, RelayerError>;
  readonly subscribeToDeposits: Stream.Stream<DepositEvent, RelayerError>;
  readonly updateMirrorStatus: (depositTxHash: string, mirrorTxHash: string, status: string, errorMessage?: string) => Effect.Effect<boolean, RelayerError>;
  readonly getBridgeState: () => Effect.Effect<BridgeState, RelayerError>;
  readonly getPendingDeposits: () => Effect.Effect<DepositEvent[], RelayerError>;
  readonly getPendingDepositsForRetry: (maxRetries?: number) => Effect.Effect<DepositEvent[], RelayerError>;
  readonly cleanupOldDeposits: (maxAgeMs?: number) => Effect.Effect<number, RelayerError>;
  readonly persistState: () => Effect.Effect<void, RelayerError>;
}>() {}

// Relayer service implementation
const makeRelayerService = (): Effect.Effect<Context.Tag.Service<Relayer>, RelayerError> =>
  Effect.gen(function* () {
    // Create Queue for pub/sub messaging
    const depositQueue = yield* Queue.unbounded<DepositEvent>();
    
    // Create database service
    const database = new DatabaseService();
    
    // Initialize database and load existing state
    yield* Effect.tryPromise({
      try: async () => {
        console.log('🔧 Relayer: Initializing with database persistence...');
        await database.initialize();
        
        const bridgeState = await database.loadBridgeState();
        console.log(`📖 Relayer: Loaded ${bridgeState.processedDeposits.length} processed deposits and ${bridgeState.pendingMirrors.length} pending mirrors`);
        console.log('✅ Relayer: Initialized successfully');
      },
      catch: (error) => new RelayerError(`Failed to initialize relayer: ${error}`, error),
    });

    return {
      publishDeposit: (event: DepositEvent) =>
        Effect.gen(function* () {
          console.log(`📤 Relayer: Publishing deposit ${event.transactionHash}`);
          
          // Store as pending mirror in database
          const pendingMirror: PendingMirror = {
            depositTxHash: event.transactionHash,
            deposit: event,
            retryCount: 0,
            lastRetryAt: BigInt(Date.now()),
          };
          
          yield* Effect.tryPromise({
            try: () => database.addPendingMirror(pendingMirror),
            catch: (error) => new RelayerError(`Failed to store pending mirror: ${error}`, error),
          });
          
          // Publish to queue for subscribers
          yield* Queue.offer(depositQueue, event);
          
          console.log(`✅ Relayer: Published deposit ${event.transactionHash} and stored as pending mirror`);
          
          return {
            success: true as boolean,
            messageId: `msg_${event.transactionHash}_${Date.now()}`
          };
        }),

      subscribeToDeposits: Stream.fromQueue(depositQueue),

      updateMirrorStatus: (depositTxHash: string, mirrorTxHash: string, status: string, errorMessage?: string) =>
        Effect.gen(function* () {
          try {
            if (status === "CONFIRMED") {
              const processed: ProcessedDeposit = {
                transactionHash: depositTxHash,
                processedAt: BigInt(Date.now()),
                mirrorTxHash,
                status: 3, // CONFIRMED
              };
              
              yield* Effect.tryPromise({
                try: async () => {
                  await database.addProcessedDeposit(processed);
                  await database.removePendingMirror(depositTxHash);
                },
                catch: (error) => new RelayerError(`Failed to update mirror status: ${error}`, error),
              });
              
              console.log(`✅ Relayer: Deposit ${depositTxHash} completed with mirror ${mirrorTxHash}`);
            } else if (status === "FAILED") {
              const bridgeState = yield* Effect.tryPromise({
                try: () => database.loadBridgeState(),
                catch: (error) => new RelayerError(`Failed to load bridge state: ${error}`, error),
              });
              
              const pending = bridgeState.pendingMirrors.find(p => p.depositTxHash === depositTxHash);
              
              if (pending) {
                const newRetryCount = pending.retryCount + 1;
                yield* Effect.tryPromise({
                  try: () => database.updatePendingMirror(depositTxHash, newRetryCount, errorMessage),
                  catch: (error) => new RelayerError(`Failed to update pending mirror: ${error}`, error),
                });
                console.log(`⚠️ Relayer: Updated pending mirror ${depositTxHash} with error (retry ${newRetryCount})`);
              } else {
                console.warn(`⚠️ No pending mirror found for deposit ${depositTxHash}`);
                return false;
              }
            }
            
            return true;
          } catch (error) {
            console.error(`❌ Relayer: Failed to update mirror status for ${depositTxHash}:`, error);
            return false;
          }
        }),

      getBridgeState: () =>
        Effect.tryPromise({
          try: () => database.loadBridgeState(),
          catch: (error) => new RelayerError(`Failed to get bridge state: ${error}`, error),
        }),

      getPendingDeposits: () =>
        Effect.gen(function* () {
          const bridgeState = yield* Effect.tryPromise({
            try: () => database.loadBridgeState(),
            catch: (error) => new RelayerError(`Failed to load bridge state: ${error}`, error),
          });
          return bridgeState.pendingMirrors.map(pm => pm.deposit);
        }),

      getPendingDepositsForRetry: (maxRetries = 3) =>
        Effect.gen(function* () {
          const bridgeState = yield* Effect.tryPromise({
            try: () => database.loadBridgeState(),
            catch: (error) => new RelayerError(`Failed to load bridge state: ${error}`, error),
          });
          return bridgeState.pendingMirrors
            .filter(pm => pm.retryCount > 0 && pm.retryCount < maxRetries)
            .map(pm => pm.deposit);
        }),

      cleanupOldDeposits: (maxAgeMs = 7 * 24 * 60 * 60 * 1000) => // 7 days default
        Effect.gen(function* () {
          const cutoffTime = BigInt(Date.now() - maxAgeMs);
          const bridgeState = yield* Effect.tryPromise({
            try: () => database.loadBridgeState(),
            catch: (error) => new RelayerError(`Failed to load bridge state: ${error}`, error),
          });
          
          const oldDeposits = bridgeState.processedDeposits.filter(
            deposit => deposit.processedAt < cutoffTime
          );

          // Note: For now we keep all deposits for audit purposes
          // In production, you might want to archive them instead of deleting
          console.log(`🧹 Relayer: Found ${oldDeposits.length} old processed deposits (keeping for audit)`);
          
          return oldDeposits.length;
        }),

      persistState: () =>
        Effect.gen(function* () {
          try {
            const bridgeState = yield* Effect.tryPromise({
              try: () => database.loadBridgeState(),
              catch: (error) => new RelayerError(`Failed to load bridge state: ${error}`, error),
            });
            
            yield* Effect.tryPromise({
              try: () => database.saveBridgeState(bridgeState),
              catch: (error) => new RelayerError(`Failed to save bridge state: ${error}`, error),
            });
            
            console.log('💾 Relayer: State persisted to database');
          } catch (error) {
            console.error('❌ Relayer: Failed to persist state:', error);
            throw error;
          }
        }),
    };
  });

// Create a Layer that provides the Relayer service
export const RelayerLive = Layer.effect(Relayer, makeRelayerService());

// All relayer functionality is now provided through the Effect-TS RelayerLive layer

// Relayer service is accessed through dependency injection in the Effect context 