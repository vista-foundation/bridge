import { describe, it, expect } from "vitest";
import type {
  ApiBridgeConfig,
  ApiDepositStatus,
  ApiBridgeState,
  ApiHealthResponse,
  ApiRegisterDepositRequest,
  ApiRegisterDepositResponse,
  ApiErrorResponse,
  DepositStatusType,
} from "@vista-bridge/shared";

describe("Shared API Types", () => {
  it("ApiBridgeConfig is JSON-serializable (no bigint)", () => {
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

    // Should round-trip through JSON without error
    const json = JSON.stringify(config);
    const parsed = JSON.parse(json) as ApiBridgeConfig;
    expect(parsed).toEqual(config);
  });

  it("ApiDepositStatus handles all status types", () => {
    const statuses: DepositStatusType[] = [
      "PENDING",
      "SUBMITTED",
      "CONFIRMED",
      "FAILED",
    ];

    for (const status of statuses) {
      const deposit: ApiDepositStatus = {
        depositTxHash: "tx_123",
        mirrorTxHash: "",
        status,
        amount: "5000000",
        senderAddress: "sender",
        recipientAddress: "recipient",
        timestamp: Date.now().toString(),
      };

      const json = JSON.stringify(deposit);
      const parsed = JSON.parse(json) as ApiDepositStatus;
      expect(parsed.status).toBe(status);
    }
  });

  it("ApiDepositStatus optional errorMessage", () => {
    const withError: ApiDepositStatus = {
      depositTxHash: "tx_123",
      mirrorTxHash: "",
      status: "FAILED",
      amount: "5000000",
      senderAddress: "sender",
      recipientAddress: "recipient",
      errorMessage: "Connection timeout",
      timestamp: Date.now().toString(),
    };

    const json = JSON.stringify(withError);
    const parsed = JSON.parse(json) as ApiDepositStatus;
    expect(parsed.errorMessage).toBe("Connection timeout");

    // Without error
    const withoutError: ApiDepositStatus = {
      depositTxHash: "tx_123",
      mirrorTxHash: "mirror_456",
      status: "CONFIRMED",
      amount: "5000000",
      senderAddress: "sender",
      recipientAddress: "recipient",
      timestamp: Date.now().toString(),
    };

    expect(JSON.stringify(withoutError)).not.toContain("errorMessage");
  });

  it("ApiBridgeState is JSON-serializable", () => {
    const state: ApiBridgeState = {
      processedCount: 42,
      pendingCount: 3,
      lastProcessedSlot: "999999",
      recentDeposits: [
        {
          depositTxHash: "tx_1",
          mirrorTxHash: "mirror_1",
          status: "CONFIRMED",
          amount: "10000000",
          senderAddress: "sender_1",
          recipientAddress: "recipient_1",
          timestamp: "1700000000000",
        },
      ],
    };

    const json = JSON.stringify(state);
    const parsed = JSON.parse(json) as ApiBridgeState;
    expect(parsed.processedCount).toBe(42);
    expect(parsed.recentDeposits).toHaveLength(1);
  });

  it("ApiRegisterDepositRequest round-trips", () => {
    const req: ApiRegisterDepositRequest = {
      depositTxHash: "tx_hash_abc",
      senderAddress: "addr_sender",
      recipientAddress: "addr_recipient",
      amount: "5000000",
      sourceNetwork: "preproduction",
    };

    const json = JSON.stringify(req);
    const parsed = JSON.parse(json) as ApiRegisterDepositRequest;
    expect(parsed).toEqual(req);
  });

  it("ApiHealthResponse structure", () => {
    const health: ApiHealthResponse = {
      healthy: true,
      services: {
        indexer: true,
        relayer: true,
        mirror: false,
      },
      uptime: 12345,
    };

    expect(health.services.indexer).toBe(true);
    expect(health.services.mirror).toBe(false);
  });

  it("ApiErrorResponse structure", () => {
    const error: ApiErrorResponse = {
      error: "NOT_FOUND",
      message: "Deposit not found",
    };

    expect(error.error).toBe("NOT_FOUND");
    expect(error.message).toBe("Deposit not found");
  });

  it("amount strings represent lovelace correctly", () => {
    // 1 ADA = 1,000,000 lovelace
    const oneAda = "1000000";
    const fiveAda = "5000000";
    const maxDefault = "100000000000"; // 100,000 ADA

    expect(Number(oneAda) / 1_000_000).toBe(1);
    expect(Number(fiveAda) / 1_000_000).toBe(5);
    expect(Number(maxDefault) / 1_000_000).toBe(100_000);
  });
});
