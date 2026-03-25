import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Effect } from "effect";
import { createApiServer } from "../../api/index.js";
import {
  mockBridgeConfig,
  mockProcessedDeposit,
  mockPendingMirror,
} from "../fixtures.js";
import type { DepositEvent } from "../../common/types.js";
import type {
  ApiBridgeConfig,
  ApiBridgeState,
  ApiDepositStatus,
  ApiHealthResponse,
  ApiRegisterDepositResponse,
} from "@vista-bridge/shared";

// ── Mock relayer service ───────────────────────────────────────────────

function createMockRelayer(
  initialProcessed = [] as ReturnType<typeof mockProcessedDeposit>[],
  initialPending = [] as ReturnType<typeof mockPendingMirror>[],
) {
  const processedDeposits = [...initialProcessed];
  const pendingMirrors = [...initialPending];

  return {
    publishDeposit: (event: DepositEvent) =>
      Effect.succeed({
        success: true,
        messageId: `msg_${event.transactionHash}_${Date.now()}`,
      }),
    getBridgeState: () =>
      Effect.succeed({
        processedDeposits,
        pendingMirrors,
        lastProcessedSlot: BigInt(1000),
        lastProcessedBlockHash: "block_hash_test",
      }),
  };
}

// ── Test suite ─────────────────────────────────────────────────────────

const TEST_PORT = 9876;
const BASE = `http://localhost:${TEST_PORT}`;

describe("API Server", () => {
  let server: ReturnType<typeof createApiServer>;
  const config = mockBridgeConfig();
  const processed = mockProcessedDeposit();
  const pending = mockPendingMirror();
  const relayer = createMockRelayer([processed], [pending]);

  beforeAll(() => {
    server = createApiServer(relayer, config, TEST_PORT);
  });

  afterAll(() => {
    server?.stop();
  });

  // ── GET /api/health ──────────────────────────────────────────────

  describe("GET /api/health", () => {
    it("returns healthy status", async () => {
      const res = await fetch(`${BASE}/api/health`);
      expect(res.status).toBe(200);

      const body: ApiHealthResponse = await res.json();
      expect(body.healthy).toBe(true);
      expect(body.services.indexer).toBe(true);
      expect(body.services.relayer).toBe(true);
      expect(body.services.mirror).toBe(true);
      expect(body.uptime).toBeGreaterThan(0);
    });
  });

  // ── GET /api/config ──────────────────────────────────────────────

  describe("GET /api/config", () => {
    it("returns bridge configuration", async () => {
      const res = await fetch(`${BASE}/api/config`);
      expect(res.status).toBe(200);

      const body: ApiBridgeConfig = await res.json();
      expect(body.sourceNetwork).toBe("preproduction");
      expect(body.destinationNetwork).toBe("preview");
      expect(body.allowedAssets).toEqual(["ADA"]);
      expect(body.minDepositAmount).toBe("2000000");
      expect(body.maxTransferAmount).toBe("100000000000");
      expect(body.feeAmount).toBe("1000000");
      expect(body.depositAddresses).toHaveLength(1);
      expect(body.requiredConfirmations).toBe(5);
    });
  });

  // ── GET /api/routes ─────────────────────────────────────────────

  describe("GET /api/routes", () => {
    it("returns configured bridge routes", async () => {
      const res = await fetch(`${BASE}/api/routes`);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.routes).toBeInstanceOf(Array);
      expect(body.routes.length).toBeGreaterThan(0);

      const route = body.routes[0];
      expect(route.id).toBeTruthy();
      expect(route.sourceNetwork).toBe("preproduction");
      expect(route.destinationNetwork).toBe("preview");
      expect(route.sourceChainId).toBe("cardano-preprod");
      expect(route.destinationChainId).toBe("cardano-preview");
      expect(route.depositAddresses).toBeInstanceOf(Array);
      expect(route.feeAmount).toBeTruthy();
    });
  });

  // ── GET /api/state ───────────────────────────────────────────────

  describe("GET /api/state", () => {
    it("returns bridge state with counts", async () => {
      const res = await fetch(`${BASE}/api/state`);
      expect(res.status).toBe(200);

      const body: ApiBridgeState = await res.json();
      expect(body.processedCount).toBe(1);
      expect(body.pendingCount).toBe(1);
      expect(body.lastProcessedSlot).toBe("1000");
      expect(body.recentDeposits).toBeInstanceOf(Array);
      expect(body.recentDeposits.length).toBeGreaterThan(0);
    });

    it("includes both pending and processed in recentDeposits", async () => {
      const res = await fetch(`${BASE}/api/state`);
      const body: ApiBridgeState = await res.json();

      const statuses = body.recentDeposits.map((d) => d.status);
      expect(statuses).toContain("PENDING");
      expect(statuses).toContain("CONFIRMED");
    });
  });

  // ── GET /api/deposit/:txHash ─────────────────────────────────────

  describe("GET /api/deposit/:txHash", () => {
    it("finds a processed deposit by tx hash", async () => {
      const res = await fetch(
        `${BASE}/api/deposit/${processed.transactionHash}`,
      );
      expect(res.status).toBe(200);

      const body: ApiDepositStatus = await res.json();
      expect(body.depositTxHash).toBe(processed.transactionHash);
      expect(body.mirrorTxHash).toBe(processed.mirrorTxHash);
      expect(body.status).toBe("CONFIRMED");
    });

    it("finds a pending deposit by tx hash", async () => {
      const res = await fetch(
        `${BASE}/api/deposit/${pending.depositTxHash}`,
      );
      expect(res.status).toBe(200);

      const body: ApiDepositStatus = await res.json();
      expect(body.depositTxHash).toBe(pending.depositTxHash);
      expect(body.status).toBe("PENDING");
      expect(body.amount).toBe(pending.deposit.amount.toString());
    });

    it("returns 404 for unknown tx hash", async () => {
      const res = await fetch(`${BASE}/api/deposit/unknown_tx_hash`);
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.error).toBe("Deposit not found");
    });
  });

  // ── POST /api/deposit/register ───────────────────────────────────

  describe("POST /api/deposit/register", () => {
    it("registers a new deposit", async () => {
      const res = await fetch(`${BASE}/api/deposit/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositTxHash: "new_deposit_tx_hash_123",
          senderAddress: "addr_test1_sender",
          recipientAddress: "addr_test1_recipient",
          amount: "5000000",
          sourceNetwork: "preproduction",
        }),
      });
      expect(res.status).toBe(200);

      const body: ApiRegisterDepositResponse = await res.json();
      expect(body.success).toBe(true);
      expect(body.bridgeId).toBeTruthy();
      expect(body.message).toContain("registered");
    });

    it("rejects request with missing fields", async () => {
      const res = await fetch(`${BASE}/api/deposit/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositTxHash: "incomplete",
        }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── CORS ─────────────────────────────────────────────────────────

  describe("CORS", () => {
    it("includes CORS headers on responses", async () => {
      const res = await fetch(`${BASE}/api/health`, {
        headers: { Origin: "http://localhost:3000" },
      });
      expect(res.status).toBe(200);
    });
  });
});
