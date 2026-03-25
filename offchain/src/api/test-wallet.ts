/**
 * Test wallet API endpoints for Playwright E2E tests.
 * Provides CIP-30 compatible responses using Lucid with a test seed phrase.
 * These endpoints should ONLY be enabled in test/dev environments.
 */
import { Elysia, t } from "elysia";
import { Lucid, Koios } from "@lucid-evolution/lucid";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load test wallet credentials (resolve path relative to this file)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

const SEED = process.env.E2E_WALLET_SEED ?? "";
const PROVIDER_URL = process.env.SOURCE_LUCID_PROVIDER ?? "https://preprod.koios.rest/api/v1";

// Lucid expects "Preprod" or "Preview", but .env might have "Preproduction"
const RAW_NETWORK = process.env.SOURCE_LUCID_NETWORK ?? "Preprod";
const NETWORK = (RAW_NETWORK === "Preproduction" ? "Preprod" : RAW_NETWORK) as "Preprod" | "Preview";

let _lucid: Awaited<ReturnType<typeof Lucid>> | null = null;

async function getLucid() {
  if (!_lucid) {
    _lucid = await Lucid(new Koios(PROVIDER_URL), NETWORK);
    _lucid.selectWallet.fromSeed(SEED);
    const addr = await _lucid.wallet().address();
    console.log(`🧪 Test wallet initialized: ${addr} (seed words: ${SEED.split(" ").length})`);
  }
  return _lucid;
}

export function testWalletRoutes() {
  return new Elysia({ prefix: "/api/test/wallet" })

    // ── Wallet info ────────────────────────────────────────────────
    .get("/info", async () => {
      const lucid = await getLucid();
      const address = await lucid.wallet().address();
      return { address, network: NETWORK, seed: SEED };
    })

    // ── CIP-30: getChangeAddress (hex-encoded raw address bytes) ──
    .get("/address", async () => {
      const lucid = await getLucid();
      const address = await lucid.wallet().address();
      // CIP-30 returns hex-encoded raw address bytes
      // We'll return both bech32 and hex for flexibility
      const { bech32: b32 } = await import("bech32");
      const decoded = b32.decode(address, 200);
      const rawBytes = new Uint8Array(b32.fromWords(decoded.words));
      const hex = Buffer.from(rawBytes).toString("hex");
      return { bech32: address, hex };
    })

    // ── CIP-30: getBalance (hex CBOR value) ───────────────────────
    .get("/balance", async () => {
      // Fetch balance from Koios
      const lucid = await getLucid();
      const address = await lucid.wallet().address();

      const resp = await fetch(`${PROVIDER_URL}/address_info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _addresses: [address] }),
      });

      const data = (await resp.json()) as Array<{ balance: string }>;
      const lovelace = data[0]?.balance ?? "0";

      // CIP-30 getBalance returns CBOR-encoded Value
      // For ADA-only, Value = uint (lovelace)
      // CBOR uint encoding:
      const n = BigInt(lovelace);
      const cborHex = cborEncodeUint(n);

      return { lovelace, cborHex };
    })

    // ── CIP-30: getUtxos (array of hex CBOR TransactionUnspentOutput) ─
    .get("/utxos", async () => {
      const lucid = await getLucid();
      const utxos = await lucid.wallet().getUtxos();

      // Return simplified UTXOs for the inject script
      return {
        count: utxos.length,
        utxos: utxos.map((u) => ({
          txHash: u.txHash,
          outputIndex: u.outputIndex,
          lovelace: u.assets.lovelace?.toString() ?? "0",
        })),
      };
    })

    // ── CIP-30: signTx ────────────────────────────────────────────
    .post(
      "/sign",
      async ({ body }) => {
        const lucid = await getLucid();
        try {
          const signedTx = await lucid.fromTx(body.txCborHex).sign.withWallet().complete();
          const signedHex = signedTx.toCBOR();
          return { signedTxHex: signedHex };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Sign failed",
          };
        }
      },
      { body: t.Object({ txCborHex: t.String() }) },
    )

    // ── CIP-30: submitTx ──────────────────────────────────────────
    .post(
      "/submit",
      async ({ body }) => {
        const lucid = await getLucid();
        try {
          const txHash = await lucid.fromTx(body.signedTxHex).submit();
          return { txHash };
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Submit failed",
          };
        }
      },
      { body: t.Object({ signedTxHex: t.String() }) },
    )

    // ── Build, sign, and submit a deposit tx server-side ──────────
    // Supports both Preprod and Preview via the `network` parameter.
    // Used by E2E tests to make real on-chain deposits.
    .post(
      "/deposit",
      async ({ body }) => {
        try {
          const { MeshWallet, Transaction, KoiosProvider } = await import("@meshsdk/core");

          // Determine network from the deposit address or explicit param
          const network = body.network ?? "preprod";
          const koiosSlug = network === "preview" ? "preview" : "preprod";

          const provider = new KoiosProvider(koiosSlug);
          const wallet = new MeshWallet({
            networkId: 0,
            fetcher: provider as any,
            submitter: provider as any,
            key: { type: "mnemonic", words: SEED.split(" ") },
          });

          const tx = new Transaction({ initiator: wallet });
          tx.sendLovelace(body.depositAddress, body.amount);
          tx.setMetadata(1337, {
            d: body.recipientAddress,
            v: "1.0.0",
          });

          const unsignedTx = await tx.build();
          const signedTx = await wallet.signTx(unsignedTx);
          const txHash = await wallet.submitTx(signedTx);

          console.log(`🧪 Test deposit (${network}): ${txHash}`);
          console.log(`   ${Number(body.amount) / 1e6} ADA → ${body.depositAddress.slice(0, 30)}...`);

          return { txHash, amount: body.amount };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("🧪 Test deposit failed:", msg);
          return { error: msg };
        }
      },
      {
        body: t.Object({
          depositAddress: t.String(),
          recipientAddress: t.String(),
          amount: t.String(),
          network: t.Optional(t.String()),
        }),
      },
    );
}

// ── CBOR helpers ───────────────────────────────────────────────────────

function cborEncodeUint(n: bigint): string {
  if (n < 24n) {
    return n.toString(16).padStart(2, "0");
  } else if (n < 256n) {
    return "18" + n.toString(16).padStart(2, "0");
  } else if (n < 65536n) {
    return "19" + n.toString(16).padStart(4, "0");
  } else if (n < 4294967296n) {
    return "1a" + n.toString(16).padStart(8, "0");
  } else {
    return "1b" + n.toString(16).padStart(16, "0");
  }
}
