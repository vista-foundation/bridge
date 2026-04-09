import { describe, it, expect } from "vitest";
import { getAssetConfig } from "../../common/route.js";
import { validateConfig } from "../../common/config.js";
import {
  mockBridgeRoute,
  mockBridgeRouteWithTokens,
  mockBridgeConfig,
  mockHoskyAssetConfig,
  mockDepositEvent,
  MOCK_THOSKY_UNIT,
  MOCK_VHOSKY_UNIT,
} from "../fixtures.js";

// ── getAssetConfig ────────────────────────────────────────────────────

describe("getAssetConfig", () => {
  it("returns ADA defaults from route-level fields", () => {
    const route = mockBridgeRoute();
    const cfg = getAssetConfig(route, "ADA");

    expect(cfg.sourceUnit).toBe("");
    expect(cfg.destinationUnit).toBe("");
    expect(cfg.destinationAction).toBe("send");
    expect(cfg.decimals).toBe(6);
    expect(cfg.minDepositAmount).toBe(route.bridge.minDepositAmount);
    expect(cfg.feeLovelace).toBe(route.bridge.feeAmount);
  });

  it("returns explicit asset config for HOSKY", () => {
    const route = mockBridgeRouteWithTokens();
    const cfg = getAssetConfig(route, "HOSKY");

    expect(cfg.sourceUnit).toBe(MOCK_THOSKY_UNIT);
    expect(cfg.destinationUnit).toBe(MOCK_VHOSKY_UNIT);
    expect(cfg.destinationAction).toBe("mint");
    expect(cfg.decimals).toBe(0);
    expect(cfg.mintScriptType).toBe("sig");
  });

  it("falls back to ADA defaults for unknown symbol", () => {
    const route = mockBridgeRouteWithTokens();
    const cfg = getAssetConfig(route, "UNKNOWN");

    expect(cfg.sourceUnit).toBe("");
    expect(cfg.destinationAction).toBe("send");
  });

  it("returns ADA defaults when no assetConfigs on route", () => {
    const route = mockBridgeRoute(); // no assetConfigs
    const cfg = getAssetConfig(route, "HOSKY");

    expect(cfg.sourceUnit).toBe("");
    expect(cfg.decimals).toBe(6);
  });
});

// ── Config validation with assetConfigs ───────────────────────────────

describe("validateConfig with assetConfigs", () => {
  it("accepts config with valid assetConfigs", () => {
    const route = mockBridgeRouteWithTokens();
    const config = mockBridgeConfig({ routes: [route], bridge: route.bridge });
    expect(() => validateConfig(config)).not.toThrow();
  });

  it("rejects assetConfig symbol not in allowedAssets", () => {
    const route = mockBridgeRoute();
    route.bridge.allowedAssets = ["ADA"]; // no HOSKY
    route.bridge.assetConfigs = { HOSKY: mockHoskyAssetConfig() };
    const config = mockBridgeConfig({ routes: [route], bridge: route.bridge });

    expect(() => validateConfig(config)).toThrow('not in allowedAssets');
  });

  it("rejects mint action without mintScriptType", () => {
    const route = mockBridgeRouteWithTokens();
    route.bridge.assetConfigs!.HOSKY.mintScriptType = undefined;
    const config = mockBridgeConfig({ routes: [route], bridge: route.bridge });

    expect(() => validateConfig(config)).toThrow('no mintScriptType');
  });

  it("rejects assetConfig where min >= max", () => {
    const route = mockBridgeRouteWithTokens();
    route.bridge.assetConfigs!.HOSKY.minDepositAmount = "999999999";
    route.bridge.assetConfigs!.HOSKY.maxTransferAmount = "999999999";
    const config = mockBridgeConfig({ routes: [route], bridge: route.bridge });

    expect(() => validateConfig(config)).toThrow('minDepositAmount must be less than maxTransferAmount');
  });
});

// ── DepositEvent with attachedLovelace ────────────────────────────────

describe("DepositEvent multi-asset fields", () => {
  it("supports token deposit with attachedLovelace", () => {
    const deposit = mockDepositEvent({
      assetType: "HOSKY",
      amount: BigInt(1000000),
      attachedLovelace: BigInt(2000000),
    });

    expect(deposit.assetType).toBe("HOSKY");
    expect(deposit.amount).toBe(BigInt(1000000));
    expect(deposit.attachedLovelace).toBe(BigInt(2000000));
  });

  it("backward compatible: ADA deposit has no attachedLovelace", () => {
    const deposit = mockDepositEvent();
    expect(deposit.assetType).toBe("ADA");
    expect(deposit.attachedLovelace).toBeUndefined();
  });
});
