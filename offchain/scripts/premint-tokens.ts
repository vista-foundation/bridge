/**
 * Premint Script — derive policyIds and optionally mint tHOSKY on Preprod.
 *
 * Usage:
 *   bun run scripts/premint-tokens.ts                    # Derive and print policyIds only
 *   bun run scripts/premint-tokens.ts --mint 1000000000  # Also mint tHOSKY on Preprod
 *
 * Requires env vars (via .env or shell):
 *   ROUTE_PREVIEW_TO_PREPROD_DEST_WALLET_SEED  — Preprod wallet (holds tHOSKY)
 *   ROUTE_PREPROD_TO_PREVIEW_DEST_WALLET_SEED  — Preview wallet (mints vHOSKY)
 *   (Falls back to DEST_SENDER_WALLET_SEED for the Preview wallet)
 */

import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

import {
  MeshWallet,
  Transaction,
  ForgeScript,
  KoiosProvider,
  deserializeAddress,
  resolveNativeScriptHash,
} from "@meshsdk/core";
import type { NativeScript } from "@meshsdk/common";

// ── Config ────────────────────────────────────────────────────────────
const THOSKY_ASSET_NAME = "tHOSKY";
const VHOSKY_ASSET_NAME = "vHOSKY";

function toHex(str: string): string {
  return Buffer.from(str, "utf8").toString("hex");
}

function getEnvOrDie(key: string, ...fallbacks: string[]): string {
  const val = process.env[key];
  if (val) return val;
  for (const fb of fallbacks) {
    const v = process.env[fb];
    if (v) return v;
  }
  console.error(`Missing env: ${key}` + (fallbacks.length ? ` (fallbacks: ${fallbacks.join(", ")})` : ""));
  process.exit(1);
}

// ── Derive policyId from wallet ───────────────────────────────────────
async function derivePolicyInfo(wallet: MeshWallet, assetName: string) {
  const address = await wallet.getChangeAddress();
  const { pubKeyHash } = deserializeAddress(address);
  if (!pubKeyHash) throw new Error(`No pubKeyHash for address ${address}`);

  const nativeScript: NativeScript = { type: "sig", keyHash: pubKeyHash };
  const policyId = resolveNativeScriptHash(nativeScript);
  const assetNameHex = toHex(assetName);
  const unit = policyId + assetNameHex;
  const forgeScript = ForgeScript.withOneSignature(address);

  return { address, pubKeyHash, policyId, assetNameHex, unit, forgeScript, nativeScript };
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const shouldMint = args.includes("--mint");
  const mintAmountArg = shouldMint ? args[args.indexOf("--mint") + 1] : undefined;
  const mintAmount = mintAmountArg ?? "1000000000000"; // default 1 trillion

  console.log("=== Vista Bridge — Token Policy Derivation ===\n");

  // ── Preprod wallet (holds tHOSKY, destination for preview→preprod route) ──
  const preprodSeed = getEnvOrDie(
    "ROUTE_PREVIEW_TO_PREPROD_DEST_WALLET_SEED",
    "PREPROD_WALLET_SEED",
  );
  const preprodProvider = new KoiosProvider("preprod");
  const preprodWallet = new MeshWallet({
    networkId: 0,
    fetcher: preprodProvider,
    submitter: preprodProvider,
    key: { type: "mnemonic", words: preprodSeed.split(" ") },
  });
  const thosky = await derivePolicyInfo(preprodWallet, THOSKY_ASSET_NAME);

  console.log("--- tHOSKY (Preprod) ---");
  console.log(`  Wallet:      ${thosky.address}`);
  console.log(`  Key hash:    ${thosky.pubKeyHash}`);
  console.log(`  Policy ID:   ${thosky.policyId}`);
  console.log(`  Asset name:  ${THOSKY_ASSET_NAME} (${thosky.assetNameHex})`);
  console.log(`  Full unit:   ${thosky.unit}`);
  console.log();

  // ── Preview wallet (mints vHOSKY, destination for preprod→preview route) ──
  const previewSeed = getEnvOrDie(
    "ROUTE_PREPROD_TO_PREVIEW_DEST_WALLET_SEED",
    "DEST_SENDER_WALLET_SEED",
    "PREVIEW_WALLET_SEED",
  );
  const previewProvider = new KoiosProvider("preview");
  const previewWallet = new MeshWallet({
    networkId: 0,
    fetcher: previewProvider,
    submitter: previewProvider,
    key: { type: "mnemonic", words: previewSeed.split(" ") },
  });
  const vhosky = await derivePolicyInfo(previewWallet, VHOSKY_ASSET_NAME);

  console.log("--- vHOSKY (Preview / Agrologos) ---");
  console.log(`  Wallet:      ${vhosky.address}`);
  console.log(`  Key hash:    ${vhosky.pubKeyHash}`);
  console.log(`  Policy ID:   ${vhosky.policyId}`);
  console.log(`  Asset name:  ${VHOSKY_ASSET_NAME} (${vhosky.assetNameHex})`);
  console.log(`  Full unit:   ${vhosky.unit}`);
  console.log();

  // ── Print routes.json config snippet ────────────────────────────────
  console.log("=== routes.json assetConfigs ===\n");
  console.log("preprod-to-preview route HOSKY config:");
  console.log(JSON.stringify({
    sourceUnit: thosky.unit,
    destinationUnit: vhosky.unit,
    destinationAction: "mint",
    mintScriptType: "sig",
    minDepositAmount: "1",
    maxTransferAmount: "1000000000000000",
    feeLovelace: "2000000",
    decimals: 0,
  }, null, 2));
  console.log();

  console.log("preview-to-preprod route HOSKY config:");
  console.log(JSON.stringify({
    sourceUnit: vhosky.unit,
    destinationUnit: thosky.unit,
    destinationAction: "send",
    minDepositAmount: "1",
    maxTransferAmount: "1000000000000000",
    feeLovelace: "2000000",
    decimals: 0,
  }, null, 2));
  console.log();

  // ── Optionally mint tHOSKY on Preprod ───────────────────────────────
  if (shouldMint) {
    console.log(`=== Minting ${mintAmount} tHOSKY on Preprod ===\n`);

    const tx = new Transaction({ initiator: preprodWallet });
    // Mesh SDK mintAsset expects UTF-8 assetName (it hex-encodes internally)
    tx.mintAsset(thosky.forgeScript, {
      assetName: THOSKY_ASSET_NAME,
      assetQuantity: mintAmount,
      recipient: { address: thosky.address },
    });
    tx.setMetadata(721, {
      [thosky.policyId]: {
        [THOSKY_ASSET_NAME]: {
          name: "Test HOSKY",
          description: "Vista Bridge testnet HOSKY token (Preprod)",
          ticker: "tHOSKY",
        },
      },
    });

    console.log("Building transaction...");
    const unsignedTx = await tx.build();
    console.log("Signing...");
    const signedTx = await preprodWallet.signTx(unsignedTx);
    console.log("Submitting...");
    const txHash = await preprodWallet.submitTx(signedTx);
    console.log(`\n✅ Mint TX submitted: ${txHash}`);
    console.log(`   View: https://preprod.cardanoscan.io/transaction/${txHash}`);
  } else {
    console.log("Tip: run with --mint [amount] to premint tHOSKY on Preprod");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
