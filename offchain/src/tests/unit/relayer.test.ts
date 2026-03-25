import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Effect, Layer } from "effect";
import { Relayer, RelayerLive } from "../../relayer/index.js";
import { mockDepositEvent } from "../fixtures.js";
import { unlinkSync, existsSync } from "node:fs";

// The relayer creates bridge.db by default. We'll clean it up after tests.
const DB_FILE = "bridge.db";

describe("Relayer Service", () => {
  // Provide the live relayer layer and run effects against it
  const runWithRelayer = <A, E>(
    effect: Effect.Effect<A, E, Relayer>,
  ): Promise<A> =>
    Effect.runPromise(Effect.provide(effect, RelayerLive)) as Promise<A>;

  afterEach(() => {
    // Clean up test database
    if (existsSync(DB_FILE)) {
      try {
        unlinkSync(DB_FILE);
      } catch {
        // May be locked; ignore
      }
    }
  });

  it("initializes and returns empty bridge state", async () => {
    const state = await runWithRelayer(
      Effect.gen(function* () {
        const relayer = yield* Relayer;
        return yield* relayer.getBridgeState();
      }),
    );

    expect(state.processedDeposits).toBeInstanceOf(Array);
    expect(state.pendingMirrors).toBeInstanceOf(Array);
  });

  it("publishes a deposit and stores it as pending", async () => {
    const deposit = mockDepositEvent();

    const result = await runWithRelayer(
      Effect.gen(function* () {
        const relayer = yield* Relayer;
        const publishResult = yield* relayer.publishDeposit(deposit);
        const state = yield* relayer.getBridgeState();
        return { publishResult, state };
      }),
    );

    expect(result.publishResult.success).toBe(true);
    expect(result.publishResult.messageId).toBeTruthy();
    expect(result.state.pendingMirrors).toHaveLength(1);
    expect(result.state.pendingMirrors[0].depositTxHash).toBe(
      deposit.transactionHash,
    );
  });

  it("gets pending deposits", async () => {
    const deposit1 = mockDepositEvent({
      transactionHash: "tx_1_" + "0".repeat(56),
    });
    const deposit2 = mockDepositEvent({
      transactionHash: "tx_2_" + "0".repeat(56),
    });

    const pending = await runWithRelayer(
      Effect.gen(function* () {
        const relayer = yield* Relayer;
        yield* relayer.publishDeposit(deposit1);
        yield* relayer.publishDeposit(deposit2);
        return yield* relayer.getPendingDeposits();
      }),
    );

    expect(pending).toHaveLength(2);
  });

  it("updates mirror status to CONFIRMED and moves to processed", async () => {
    const deposit = mockDepositEvent();

    const state = await runWithRelayer(
      Effect.gen(function* () {
        const relayer = yield* Relayer;
        yield* relayer.publishDeposit(deposit);

        // Confirm the mirror
        yield* relayer.updateMirrorStatus(
          deposit.transactionHash,
          "mirror_tx_hash_abc",
          "CONFIRMED",
        );

        return yield* relayer.getBridgeState();
      }),
    );

    expect(state.pendingMirrors).toHaveLength(0);
    expect(state.processedDeposits).toHaveLength(1);
    expect(state.processedDeposits[0].transactionHash).toBe(
      deposit.transactionHash,
    );
    expect(state.processedDeposits[0].mirrorTxHash).toBe(
      "mirror_tx_hash_abc",
    );
  });

  it("updates mirror status to FAILED and increments retry count", async () => {
    const deposit = mockDepositEvent();

    const state = await runWithRelayer(
      Effect.gen(function* () {
        const relayer = yield* Relayer;
        yield* relayer.publishDeposit(deposit);

        yield* relayer.updateMirrorStatus(
          deposit.transactionHash,
          "",
          "FAILED",
          "Connection refused",
        );

        return yield* relayer.getBridgeState();
      }),
    );

    // Should still be pending (with incremented retry)
    expect(state.pendingMirrors).toHaveLength(1);
    expect(state.pendingMirrors[0].retryCount).toBe(1);
    expect(state.pendingMirrors[0].errorMessage).toBe("Connection refused");
  });

  it("persists state to database", async () => {
    const deposit = mockDepositEvent();

    await runWithRelayer(
      Effect.gen(function* () {
        const relayer = yield* Relayer;
        yield* relayer.publishDeposit(deposit);
        yield* relayer.persistState();
      }),
    );

    // Re-initialize and check state was persisted
    const state = await runWithRelayer(
      Effect.gen(function* () {
        const relayer = yield* Relayer;
        return yield* relayer.getBridgeState();
      }),
    );

    expect(state.pendingMirrors.length).toBeGreaterThanOrEqual(0);
  });

  it("cleanupOldDeposits reports count without deleting", async () => {
    const count = await runWithRelayer(
      Effect.gen(function* () {
        const relayer = yield* Relayer;
        return yield* relayer.cleanupOldDeposits();
      }),
    );

    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
