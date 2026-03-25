import { describe, it, expect } from "vitest";
import { validateConfig } from "../../common/config.js";
import { mockBridgeConfig } from "../fixtures.js";

describe("Config Validation", () => {
  it("accepts a valid configuration", () => {
    const config = mockBridgeConfig();
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("rejects config with no deposit addresses", () => {
    const config = mockBridgeConfig();
    config.networks.source.depositAddresses = [];
    expect(() => validateConfig(config)).toThrow(
      "at least one deposit address",
    );
  });

  it("rejects config with no sender addresses", () => {
    const config = mockBridgeConfig();
    config.networks.destination.senderAddresses = [];
    expect(() => validateConfig(config)).toThrow(
      "at least one sender address",
    );
  });

  it("rejects config where min deposit >= max transfer", () => {
    const config = mockBridgeConfig({
      bridge: {
        allowedAssets: ["ADA"],
        minDepositAmount: "100000000000",
        maxTransferAmount: "100000000000",
        feeAmount: "1000000",
      },
    });
    expect(() => validateConfig(config)).toThrow(
      "Minimum deposit amount must be less than maximum transfer amount",
    );
  });

  it("rejects config where fee >= min deposit", () => {
    const config = mockBridgeConfig({
      bridge: {
        allowedAssets: ["ADA"],
        minDepositAmount: "1000000",
        maxTransferAmount: "100000000000",
        feeAmount: "1000000",
      },
    });
    expect(() => validateConfig(config)).toThrow(
      "Fee amount must be less than minimum deposit amount",
    );
  });

  it("rejects config with duplicate gRPC ports", () => {
    const config = mockBridgeConfig({
      grpc: {
        indexerPort: 50051,
        relayerPort: 50051,
        mirrorPort: 50053,
      },
    });
    expect(() => validateConfig(config)).toThrow("must be unique");
  });

  it("rejects config with invalid source endpoint", () => {
    const config = mockBridgeConfig();
    config.networks.source.utxorpcEndpoint = "not-a-url";
    expect(() => validateConfig(config)).toThrow("valid HTTP");
  });

  it("rejects config with invalid destination endpoint", () => {
    const config = mockBridgeConfig();
    config.networks.destination.utxorpcEndpoint = "ftp://invalid";
    expect(() => validateConfig(config)).toThrow("valid HTTP");
  });

  // ── Routes ─────────────────────────────────────────────────────

  it("mockBridgeConfig includes a routes array", () => {
    const config = mockBridgeConfig();
    expect(config.routes).toBeInstanceOf(Array);
    expect(config.routes.length).toBeGreaterThan(0);
  });

  it("default route has valid structure", () => {
    const config = mockBridgeConfig();
    const route = config.routes[0];
    expect(route.id).toBeTruthy();
    expect(route.source.chainId).toMatch(/^cardano-/);
    expect(route.source.chainType).toBe("cardano");
    expect(route.destination.chainId).toMatch(/^cardano-/);
    expect(route.destination.chainType).toBe("cardano");
    expect(route.source.addresses.length).toBeGreaterThan(0);
    expect(route.destination.addresses.length).toBeGreaterThan(0);
    expect(BigInt(route.bridge.feeAmount)).toBeGreaterThan(0n);
  });
});
