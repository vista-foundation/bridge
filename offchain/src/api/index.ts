import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { Effect } from "effect";
import type { BridgeConfig, DepositEvent, MirrorStatus } from "../common/types.js";
import { testWalletRoutes } from "./test-wallet.js";
import type {
  ApiBridgeConfig,
  ApiBridgeState,
  ApiBalanceResponse,
  ApiBalanceAsset,
  ApiDepositStatus,
  ApiHealthResponse,
  ApiRegisterDepositResponse,
  DepositStatusType,
} from "@vista-bridge/shared";

// ── Type for the resolved Relayer service ──────────────────────────────
interface RelayerService {
  publishDeposit: (event: DepositEvent) => Effect.Effect<{ success: boolean; messageId: string }, Error>;
  getBridgeState: () => Effect.Effect<{
    processedDeposits: Array<{
      transactionHash: string;
      processedAt: bigint;
      mirrorTxHash: string;
      status: MirrorStatus;
    }>;
    pendingMirrors: Array<{
      depositTxHash: string;
      deposit: DepositEvent;
      retryCount: number;
      lastRetryAt: bigint;
      errorMessage?: string;
    }>;
    lastProcessedSlot: bigint;
    lastProcessedBlockHash: string;
  }, Error>;
}

// ── Converters ─────────────────────────────────────────────────────────

const STATUS_MAP: Record<number, DepositStatusType> = {
  0: "PENDING",
  1: "PENDING",
  2: "SUBMITTED",
  3: "CONFIRMED",
  4: "FAILED",
};

function toBridgeConfig(config: BridgeConfig): ApiBridgeConfig {
  return {
    sourceNetwork: config.networks.source.name,
    destinationNetwork: config.networks.destination.name,
    allowedAssets: config.bridge.allowedAssets,
    minDepositAmount: config.bridge.minDepositAmount,
    maxTransferAmount: config.bridge.maxTransferAmount,
    feeAmount: config.bridge.feeAmount,
    depositAddresses: config.networks.source.depositAddresses ?? [],
    requiredConfirmations: config.security.requiredConfirmations,
  };
}

// ── API Server ─────────────────────────────────────────────────────────

const startTime = Date.now();

