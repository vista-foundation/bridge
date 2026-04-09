/**
 * Integration test: tHOSKY bridge deposit on Preprod.
 *
 * 1. Sends tHOSKY from the E2E wallet to the bridge deposit address
 * 2. Registers it via the bridge API
 * 3. Polls the API until the deposit is detected
 *
 * Usage: bun run scripts/test-hosky-bridge.ts
 *
 * Requires:
 *   - E2E wallet funded with tHOSKY (run premint-tokens.ts first)
 *   - Bridge backend running (bun run dev)
 */

import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.test") });
dotenv.config({ path: resolve(__dirname, "../.env") });

import { MeshWallet, Transaction, KoiosProvider } from "@meshsdk/core";
import { readFileSync } from "node:fs";

// ── Config ────────────────────────────────────────────────────────────
const THOSKY_UNIT = "18d477cee2bee00475729bcf7da5ca456d07207d192c6cf11ff8fc7574484f534b59";
const SEND_AMOUNT = "1000000"; // 1M tHOSKY
const API_BASE = process.env.API_BASE ?? "http://localhost:3001";

const E2E_SEED = process.env.E2E_WALLET_SEED;
if (!E2E_SEED) {
  console.error("Missing E2E_WALLET_SEED in .env.test");
  process.exit(1);
}

// Load routes to get deposit address
const routesPath = resolve(__dirname, "../config/routes.json");
const routes = JSON.parse(readFileSync(routesPath, "utf-8")).routes;
const preprodToPreview = routes.find((r: any) => r.id === "preprod-to-preview");
if (!preprodToPreview) {
  console.error("No preprod-to-preview route found");
  process.exit(1);
}
const depositAddress = preprodToPreview.source.addresses[0];

// ── Step 1: Send tHOSKY deposit ──────────────────────────────────────
async function sendDeposit(): Promise<string> {
  console.log("=== Step 1: Send tHOSKY deposit ===\n");

  const provider = new KoiosProvider("preprod");
  const wallet = new MeshWallet({
    networkId: 0,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: E2E_SEED!.split(" ") },
  });

  const walletAddr = await wallet.getChangeAddress();
  console.log(`  E2E wallet: ${walletAddr}`);
  console.log(`  Deposit to: ${depositAddress}`);
  console.log(`  Amount:     ${SEND_AMOUNT} tHOSKY`);

  // Check E2E wallet has tHOSKY
  const utxos = await wallet.getUtxos();
  let hasToken = false;
  for (const u of utxos) {
    for (const a of u.output.amount) {
      if (a.unit === THOSKY_UNIT && BigInt(a.quantity) > 0n) {
        hasToken = true;
        console.log(`  Balance:    ${a.quantity} tHOSKY`);
      }
    }
  }
  if (!hasToken) {
    console.error("  E2E wallet has no tHOSKY! Run premint-tokens.ts first.");
    process.exit(1);
  }

  const tx = new Transaction({ initiator: wallet });
  tx.sendAssets(depositAddress, [
    { unit: THOSKY_UNIT, quantity: SEND_AMOUNT },
  ]);

  // Receiver = same wallet (for testing, bridging to self on Preview)
  const receiverAddr = walletAddr;
  const chunkedAddr = receiverAddr.length > 64
    ? [receiverAddr.slice(0, 64), receiverAddr.slice(64)]
    : receiverAddr;

  tx.setMetadata(1337, {
    d: chunkedAddr,
    a: "HOSKY",
    v: "1.1.0",
  });

  console.log("\n  Building...");
  const unsigned = await tx.build();
  console.log("  Signing...");
  const signed = await wallet.signTx(unsigned);
  console.log("  Submitting...");
  const txHash = await wallet.submitTx(signed);
  console.log(`\n  ✅ Deposit TX: ${txHash}`);
  console.log(`     https://preprod.cardanoscan.io/transaction/${txHash}`);
  return txHash;
}

// ── Step 2: Register with API ────────────────────────────────────────
async function registerDeposit(txHash: string): Promise<void> {
  console.log("\n=== Step 2: Register deposit with bridge API ===\n");

  try {
    const resp = await fetch(`${API_BASE}/api/deposit/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        depositTxHash: txHash,
        senderAddress: process.env.E2E_WALLET_ADDRESS ?? "",
        recipientAddress: process.env.E2E_WALLET_ADDRESS ?? "",
        amount: SEND_AMOUNT,
        sourceNetwork: "preproduction",
        assetType: "HOSKY",
      }),
    });

    if (!resp.ok) {
      console.log(`  ⚠️ API returned ${resp.status} (bridge might not be running). Skipping.`);
      return;
    }

    const data = await resp.json();
    console.log(`  ✅ Registered:`, data);
  } catch (err) {
    console.log(`  ⚠️ Could not reach bridge API at ${API_BASE}. Skipping registration.`);
  }
}

// ── Step 3: Poll for status ──────────────────────────────────────────
async function pollStatus(txHash: string): Promise<void> {
  console.log("\n=== Step 3: Poll deposit status ===\n");

  for (let i = 0; i < 12; i++) {
    try {
      const resp = await fetch(`${API_BASE}/api/deposit/${txHash}`);
      if (resp.ok) {
        const data = await resp.json();
        console.log(`  Status: ${JSON.stringify(data)}`);
        if (data.status === "CONFIRMED") {
          console.log(`\n  ✅ Bridge complete! Mirror TX: ${data.mirrorTxHash}`);
          return;
        }
      } else if (resp.status === 404) {
        console.log(`  Deposit not yet detected (attempt ${i + 1}/12)...`);
      }
    } catch {
      console.log(`  Bridge API not reachable (attempt ${i + 1}/12)...`);
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }

  console.log("\n  ⏱️ Timed out waiting for confirmation. The deposit was submitted — check manually.");
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║   tHOSKY Bridge Integration Test          ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  const txHash = await sendDeposit();
  await registerDeposit(txHash);
  await pollStatus(txHash);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
