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

test.describe("History Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript({ path: INJECT_SCRIPT });
  });

  test("history page shows empty state when no deposits exist", async ({ page }) => {
    // Clear any existing deposit data in localStorage
    await page.goto("/app/history");
    await page.evaluate(() => localStorage.removeItem("vista-bridge:deposits"));
    await page.reload();

    await expect(page.locator("h1:has-text('Transaction History')")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=No transactions yet")).toBeVisible();
    await expect(page.locator("text=Start bridging")).toBeVisible();
  });

  test("history page renders deposits from localStorage", async ({ page }) => {
    const mockDeposit = {
      txHash: "abc123def456789012345678abcdef0123456789abcdef0123456789abcdef01",
      fromNetworkId: "cardano",
      fromNetworkName: "Cardano",
      toNetworkId: "ethereum",
      toNetworkName: "Ethereum",
      token: "ADA",
      outputToken: "vADA",
      amount: "100",
      senderAddress: "addr_test1abc",
      recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80",
      timestamp: Date.now() - 60_000,
    };

    // Pre-populate localStorage before navigating
    await page.goto("/app/history");
    await page.evaluate((deposit) => {
      localStorage.setItem("vista-bridge:deposits", JSON.stringify([deposit]));
    }, mockDeposit);
    await page.reload();

    // Verify the transaction appears
    await expect(page.locator("h1:has-text('Transaction History')")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=1 transaction")).toBeVisible();
    await expect(page.locator("text=100 ADA")).toBeVisible();
    await expect(page.locator("text=vADA")).toBeVisible();
    await expect(page.locator(`text=Cardano`).first()).toBeVisible();
    await expect(page.locator(`text=Ethereum`).first()).toBeVisible();
    // TX hash should be truncated
    await expect(page.locator("text=abc123def4567890")).toBeVisible();
  });

  test("pending alert shows on /app and links to history", async ({ page }) => {
    const mockDeposit = {
      txHash: "pending123456789012345678abcdef0123456789abcdef0123456789abcdef",
      fromNetworkId: "cardano",
      fromNetworkName: "Cardano",
      toNetworkId: "ethereum",
      toNetworkName: "Ethereum",
      token: "ADA",
      outputToken: "vADA",
      amount: "50",
      senderAddress: "addr_test1abc",
      recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80",
      timestamp: Date.now() - 30_000,
    };

    // Pre-populate localStorage
    await page.goto("/app");
    await page.evaluate((deposit) => {
      localStorage.setItem("vista-bridge:deposits", JSON.stringify([deposit]));
    }, mockDeposit);
    await page.reload();

    // Wait for the pending alert to appear
    await expect(page.locator("text=Transaction pending")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=50 ADA")).toBeVisible();

    // Click the alert — should navigate to history
    await page.locator("text=Transaction pending").click();
    await expect(page).toHaveURL(/\/app\/history/);
    await expect(page.locator("h1:has-text('Transaction History')")).toBeVisible();
  });

  test("full bridge flow: API deposit shows in pending alert and history with live polling", async ({ page }) => {
    test.setTimeout(180_000);

    // Check wallet has funds
    const balanceData = await apiGet("/api/test/wallet/balance");
    const walletAda = Number(balanceData.lovelace) / 1e6;
    if (walletAda < 5) {
      test.skip(true, `Need at least 5 ADA, have ${walletAda}`);
      return;
    }

    // Get a route
    const routes = await apiGet("/api/routes");
    const route = routes.routes?.find((r: any) => r.sourceNetwork === "preproduction");
    if (!route) {
      test.skip(true, "No preprod route configured");
      return;
    }

    // Submit deposit via backend test wallet API (same approach as bridge.spec.ts)
    const depositResult = await apiPost("/api/test/wallet/deposit", {
      depositAddress: route.depositAddresses[0],
      recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80",
      amount: "3000000",
      network: "preprod",
    });

    if (depositResult.error) {
      test.skip(true, `Deposit failed: ${depositResult.error}`);
      return;
    }

    const txHash: string = depositResult.txHash;
    console.log(`[History E2E] Deposit tx: ${txHash}`);

    // Register with bridge
    const walletAddr = (await apiGet("/api/test/wallet/address")).bech32;
    await apiPost("/api/deposit/register", {
      depositTxHash: txHash,
      senderAddress: walletAddr,
      recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80",
      amount: "3000000",
      sourceNetwork: "preproduction",
      routeId: route.id,
    });

    // Inject deposit metadata into localStorage (simulating what the UI would do)
    const depositMeta = {
      txHash,
      fromNetworkId: "cardano",
      fromNetworkName: "Cardano",
      toNetworkId: "ethereum",
      toNetworkName: "Ethereum",
      token: "ADA",
      outputToken: "vADA",
      amount: "3",
      senderAddress: walletAddr,
      recipientAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD80",
      timestamp: Date.now(),
    };

    // Navigate to /app and inject localStorage
    await page.goto("/app");
    await page.evaluate((deposit) => {
      localStorage.setItem("vista-bridge:deposits", JSON.stringify([deposit]));
    }, depositMeta);
    await page.reload();

    // Verify pending alert appears
    await expect(page.locator("text=Transaction pending")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator("text=3 ADA")).toBeVisible();

    // Click alert to navigate to history
    await page.locator("text=Transaction pending").click();
    await expect(page).toHaveURL(/\/app\/history/);
    await expect(page.locator("h1:has-text('Transaction History')")).toBeVisible();

    // Verify the transaction is listed
    await expect(page.locator("text=3 ADA").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(`text=${txHash.slice(0, 16)}`)).toBeVisible();

    // Wait for the transaction status to update to "Complete" via live polling
    await expect(page.locator("text=Complete")).toBeVisible({
      timeout: 150_000,
    });

    console.log(`[History E2E] Transaction confirmed on history page`);
  });
});
