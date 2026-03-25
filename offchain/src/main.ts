#!/usr/bin/env node

import { Effect, Layer, Schedule, Console } from "effect";
import { ConfigLive, Config } from "./common/config.js";
import { RelayerLive, Relayer } from "./relayer/index.js";
import { createIndexerForRoute, createMirrorForRoute } from "./common/chain-factory.js";
import { createApiServer } from "./api/index.js";

// AppLayer: only Config + Relayer (indexers/mirrors are per-route, not global layers)
const AppLayer = Layer.mergeAll(ConfigLive, RelayerLive);

// Status reporting
const showBridgeStatus = Effect.gen(function* () {
  const config = yield* Config;
  const relayer = yield* Relayer;

  console.log("\n📊 Bridge Status Report:");

  for (const route of config.routes) {
    console.log(`  🔗 Route [${route.id}]: ${route.source.name} → ${route.destination.name}`);
  }

  const bridgeState = yield* relayer.getBridgeState().pipe(
    Effect.catchAll(() =>
      Effect.succeed({ processedDeposits: [], pendingMirrors: [] }),
    ),
  );

  console.log(`  📡 Processed: ${bridgeState.processedDeposits.length} | Pending: ${bridgeState.pendingMirrors.length}`);
  console.log("=".repeat(60) + "\n");
});

// Main program
const program = Effect.gen(function* () {
  console.log("🌉 VISTA Bridge starting...");

  const config = yield* Config;
  const relayer = yield* Relayer;

  console.log(`📦 ${config.routes.length} route(s) configured:`);
  for (const route of config.routes) {
    console.log(`   [${route.id}] ${route.source.name} → ${route.destination.name} (${route.source.addresses.length} deposit addrs)`);
  }

  // Start API server
  createApiServer(relayer, config, config.api.port);
  console.log(`🌐 API server listening on http://localhost:${config.api.port}`);

  // Spawn indexer + mirror per route
  for (const route of config.routes) {
    const indexer = createIndexerForRoute(route, relayer);
    const mirror = createMirrorForRoute(route, relayer);

    yield* indexer.run.pipe(
      Effect.catchAll((error) => {
        console.error(`❌ Indexer [${route.id}] failed:`, error);
        return Effect.fail(error);
      }),
      Effect.fork,
    );

    yield* mirror.run.pipe(
      Effect.catchAll((error) => {
        console.error(`❌ Mirror [${route.id}] failed:`, error);
        return Effect.fail(error);
      }),
      Effect.fork,
    );

    console.log(`✅ Route [${route.id}] started`);
  }

  // Periodic status reporting
  yield* showBridgeStatus.pipe(
    Effect.repeat(Schedule.fixed("30 seconds")),
    Effect.fork,
  );

  console.log("🔍 Bridge is now monitoring for deposits via UTXORPC...");

  yield* Effect.never;
});

// Run
const main = Effect.scoped(
  program.pipe(
    Effect.provide(AppLayer),
    Effect.tapErrorCause((cause) =>
      Console.log(`❌ Failed to start bridge: ${cause}`),
    ),
  ),
);

Effect.runPromise(main as any).catch((error) => {
  console.error("❌ Failed to start bridge:", error);
  console.log("\n💡 Make sure you have created a .env file with the required configuration.");
  console.log("📄 See config/env.template for an example configuration.");
  process.exit(1);
});
