import { test, expect } from "@playwright/test";
import * as path from "path";

const BACKEND_URL = "http://localhost:3001";
const INJECT_SCRIPT = path.resolve(__dirname, "fixtures/inject-wallet.js");

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

test.describe("HOSKY Bridge UI E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ path: INJECT_SCRIPT });
  });

  test("UI: tHOSKY Preprod → vHOSKY Preview (mint)", async ({ page }) => {
    test.setTimeout(240_000);

    // ── Fetch route info for the API bridge call later ────────────
    const routes = await apiGet("/api/routes");
    const route = routes.routes.find((r: any) => r.sourceNetwork === "preproduction");
    if (!route) { test.skip(true, "No preprod-to-preview route"); return; }
    const hoskyConfig = route.assetConfigs?.find((a: any) => a.symbol === "HOSKY");
    if (!hoskyConfig) { test.skip(true, "No HOSKY config"); return; }
    const walletAddr = (await apiGet("/api/test/wallet/address")).bech32;

    // ── 1. Navigate to app ────────────────────────────────────────
    await page.goto("/app");
    await expect(page.locator("h2:has-text('Bridge Assets')")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);

    // ── 2. Connect wallet ─────────────────────────────────────────
    // Click the small "Connect" button inside the sender row
    await page.locator("button:has-text('Connect')").first().click();
    await page.waitForTimeout(500);
    await expect(page.locator("h3:has-text('Connect Wallet')")).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);
    await page.locator("button:has-text('Test Wallet')").click();
    await page.waitForTimeout(2000);
    await expect(page.locator("button:has-text('Bridge')")).toBeVisible({ timeout: 15_000 });

    // ── 3. Fill receiver address ──────────────────────────────────
    const receiverInput = page.locator("input[placeholder*='Agrologos']");
    await receiverInput.fill(walletAddr);
    await page.waitForTimeout(500);

    // ── 4. Enter amount ───────────────────────────────────────────
    // The amount input is inside the "Send" section — it's the large number input
    const amountInput = page.locator("input.text-white.text-\\[22px\\], input.text-white.text-\\[26px\\]").first();
    await amountInput.click();
    await amountInput.fill("");
    await amountInput.type("1000");
    await page.waitForTimeout(800);

    // ── 5. Screenshot: filled form ────────────────────────────────
    await page.screenshot({ path: "test-results/01-thosky-preprod-form.png", fullPage: true });

    // ── 6. Submit the HOSKY deposit via API (mock wallet can't build token txs) ─
    console.log("[UI Test] Submitting tHOSKY deposit via API...");
    const depositResult = await apiPost("/api/test/wallet/deposit", {
      depositAddress: route.depositAddresses[0],
      recipientAddress: walletAddr,
      amount: "2000000",
      network: "preprod",
      assetType: "HOSKY",
      assetUnit: hoskyConfig.sourceUnit,
      assetQuantity: "1000000",
    });
    expect(depositResult.txHash).toBeTruthy();
    console.log(`[UI Test] Deposit tx: ${depositResult.txHash}`);

    // Register
    await apiPost("/api/deposit/register", {
      depositTxHash: depositResult.txHash,
      senderAddress: walletAddr,
      recipientAddress: walletAddr,
      amount: "1000000",
      sourceNetwork: "preproduction",
      routeId: route.id,
      assetType: "HOSKY",
    });

    // ── 7. Navigate to history and watch it confirm ───────────────
    await page.goto("/app/history");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/02-thosky-history-pending.png", fullPage: true });

    // Poll until confirmed
    let status = "PENDING";
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(5000);
      const statusResp = await apiGet(`/api/deposit/${depositResult.txHash}`);
      status = statusResp.status ?? "PENDING";
      console.log(`[UI Test] [${(i + 1) * 5}s] ${status}`);
      if (status === "CONFIRMED" || status === "FAILED") break;

      // Reload history to show updated state
      await page.reload();
      await page.waitForTimeout(1000);
    }

    expect(status).toBe("CONFIRMED");
    await page.reload();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/03-thosky-history-confirmed.png", fullPage: true });

    console.log("[UI Test] tHOSKY → vHOSKY bridge CONFIRMED");
  });

  test("UI: vHOSKY Preview → tHOSKY Preprod (send)", async ({ page }) => {
    test.setTimeout(240_000);

    // ── Fetch route info ──────────────────────────────────────────
    const routes = await apiGet("/api/routes");
    const route = routes.routes.find((r: any) => r.sourceNetwork === "preview");
    if (!route) { test.skip(true, "No preview-to-preprod route"); return; }
    const hoskyConfig = route.assetConfigs?.find((a: any) => a.symbol === "HOSKY");
    if (!hoskyConfig) { test.skip(true, "No HOSKY config"); return; }
    const walletAddr = (await apiGet("/api/test/wallet/address")).bech32;

    // ── 1. Navigate to app ────────────────────────────────────────
    await page.goto("/app");
    await expect(page.locator("h2:has-text('Bridge Assets')")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500);

    // ── 2. Swap networks: click the swap chevron button ───────────
    const swapBtn = page.locator("img[alt='swap']").locator("..");
    await swapBtn.click();
    await page.waitForTimeout(1000);

    // Verify Agrologos is now "From"
    await page.screenshot({ path: "test-results/04-vhosky-swapped-networks.png", fullPage: true });

    // ── 3. Connect wallet ─────────────────────────────────────────
    await page.locator("button:has-text('Connect')").first().click();
    await page.waitForTimeout(500);
    const walletBtn = page.locator("button:has-text('Test Wallet')");
    if (await walletBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await walletBtn.click();
      await page.waitForTimeout(2000);
    }
    await expect(page.locator("button:has-text('Bridge')")).toBeVisible({ timeout: 15_000 });

    // ── 4. Fill receiver address ──────────────────────────────────
    const receiverInput = page.locator("input[placeholder*='Paste']").last();
    await receiverInput.fill(walletAddr);
    await page.waitForTimeout(500);

    // ── 5. Enter amount ───────────────────────────────────────────
    const amountInput = page.locator("input.text-white.text-\\[22px\\], input.text-white.text-\\[26px\\]").first();
    await amountInput.click();
    await amountInput.fill("");
    await amountInput.type("500");
    await page.waitForTimeout(800);

    // ── 6. Screenshot: filled form ────────────────────────────────
    await page.screenshot({ path: "test-results/05-vhosky-preview-form.png", fullPage: true });

    // ── 7. Submit vHOSKY deposit via API ──────────────────────────
    console.log("[UI Test] Submitting vHOSKY deposit via API...");
    const depositResult = await apiPost("/api/test/wallet/deposit", {
      depositAddress: route.depositAddresses[0],
      recipientAddress: walletAddr,
      amount: "2000000",
      network: "preview",
      assetType: "HOSKY",
      assetUnit: hoskyConfig.sourceUnit,
      assetQuantity: "500000",
    });
    expect(depositResult.txHash).toBeTruthy();
    console.log(`[UI Test] Deposit tx: ${depositResult.txHash}`);

    await apiPost("/api/deposit/register", {
      depositTxHash: depositResult.txHash,
      senderAddress: walletAddr,
      recipientAddress: walletAddr,
      amount: "500000",
      sourceNetwork: "preview",
      routeId: route.id,
      assetType: "HOSKY",
    });

    // ── 8. Navigate to history and watch it confirm ───────────────
    await page.goto("/app/history");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/06-vhosky-history-pending.png", fullPage: true });

    let status = "PENDING";
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(5000);
      const statusResp = await apiGet(`/api/deposit/${depositResult.txHash}`);
      status = statusResp.status ?? "PENDING";
      console.log(`[UI Test] [${(i + 1) * 5}s] ${status}`);
      if (status === "CONFIRMED" || status === "FAILED") break;
      await page.reload();
      await page.waitForTimeout(1000);
    }

    expect(status).toBe("CONFIRMED");
    await page.reload();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test-results/07-vhosky-history-confirmed.png", fullPage: true });

    console.log("[UI Test] vHOSKY → tHOSKY bridge CONFIRMED");
  });
});
