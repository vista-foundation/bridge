import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseService } from "../../common/database.js";
import {
  mockDepositEvent,
  mockProcessedDeposit,
  mockPendingMirror,
} from "../fixtures.js";
import { unlinkSync, existsSync } from "node:fs";

const TEST_DB = "test_bridge.db";

describe("DatabaseService", () => {
  let db: DatabaseService;

  beforeEach(async () => {
    // Clean up from previous run
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
    db = new DatabaseService(TEST_DB);
    await db.initialize();
  });

  afterEach(async () => {
    await db.close();
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  it("initializes tables without error", async () => {
    // If we get here, initialize() succeeded
    expect(true).toBe(true);
  });

  it("loads empty bridge state from fresh database", async () => {
    const state = await db.loadBridgeState();
    expect(state.processedDeposits).toHaveLength(0);
    expect(state.pendingMirrors).toHaveLength(0);
    expect(state.lastProcessedSlot).toBe(BigInt(0));
    expect(state.lastProcessedBlockHash).toBe("genesis");
  });

  it("adds and retrieves a processed deposit", async () => {
    const deposit = mockProcessedDeposit();
    await db.addProcessedDeposit(deposit);

    const state = await db.loadBridgeState();
    expect(state.processedDeposits).toHaveLength(1);
    expect(state.processedDeposits[0].transactionHash).toBe(
      deposit.transactionHash,
    );
    expect(state.processedDeposits[0].mirrorTxHash).toBe(
      deposit.mirrorTxHash,
    );
    expect(state.processedDeposits[0].status).toBe(deposit.status);
  });

  it("adds and retrieves a pending mirror", async () => {
    const pending = mockPendingMirror();
    await db.addPendingMirror(pending);

    const state = await db.loadBridgeState();
    expect(state.pendingMirrors).toHaveLength(1);
    expect(state.pendingMirrors[0].depositTxHash).toBe(
      pending.depositTxHash,
    );
    expect(state.pendingMirrors[0].deposit.amount).toBe(
      pending.deposit.amount,
    );
    expect(state.pendingMirrors[0].retryCount).toBe(0);
  });

  it("removes a pending mirror", async () => {
    const pending = mockPendingMirror();
    await db.addPendingMirror(pending);

    let state = await db.loadBridgeState();
    expect(state.pendingMirrors).toHaveLength(1);

    await db.removePendingMirror(pending.depositTxHash);

    state = await db.loadBridgeState();
    expect(state.pendingMirrors).toHaveLength(0);
  });

  it("updates a pending mirror retry count and error", async () => {
    const pending = mockPendingMirror();
    await db.addPendingMirror(pending);

    await db.updatePendingMirror(
      pending.depositTxHash,
      2,
      "Connection timeout",
    );

    const state = await db.loadBridgeState();
    expect(state.pendingMirrors[0].retryCount).toBe(2);
    expect(state.pendingMirrors[0].errorMessage).toBe("Connection timeout");
  });

  it("upserts processed deposits (INSERT OR REPLACE)", async () => {
    const deposit = mockProcessedDeposit();
    await db.addProcessedDeposit(deposit);
    await db.addProcessedDeposit({
      ...deposit,
      mirrorTxHash: "updated_mirror_hash_123",
    });

    const state = await db.loadBridgeState();
    expect(state.processedDeposits).toHaveLength(1);
    expect(state.processedDeposits[0].mirrorTxHash).toBe(
      "updated_mirror_hash_123",
    );
  });

  it("saves and loads full bridge state", async () => {
    const state = {
      processedDeposits: [mockProcessedDeposit()],
      pendingMirrors: [mockPendingMirror()],
      lastProcessedSlot: BigInt(42000),
      lastProcessedBlockHash: "block_abc123",
    };

    await db.saveBridgeState(state);
    const loaded = await db.loadBridgeState();

    expect(loaded.processedDeposits).toHaveLength(1);
    expect(loaded.pendingMirrors).toHaveLength(1);
    expect(loaded.lastProcessedSlot).toBe(BigInt(42000));
    expect(loaded.lastProcessedBlockHash).toBe("block_abc123");
  });

  it("handles multiple deposits concurrently", async () => {
    const deposits = Array.from({ length: 10 }, (_, i) =>
      mockProcessedDeposit({
        transactionHash: `tx_${i}_${"0".repeat(50)}`,
        mirrorTxHash: `mirror_${i}_${"0".repeat(50)}`,
      }),
    );

    await Promise.all(deposits.map((d) => db.addProcessedDeposit(d)));

    const state = await db.loadBridgeState();
    expect(state.processedDeposits).toHaveLength(10);
  });

  it("preserves bigint values through serialization cycle", async () => {
    const pending = mockPendingMirror({
      deposit: mockDepositEvent({
        amount: BigInt("99999999999999"),
        blockSlot: BigInt("123456789012345"),
        timestamp: BigInt("1700000000000"),
      }),
    });

    await db.addPendingMirror(pending);
    const state = await db.loadBridgeState();

    expect(state.pendingMirrors[0].deposit.amount).toBe(
      BigInt("99999999999999"),
    );
    expect(state.pendingMirrors[0].deposit.blockSlot).toBe(
      BigInt("123456789012345"),
    );
    expect(state.pendingMirrors[0].deposit.timestamp).toBe(
      BigInt("1700000000000"),
    );
  });
});
