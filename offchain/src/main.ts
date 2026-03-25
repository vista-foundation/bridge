#!/usr/bin/env node

import { Effect, Layer, Schedule, Console } from "effect";
import { ConfigLive } from "./common/config.js";
import { UtxorpcLive } from "./common/utxorpc.js";
import { RelayerLive } from "./relayer/index.js";
import { IndexerLive } from "./cardano-indexer/index.js";
import { MirrorLive } from "./cardano-mirror/index.js";
import { Config } from "./common/config.js";
import { Indexer } from "./cardano-indexer/index.js";
import { Mirror } from "./cardano-mirror/index.js";
import { Relayer } from "./relayer/index.js";
import { createApiServer } from "./api/index.js";

// Compose all service layers with proper dependency resolution
const AppLayer = Layer.mergeAll(
  ConfigLive,
  RelayerLive,
  Layer.provide(UtxorpcLive, ConfigLive),
  Layer.provide(MirrorLive, Layer.mergeAll(ConfigLive, RelayerLive)),
  Layer.provide(IndexerLive, Layer.mergeAll(ConfigLive, UtxorpcLive, RelayerLive))
);

// Status reporting effect
const showBridgeStatus = Effect.gen(function* () {
  console.log("\n📊 Bridge Status Report:");
  
  // Get services from context
  const config = yield* Config;
  const relayer = yield* Relayer;
  
  // Show basic info
  console.log(`  🔗 Source Network: ${config.networks.source.name} (${config.networks.source.utxorpcEndpoint})`);
  console.log(`  🔗 Destination Network: ${config.networks.destination.name} (${config.networks.destination.utxorpcEndpoint})`);
  console.log(`  💰 Bridge Assets: ${config.bridge.allowedAssets.join(', ')}`);
  console.log(`  📦 Watching ${config.networks.source.depositAddresses?.length || 0} deposit addresses`);
  
  // Get bridge state
  const bridgeState = yield* relayer.getBridgeState().pipe(
    Effect.catchAll((error) => {
      console.log(`     - Error loading bridge state: ${error}`);
      return Effect.succeed({
        processedDeposits: [],
        pendingMirrors: []
      });
    })
  );
  
  console.log(`  📡 Relayer: Running with database persistence`);
  console.log(`     - Processed: ${bridgeState.processedDeposits.length} completed`);
  console.log(`     - Pending: ${bridgeState.pendingMirrors.length} pending`);
  
  if (bridgeState.processedDeposits.length > 0) {
    const latest = bridgeState.processedDeposits[bridgeState.processedDeposits.length - 1];
    console.log(`  💎 Latest completed: ${latest?.mirrorTxHash || 'none'}`);
  }
  
  console.log("=".repeat(60) + "\n");
});

// Main application effect
const program = Effect.gen(function* () {
  console.log("🌉 VISTA Bridge starting...");
  
  // Show initial configuration
  const config = yield* Config;
  console.log(`🔗 Source Network: ${config.networks.source.name} (${config.networks.source.utxorpcEndpoint})`);
  console.log(`🔗 Destination Network: ${config.networks.destination.name} (${config.networks.destination.utxorpcEndpoint})`);
  console.log(`💰 Bridge Assets: ${config.bridge.allowedAssets.join(', ')}`);
  console.log(`📦 Watching ${config.networks.source.depositAddresses?.length || 0} deposit addresses`);
  
  console.log("🚀 Starting bridge services...");
  console.log("  📡 Relayer service with database...");
  console.log("  🔄 Mirror service...");
  console.log("  👀 Indexer service with UTXORPC...");

  // Get services from context
  const relayer = yield* Relayer;
  const indexer = yield* Indexer;
  const mirror = yield* Mirror;

  // Start HTTP API server
  createApiServer(relayer, config, config.api.port);
  console.log(`🌐 API server listening on http://localhost:${config.api.port}`);
  
  // Show initial status after 5 seconds
  yield* Effect.sleep("5 seconds").pipe(
    Effect.flatMap(() => showBridgeStatus),
    Effect.fork
  );
  
  // Start periodic status reporting every 30 seconds
  yield* showBridgeStatus.pipe(
    Effect.repeat(Schedule.fixed("30 seconds")),
    Effect.fork
  );
  
  // Start mirror service in background
  yield* mirror.run.pipe(
    Effect.catchAll((error) => {
      console.error("❌ Mirror service failed:", error);
      return Effect.fail(error);
    }),
    Effect.fork
  );
  
  console.log("✅ All services started successfully");
  console.log("🔍 Bridge is now monitoring for real deposits via UTXORPC...");
  console.log("💡 If UTXORPC connection fails, mock deposits will be generated for testing");
  
  // Start indexer service (this runs the main monitoring loop)
  yield* indexer.run.pipe(
    Effect.catchAll((error) => {
      console.error("❌ Indexer service failed:", error);
      return Effect.fail(error);
    })
  );
});

// Main function with proper error handling and layer provision
const main = Effect.scoped(
  program.pipe(
    Effect.provide(AppLayer),
    Effect.tapErrorCause((cause) => 
      Console.log(`❌ Failed to start bridge: ${cause}`)
    )
  )
);

// Run the application
Effect.runPromise(main as any).catch((error) => {
  console.error("❌ Failed to start bridge:", error);
  console.log("\n💡 Make sure you have created a .env file with the required configuration.");
  console.log("📄 See config/env.template for an example configuration.");
  process.exit(1);
}); 