import { Lucid, Koios, generateSeedPhrase } from "@lucid-evolution/lucid";

console.log("=== Generating Bridge Wallets ===\n");

// --- Source (Preprod) - Deposit address ---
const depositSeed = generateSeedPhrase();
const lucidPreprod = await Lucid(
  new Koios("https://preprod.koios.rest/api/v1"),
  "Preprod",
);
lucidPreprod.selectWallet.fromSeed(depositSeed);
const depositAddress = await lucidPreprod.wallet().address();

console.log("--- SOURCE (Preproduction) - Deposit Address ---");
console.log("Seed:", depositSeed);
console.log("Address:", depositAddress);
console.log("");

// --- Destination (Preview) - Sender address ---
const senderSeed = generateSeedPhrase();
const lucidPreview = await Lucid(
  new Koios("https://preview.koios.rest/api/v1"),
  "Preview",
);
lucidPreview.selectWallet.fromSeed(senderSeed);
const senderAddress = await lucidPreview.wallet().address();

console.log("--- DESTINATION (Preview) - Sender Address ---");
console.log("Seed:", senderSeed);
console.log("Address:", senderAddress);
console.log("");

console.log("=== Paste into bridge-offchain/.env ===");
console.log(`SOURCE_DEPOSIT_ADDRESSES=${depositAddress}`);
console.log(`DEST_SENDER_ADDRESSES=${senderAddress}`);
console.log(`DEST_SENDER_WALLET_SEED=${senderSeed}`);