export function createApiServer(
  relayer: RelayerService,
  config: BridgeConfig,
  port: number = 3001,
) {
  const app = new Elysia()
    .use(
      cors({
        origin: ["http://localhost:3000", "http://localhost:3001"],
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
      }),
    )

    // ── Health check ───────────────────────────────────────────────
    .get("/api/health", (): ApiHealthResponse => ({
      healthy: true,
      services: {
        indexer: true,
        relayer: true,
        mirror: true,
      },
      uptime: Date.now() - startTime,
    }))

    // ── Bridge configuration ───────────────────────────────────────
    .get("/api/config", () => toBridgeConfig(config))

    // ── Bridge state ───────────────────────────────────────────────
    .get("/api/state", async (): Promise<ApiBridgeState> => {
      const state = await Effect.runPromise(relayer.getBridgeState());

      const recentProcessed: ApiDepositStatus[] = state.processedDeposits
        .slice(-20)
        .map((d) => ({
          depositTxHash: d.transactionHash,
          mirrorTxHash: d.mirrorTxHash,
          status: STATUS_MAP[d.status] ?? "PENDING",
          amount: "",
          senderAddress: "",
          recipientAddress: "",
          timestamp: d.processedAt.toString(),
        }));

      const recentPending: ApiDepositStatus[] = state.pendingMirrors
        .slice(-20)
        .map((p) => {
          const item: ApiDepositStatus = {
            depositTxHash: p.depositTxHash,
            mirrorTxHash: "",
            status: "PENDING",
            amount: p.deposit.amount.toString(),
            senderAddress: p.deposit.senderAddress,
            recipientAddress: p.deposit.recipientAddress,
            timestamp: p.deposit.timestamp.toString(),
          };
          if (p.errorMessage) item.errorMessage = p.errorMessage;
          return item;
        });

      return {
        processedCount: state.processedDeposits.length,
        pendingCount: state.pendingMirrors.length,
        lastProcessedSlot: state.lastProcessedSlot.toString(),
        recentDeposits: [...recentPending, ...recentProcessed],
      };
    })

    // ── Deposit status ─────────────────────────────────────────────
    .get("/api/deposit/:txHash", async ({ params, set }): Promise<ApiDepositStatus | { error: string }> => {
      const state = await Effect.runPromise(relayer.getBridgeState());

      // Check processed deposits
      const processed = state.processedDeposits.find(
        (d) => d.transactionHash === params.txHash,
      );
      if (processed) {
        return {
          depositTxHash: processed.transactionHash,
          mirrorTxHash: processed.mirrorTxHash,
          status: STATUS_MAP[processed.status] ?? "PENDING",
          amount: "",
          senderAddress: "",
          recipientAddress: "",
          timestamp: processed.processedAt.toString(),
        };
      }

      // Check pending mirrors
      const pending = state.pendingMirrors.find(
        (p) => p.depositTxHash === params.txHash,
      );
      if (pending) {
        const item: ApiDepositStatus = {
          depositTxHash: pending.depositTxHash,
          mirrorTxHash: "",
          status: "PENDING",
          amount: pending.deposit.amount.toString(),
          senderAddress: pending.deposit.senderAddress,
          recipientAddress: pending.deposit.recipientAddress,
          timestamp: pending.deposit.timestamp.toString(),
        };
        if (pending.errorMessage) item.errorMessage = pending.errorMessage;
        return item;
      }

      set.status = 404;
      return { error: "Deposit not found" };
    })

    // ── Register deposit ───────────────────────────────────────────
    .post(
      "/api/deposit/register",
      async ({ body }): Promise<ApiRegisterDepositResponse> => {
        const depositEvent: DepositEvent = {
          transactionHash: body.depositTxHash,
          senderAddress: body.senderAddress,
          recipientAddress: body.recipientAddress,
          amount: BigInt(body.amount),
          assetType: "ADA",
          blockSlot: BigInt(0),
          blockHash: "",
          outputIndex: 0,
          metadata: {
            destination: body.recipientAddress,
            source: body.sourceNetwork,
            registeredVia: "frontend",
          },
          timestamp: BigInt(Date.now()),
        };

        const result = await Effect.runPromise(
          relayer.publishDeposit(depositEvent),
        );

        return {
          success: result.success,
          bridgeId: result.messageId,
          message: result.success
            ? "Deposit registered. The bridge will process it once confirmed on-chain."
            : "Failed to register deposit.",
        };
      },
      {
        body: t.Object({
          depositTxHash: t.String(),
          senderAddress: t.String(),
          recipientAddress: t.String(),
          amount: t.String(),
          sourceNetwork: t.String(),
        }),
      },
    )

    // ── Balance query via Koios REST API ─────────────────────────
    .get("/api/balance/:address", async ({ params, set }): Promise<ApiBalanceResponse | { error: string }> => {
      try {
        // Use the source network's Koios provider for balance queries
        const koiosBase = config.networks.source.lucidProvider;

        const resp = await fetch(`${koiosBase}/address_info`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _addresses: [params.address] }),
        });

        if (!resp.ok) {
          set.status = 502;
          return { error: `Koios API returned ${resp.status}` };
        }

        const data = await resp.json() as Array<{
          balance: string;
          utxo_set: Array<{
            value: string;
            asset_list: Array<{
              policy_id: string;
              asset_name: string;
              fingerprint: string;
              quantity: string;
            }>;
          }>;
        }>;

        const addrInfo = data[0];
        if (!addrInfo) {
          // Address exists but has no UTXOs
          return {
            address: params.address,
            network: config.networks.source.name,
            assets: [{ unit: "lovelace", symbol: "ADA", quantity: "0" }],
            lovelace: "0",
          };
        }

        const totalLovelace = addrInfo.balance;
        const assetMap = new Map<string, { symbol: string; quantity: bigint }>();

        for (const utxo of addrInfo.utxo_set ?? []) {
          for (const asset of utxo.asset_list ?? []) {
            const unit = `${asset.policy_id}${asset.asset_name}`;
            const existing = assetMap.get(unit);
            // Decode hex asset name to UTF-8 for display
            let symbol = asset.asset_name
              ? Buffer.from(asset.asset_name, "hex").toString("utf8")
              : asset.fingerprint?.slice(0, 12) ?? unit.slice(0, 12);
            if (existing) {
              assetMap.set(unit, { symbol: existing.symbol, quantity: existing.quantity + BigInt(asset.quantity) });
            } else {
              assetMap.set(unit, { symbol, quantity: BigInt(asset.quantity) });
            }
          }
        }

        const assets: ApiBalanceAsset[] = [
          { unit: "lovelace", symbol: "ADA", quantity: totalLovelace },
        ];

        for (const [unit, { symbol, quantity }] of assetMap) {
          assets.push({ unit, symbol, quantity: quantity.toString() });
        }

        return {
          address: params.address,
          network: config.networks.source.name,
          assets,
          lovelace: totalLovelace,
        };
      } catch (err) {
        console.error("❌ Balance query failed:", err);
        set.status = 502;
        return {
          error: err instanceof Error ? err.message : "Balance query failed",
        };
      }
    })

    // ── Test wallet routes (dev/test only) ───────────────────────
    .use(testWalletRoutes())

    .listen(port);

  return app;
}
