import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  ApiBridgeConfig,
  ApiHealthResponse,
  ApiBridgeState,
  ApiDepositStatus,
  ApiRegisterDepositResponse,
} from "@vista-bridge/shared";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
import { bridgeApi } from "./api-client";

function mockJsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
  };
}

describe("bridgeApi", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("getHealth", () => {
    it("fetches /api/health", async () => {
      const health: ApiHealthResponse = {
        healthy: true,
        services: { indexer: true, relayer: true, mirror: true },
        uptime: 5000,
      };
      mockFetch.mockResolvedValueOnce(mockJsonResponse(health));

      const result = await bridgeApi.getHealth();
      expect(result.healthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/health"),
      );
    });
  });

  describe("getConfig", () => {
    it("fetches /api/config and returns bridge config", async () => {
      const config: ApiBridgeConfig = {
        sourceNetwork: "preproduction",
        destinationNetwork: "preview",
        allowedAssets: ["ADA"],
        minDepositAmount: "2000000",
        maxTransferAmount: "100000000000",
        feeAmount: "1000000",
        depositAddresses: ["addr_test1..."],
        requiredConfirmations: 5,
      };
      mockFetch.mockResolvedValueOnce(mockJsonResponse(config));

      const result = await bridgeApi.getConfig();
      expect(result.sourceNetwork).toBe("preproduction");
      expect(result.feeAmount).toBe("1000000");
    });
  });

  describe("getState", () => {
    it("fetches /api/state", async () => {
      const state: ApiBridgeState = {
        processedCount: 10,
        pendingCount: 2,
        lastProcessedSlot: "50000",
        recentDeposits: [],
      };
      mockFetch.mockResolvedValueOnce(mockJsonResponse(state));

      const result = await bridgeApi.getState();
      expect(result.processedCount).toBe(10);
      expect(result.pendingCount).toBe(2);
    });
  });

  describe("getDepositStatus", () => {
    it("fetches /api/deposit/:txHash", async () => {
      const status: ApiDepositStatus = {
        depositTxHash: "tx_abc",
        mirrorTxHash: "mirror_def",
        status: "CONFIRMED",
        amount: "5000000",
        senderAddress: "sender",
        recipientAddress: "recipient",
        timestamp: "1700000000000",
      };
      mockFetch.mockResolvedValueOnce(mockJsonResponse(status));

      const result = await bridgeApi.getDepositStatus("tx_abc");
      expect(result.status).toBe("CONFIRMED");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/deposit/tx_abc"),
      );
    });
  });

  describe("registerDeposit", () => {
    it("POSTs to /api/deposit/register", async () => {
      const response: ApiRegisterDepositResponse = {
        success: true,
        bridgeId: "msg_123",
        message: "Deposit registered",
      };
      mockFetch.mockResolvedValueOnce(mockJsonResponse(response));

      const result = await bridgeApi.registerDeposit({
        depositTxHash: "tx_new",
        senderAddress: "sender",
        recipientAddress: "recipient",
        amount: "5000000",
        sourceNetwork: "preproduction",
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/deposit/register"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
  });

  describe("error handling", () => {
    it("throws on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({}, 500));

      await expect(bridgeApi.getHealth()).rejects.toThrow("API error: 500");
    });

    it("throws on 404", async () => {
      mockFetch.mockResolvedValueOnce(
        mockJsonResponse({ error: "Not found" }, 404),
      );

      await expect(
        bridgeApi.getDepositStatus("unknown"),
      ).rejects.toThrow("API error: 404");
    });

    it("throws on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(bridgeApi.getHealth()).rejects.toThrow("Network error");
    });
  });
});
