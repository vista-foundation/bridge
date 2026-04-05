import { test, expect } from "@playwright/test";
import * as path from "path";

const BACKEND_URL = "http://localhost:3001";
const INJECT_SCRIPT = path.resolve(__dirname, "fixtures/inject-wallet.js");

// ── Helpers ──────────────────────────────────────────────────────────

async function apiGet(urlPath: string) {
  const resp = await fetch(`${BACKEND_URL}${urlPath}`);
  return resp.json();
}

async function apiPost(urlPath: string, body: unknown) {
  const resp = await fetch(`${BACKEND_URL}${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
}

/**
 * Submits a deposit, registers it, polls until CONFIRMED.
 * Returns { depositTxHash, mirrorTxHash, status }.
 */
async function runBridgeFlow(opts: {
  routeId: string;
  depositAddress: string;
  recipientAddress: string;
  amount: string;
  sourceNetwork: string;
  network: string; // "preprod" or "preview" — which chain the deposit tx goes to
  label: string;
  /** For native token deposits */
  assetType?: string;
  assetUnit?: string;
  assetQuantity?: string;
}) {
  // Submit deposit via test wallet
  const isToken = opts.assetType && opts.assetType !== "ADA";
  const depositLabel = isToken
    ? `${opts.assetQuantity} ${opts.assetType}`
    : `${Number(opts.amount) / 1e6} ADA`;
  console.log(`[${opts.label}] Submitting deposit: ${depositLabel} → ${opts.depositAddress.slice(0, 20)}... (${opts.network})`);
  const depositResult = await apiPost("/api/test/wallet/deposit", {
    depositAddress: opts.depositAddress,
    recipientAddress: opts.recipientAddress,
    amount: opts.amount,
    network: opts.network,
    assetType: opts.assetType,
    assetUnit: opts.assetUnit,
    assetQuantity: opts.assetQuantity,
  });

  if (depositResult.error) {
    console.log(`[${opts.label}] Deposit failed: ${depositResult.error}`);
    return { depositTxHash: "", mirrorTxHash: "", status: "FAILED", error: depositResult.error };
  }

  const txHash: string = depositResult.txHash;
  console.log(`[${opts.label}] Deposit tx: ${txHash}`);

  // Register with bridge
  const regResult = await apiPost("/api/deposit/register", {
    depositTxHash: txHash,
    senderAddress: (await apiGet("/api/test/wallet/address")).bech32,
    recipientAddress: opts.recipientAddress,
    amount: isToken ? opts.assetQuantity : opts.amount,
    sourceNetwork: opts.sourceNetwork,
    routeId: opts.routeId,
    assetType: opts.assetType,
  });
  console.log(`[${opts.label}] Registered: ${regResult.bridgeId}`);

  // Poll for status
  let status = "PENDING";
  let mirrorTxHash = "";

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusResp = await apiGet(`/api/deposit/${txHash}`);
    status = statusResp.status ?? "PENDING";
    mirrorTxHash = statusResp.mirrorTxHash ?? "";

    console.log(
      `[${opts.label}] [${(i + 1) * 5}s] ${status}${mirrorTxHash ? ` | Mirror: ${mirrorTxHash.slice(0, 16)}...` : ""}`,
    );

    if (status === "CONFIRMED" || status === "FAILED") break;
  }

  return { depositTxHash: txHash, mirrorTxHash, status };
}

// ── Test Suite ───────────────────────────────────────────────────────

test.describe("Vista Bridge E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ path: INJECT_SCRIPT });
  });

  // ── API tests ────────────────────────────────────────────────────

  test("backend health check", async () => {
    const body = await apiGet("/api/health");
    expect(body.healthy).toBe(true);
  });

  test("backend returns bridge routes", async () => {
    const data = await apiGet("/api/routes");
    expect(data.routes).toBeInstanceOf(Array);
    expect(data.routes.length).toBeGreaterThan(0);

    const route = data.routes[0];
    expect(route.id).toBeTruthy();
    expect(route.depositAddresses.length).toBeGreaterThan(0);
    expect(route.feeAmount).toBeTruthy();
    console.log(`Routes: ${data.routes.map((r: any) => r.id).join(", ")}`);
  });

  test("backward compat: GET /api/config still works", async () => {
    const config = await apiGet("/api/config");
    expect(config.sourceNetwork).toBeTruthy();
    expect(config.depositAddresses.length).toBeGreaterThan(0);
  });

  test("test wallet has funds", async () => {
    const data = await apiGet("/api/test/wallet/balance");
    const ada = Number(data.lovelace) / 1e6;
    expect(ada).toBeGreaterThan(0);
    console.log(`Test wallet balance: ${ada} ADA`);
  });

  // ── UI tests ─────────────────────────────────────────────────────

  test("app page loads and shows bridge panel", async ({ page }) => {
    await page.goto("/app");
    await expect(page.locator("h2:has-text('Bridge Assets')")).toBeVisible({
      timeout: 15000,
    });
  });

  test("injected wallet appears and connects", async ({ page }) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    await page.locator("button:has-text('Connect')").first().click();
    await expect(page.locator("h3:has-text('Connect Wallet')")).toBeVisible();
    await expect(page.locator("text=Test Wallet")).toBeVisible({ timeout: 5000 });

    await page.locator("button:has-text('Test Wallet')").click();
    await expect(page.locator("button:has-text('Bridge ADA')")).toBeVisible({
      timeout: 15000,
    });
  });

  // ── Full bridge flow: Preprod → Preview ──────────────────────────

  test("full bridge: preprod → preview", async ({ page }) => {
    test.setTimeout(180_000);

    const balanceData = await apiGet("/api/test/wallet/balance");
    const walletAda = Number(balanceData.lovelace) / 1e6;
    if (walletAda < 5) {
      test.skip(true, `Need at least 5 ADA, have ${walletAda}`);
      return;
    }

    const routes = await apiGet("/api/routes");
    const route = routes.routes.find((r: any) => r.sourceNetwork === "preproduction");
    if (!route) {
      test.skip(true, "No preprod-to-preview route configured");
      return;
    }

    const result = await runBridgeFlow({
      routeId: route.id,
      depositAddress: route.depositAddresses[0],
      recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80",
      amount: "3000000",
      sourceNetwork: "preproduction",
      network: "preprod",
      label: "Preprod→Preview",
    });

    expect(result.status).toBe("CONFIRMED");
    expect(result.mirrorTxHash).toBeTruthy();

    console.log("\n=== Preprod → Preview ===");
    console.log(`Deposit: ${result.depositTxHash}`);
    console.log(`Mirror:  ${result.mirrorTxHash}`);
    console.log("=========================\n");
  });

  // ── Full bridge flow: Preview → Preprod ──────────────────────────

  test("full bridge: preview → preprod", async ({ page }) => {
    test.setTimeout(180_000);

    const balanceData = await apiGet("/api/test/wallet/balance");
    const walletAda = Number(balanceData.lovelace) / 1e6;
    if (walletAda < 5) {
      test.skip(true, `Need at least 5 ADA, have ${walletAda}`);
      return;
    }

    const routes = await apiGet("/api/routes");
    const route = routes.routes.find((r: any) => r.sourceNetwork === "preview");
    if (!route) {
      test.skip(true, "No preview-to-preprod route configured");
      return;
    }

    const result = await runBridgeFlow({
      routeId: route.id,
      depositAddress: route.depositAddresses[0],
      recipientAddress: "addr_test1qpnueplse6f4d55eumh7f3tzp3wx882xk7qs6ydxtynrfsw89vzfjf0v4yca056el40n7pr568rdls6lp6eu0dwek9nqku88yp",
      amount: "3000000",
      sourceNetwork: "preview",
      network: "preview",
      label: "Preview→Preprod",
    });

    expect(result.status).toBe("CONFIRMED");
    expect(result.mirrorTxHash).toBeTruthy();

    console.log("\n=== Preview → Preprod ===");
    console.log(`Deposit: ${result.depositTxHash}`);
    console.log(`Mirror:  ${result.mirrorTxHash}`);
    console.log("=========================\n");
  });

  // ── Full bridge flow: tHOSKY Preprod → vHOSKY Preview (mint) ────

  test("full bridge: tHOSKY preprod → vHOSKY preview (mint)", async ({ page }) => {
    test.setTimeout(180_000);

    const routes = await apiGet("/api/routes");
    const route = routes.routes.find((r: any) => r.sourceNetwork === "preproduction");
    if (!route) {
      test.skip(true, "No preprod-to-preview route configured");
      return;
    }

    const hoskyConfig = route.assetConfigs?.find((a: any) => a.symbol === "HOSKY");
    if (!hoskyConfig) {
      test.skip(true, "No HOSKY assetConfig on preprod-to-preview route");
      return;
    }

    const walletAddr = (await apiGet("/api/test/wallet/address")).bech32;

    const result = await runBridgeFlow({
      routeId: route.id,
      depositAddress: route.depositAddresses[0],
      recipientAddress: walletAddr,
      amount: "2000000", // ADA for min-UTxO
      sourceNetwork: "preproduction",
      network: "preprod",
      label: "tHOSKY→vHOSKY",
      assetType: "HOSKY",
      assetUnit: hoskyConfig.sourceUnit,
      assetQuantity: "1000000", // 1M tHOSKY
    });

    expect(result.status).toBe("CONFIRMED");
    expect(result.mirrorTxHash).toBeTruthy();

    console.log("\n=== tHOSKY → vHOSKY (mint) ===");
    console.log(`Deposit: ${result.depositTxHash}`);
    console.log(`Mirror:  ${result.mirrorTxHash}`);
    console.log("===============================\n");
  });
});
