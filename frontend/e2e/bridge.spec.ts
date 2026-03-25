import { test, expect } from "@playwright/test";
import * as path from "path";

const BACKEND_URL = "http://localhost:3001";
const INJECT_SCRIPT = path.resolve(__dirname, "fixtures/inject-wallet.js");

// ── Helpers ──────────────────────────────────────────────────────────

async function apiGet(path: string) {
  const resp = await fetch(`${BACKEND_URL}${path}`);
  return resp.json();
}

async function apiPost(path: string, body: unknown) {
  const resp = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json();
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

  test("backend returns bridge config with deposit address", async () => {
    const config = await apiGet("/api/config");
    expect(config.sourceNetwork).toBe("preproduction");
    expect(config.depositAddresses.length).toBeGreaterThan(0);
    expect(config.feeAmount).toBeTruthy();
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

  test("shows fee from bridge config", async ({ page }) => {
    await page.goto("/app");
    await expect(page.locator("text=Fee")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=1 ADA")).toBeVisible();
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
    await expect(page.locator("text=Sender")).toBeVisible();
  });

  test("validates receiver address", async ({ page }) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");

    await page.locator("button:has-text('Connect')").first().click();
    await page.locator("button:has-text('Test Wallet')").click();
    await expect(page.locator("button:has-text('Bridge ADA')")).toBeVisible({
      timeout: 15000,
    });

    const receiverInput = page.locator("input[placeholder*='Paste']").last();
    await receiverInput.fill("invalid_address");
    await expect(page.locator("text=\u2716")).toBeVisible();

    await receiverInput.fill("0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80");
    await expect(page.locator("text=\u2714").first()).toBeVisible();
  });

  // ── Full bridge flow: deposit → confirmation → mirror ────────────

  test("full bridge: deposit on preprod → mirror on preview", async ({ page }) => {
    test.setTimeout(180_000); // 3 min for on-chain confirmations

    // ── Step 1: Verify wallet has enough funds ─────────────────────
    const balanceData = await apiGet("/api/test/wallet/balance");
    const walletAda = Number(balanceData.lovelace) / 1e6;
    console.log(`[Step 1] Test wallet balance: ${walletAda} ADA`);
    if (walletAda < 5) {
      test.skip(true, `Need at least 5 ADA, have ${walletAda}`);
      return;
    }

    // ── Step 2: Get bridge config ──────────────────────────────────
    const config = await apiGet("/api/config");
    const depositAddress = config.depositAddresses[0];
    const feeAda = Number(config.feeAmount) / 1e6;
    console.log(`[Step 2] Deposit address: ${depositAddress}`);
    console.log(`[Step 2] Bridge fee: ${feeAda} ADA`);

    // ── Step 3: Submit deposit tx ───────────────────────────────────
    const depositAmount = "3000000"; // 3 ADA
    const recipientAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80";

    console.log(`[Step 3] Submitting deposit: 3 ADA → ${depositAddress}`);
    const depositResult = await apiPost("/api/test/wallet/deposit", {
      depositAddress,
      recipientAddress,
      amount: depositAmount,
    });

    expect(depositResult.error).toBeUndefined();
    expect(depositResult.txHash).toBeTruthy();
    const txHash: string = depositResult.txHash;
    console.log(`[Step 3] Deposit tx: ${txHash}`);

    // ── Step 4: Register deposit with bridge backend ─────────────
    const testWalletAddr = (await apiGet("/api/test/wallet/address")).bech32;
    const registerResult = await apiPost("/api/deposit/register", {
      depositTxHash: txHash,
      senderAddress: testWalletAddr,
      recipientAddress,
      amount: depositAmount,
      sourceNetwork: "preproduction",
    });
    expect(registerResult.success).toBe(true);
    console.log(`[Step 4] Registered: ${registerResult.bridgeId}`);

    // ── Step 5: Poll until CONFIRMED or FAILED ───────────────────
    let finalStatus = "PENDING";
    let mirrorTxHash = "";

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusResp = await apiGet(`/api/deposit/${txHash}`);
      finalStatus = statusResp.status ?? "PENDING";
      mirrorTxHash = statusResp.mirrorTxHash ?? "";

      console.log(
        `[Step 5] [${(i + 1) * 5}s] ${finalStatus}${mirrorTxHash ? ` | Mirror: ${mirrorTxHash.slice(0, 16)}...` : ""}`,
      );

      if (finalStatus === "CONFIRMED" || finalStatus === "FAILED") break;
    }

    // ── Step 6: Verify CONFIRMED with mirror tx hash ─────────────
    expect(finalStatus).toBe("CONFIRMED");
    expect(mirrorTxHash).toBeTruthy();

    const finalState = await apiGet("/api/state");
    console.log(`[Step 6] ${finalState.processedCount} processed, ${finalState.pendingCount} pending`);

    // ── Summary ────────────────────────────────────────────────────
    console.log("\n=== Bridge E2E Summary ===");
    console.log(`Deposit TX (Preprod):  ${txHash}`);
    console.log(`Mirror TX (Preview):   ${mirrorTxHash}`);
    console.log(`Status:                ${finalStatus}`);
    console.log(`Amount:                3 ADA`);
    console.log("==========================\n");
  });
});
