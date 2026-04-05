import { Effect, Context, Layer } from "effect";
import dotenv from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { BridgeConfig } from "./types.js";
import type { BridgeRoute } from "./route.js";

// Load environment variables from .env file
dotenv.config();

// Define a Config Service using Context.Tag
export class Config extends Context.Tag("Config")<Config, BridgeConfig>() {}

// Helper function to parse comma-separated addresses
const parseAddressList = (envVar: string, defaultValue: string[]): string[] => {
  const value = process.env[envVar];
  if (!value) return defaultValue;
  return value.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);
};

// Helper function to get environment variable with default
const getEnv = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

// Helper function to get integer environment variable with default
const getEnvInt = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Load routes from JSON file and overlay secrets from env vars
function loadRoutesFromFile(filePath: string): BridgeRoute[] {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    throw new Error(`Routes file not found: ${absPath}`);
  }
  const content = readFileSync(absPath, "utf-8");
  const data = JSON.parse(content) as { routes: BridgeRoute[] };

  // Overlay secrets from env vars: ROUTE_<ID>_SOURCE_API_KEY, ROUTE_<ID>_DEST_API_KEY, ROUTE_<ID>_DEST_WALLET_SEED
  for (const route of data.routes) {
    const envPrefix = `ROUTE_${route.id.toUpperCase().replace(/-/g, "_")}`;
    route.source.utxorpcApiKey = route.source.utxorpcApiKey ?? process.env[`${envPrefix}_SOURCE_API_KEY`] ?? process.env.SOURCE_UTXORPC_API_KEY;
    route.destination.utxorpcApiKey = route.destination.utxorpcApiKey ?? process.env[`${envPrefix}_DEST_API_KEY`] ?? process.env.DEST_UTXORPC_API_KEY;
    route.destination.walletSeed = route.destination.walletSeed ?? process.env[`${envPrefix}_DEST_WALLET_SEED`];
  }

  return data.routes;
}

// Load configuration from environment variables as an Effect
export const loadConfigFromEnv = Effect.try({
  try: (): BridgeConfig => {
    // Check for routes JSON file first
    const routesFile = process.env.BRIDGE_ROUTES_FILE;
    if (routesFile) {
      console.log(`📄 Loading routes from ${routesFile}`);
      const routes = loadRoutesFromFile(routesFile);
      const first = routes[0];
      const config: BridgeConfig = {
        routes,
        networks: {
          source: {
            name: first.source.name,
            utxorpcEndpoint: first.source.utxorpcEndpoint ?? "",
            lucidProvider: first.source.lucidProvider ?? "",
            lucidNetwork: first.source.lucidNetwork ?? "",
            depositAddresses: first.source.addresses,
          },
          destination: {
            name: first.destination.name,
            utxorpcEndpoint: first.destination.utxorpcEndpoint ?? "",
            lucidProvider: first.destination.lucidProvider ?? "",
            lucidNetwork: first.destination.lucidNetwork ?? "",
            senderAddresses: first.destination.addresses,
          },
        },
        bridge: first.bridge,
        security: first.security,
        grpc: {
          indexerPort: getEnvInt("GRPC_INDEXER_PORT", 50051),
          relayerPort: getEnvInt("GRPC_RELAYER_PORT", 50052),
          mirrorPort: getEnvInt("GRPC_MIRROR_PORT", 50053),
        },
        api: { port: getEnvInt("API_PORT", 3001) },
      };
      validateConfig(config);
      return config;
    }

    // Build legacy source/destination config from env vars
    const sourceNetwork = {
      name: getEnv('SOURCE_NETWORK_NAME', 'preproduction'),
      utxorpcEndpoint: getEnv('SOURCE_UTXORPC_URL', 'https://preprod.utxorpc-v0.demeter.run'),
      lucidProvider: getEnv('SOURCE_LUCID_PROVIDER', 'https://preprod.koios.rest/api/v1'),
      lucidNetwork: getEnv('SOURCE_LUCID_NETWORK', 'Preproduction'),
      depositAddresses: parseAddressList('SOURCE_DEPOSIT_ADDRESSES', [
        'addr_test1qpnueplse6f4d55eumh7f3tzp3wx882xk7qs6ydxtynrfsw89vzfjf0v4yca056el40n7pr568rdls6lp6eu0dwek9nqku88yp'
      ]),
    };
    const destinationNetwork = {
      name: getEnv('DEST_NETWORK_NAME', 'preview'),
      utxorpcEndpoint: getEnv('DEST_UTXORPC_URL', 'https://preview.utxorpc-v0.demeter.run'),
      lucidProvider: getEnv('DEST_LUCID_PROVIDER', 'https://preview.koios.rest/api/v1'),
      lucidNetwork: getEnv('DEST_LUCID_NETWORK', 'Preview'),
      senderAddresses: parseAddressList('DEST_SENDER_ADDRESSES', [
        'addr_test1qpg5fj3gsmt673lpxlpzhum6mrw2z0hyk3u455swep39zdt6yr3r556e70k6uvrj8jyey6jwnaeamenujatxuqs50ljq2mq4xl'
      ]),
    };
    const bridgeParams = {
      allowedAssets: parseAddressList('BRIDGE_ALLOWED_ASSETS', ['ADA']),
      minDepositAmount: getEnv('BRIDGE_MIN_DEPOSIT_AMOUNT', '2000000'),
      maxTransferAmount: getEnv('BRIDGE_MAX_TRANSFER_AMOUNT', '100000000000'),
      feeAmount: getEnv('BRIDGE_FEE_AMOUNT', '1000000'),
    };
    const securityParams = {
      requiredConfirmations: getEnvInt('SECURITY_REQUIRED_CONFIRMATIONS', 5),
      retryAttempts: getEnvInt('SECURITY_RETRY_ATTEMPTS', 3),
      retryDelayMs: getEnvInt('SECURITY_RETRY_DELAY_MS', 5000),
    };

    // Build default route from legacy env vars
    const defaultRoute: BridgeRoute = {
      id: `${sourceNetwork.name}-to-${destinationNetwork.name}`,
      source: {
        chainId: `cardano-${sourceNetwork.name}`,
        chainType: "cardano",
        name: sourceNetwork.name,
        utxorpcEndpoint: sourceNetwork.utxorpcEndpoint,
        utxorpcApiKey: process.env.SOURCE_UTXORPC_API_KEY,
        lucidProvider: sourceNetwork.lucidProvider,
        lucidNetwork: sourceNetwork.lucidNetwork,
        addresses: sourceNetwork.depositAddresses ?? [],
      },
      destination: {
        chainId: `cardano-${destinationNetwork.name}`,
        chainType: "cardano",
        name: destinationNetwork.name,
        utxorpcEndpoint: destinationNetwork.utxorpcEndpoint,
        utxorpcApiKey: process.env.DEST_UTXORPC_API_KEY,
        lucidProvider: destinationNetwork.lucidProvider,
        lucidNetwork: destinationNetwork.lucidNetwork,
        addresses: destinationNetwork.senderAddresses ?? [],
        walletSeed: process.env.DEST_SENDER_WALLET_SEED,
      },
      bridge: bridgeParams,
      security: securityParams,
    };

    const config: BridgeConfig = {
      routes: [defaultRoute],
      networks: {
        source: sourceNetwork,
        destination: destinationNetwork,
      },
      bridge: bridgeParams,
      security: securityParams,
      grpc: {
        indexerPort: getEnvInt('GRPC_INDEXER_PORT', 50051),
        relayerPort: getEnvInt('GRPC_RELAYER_PORT', 50052),
        mirrorPort: getEnvInt('GRPC_MIRROR_PORT', 50053),
      },
      api: {
        port: getEnvInt('API_PORT', 3001),
      },
    };

    validateConfig(config);
    return config;
  },
  catch: (unknown) => new Error(`Configuration Error: ${unknown}`),
});

// Create a Layer that provides a live implementation of the Config service
export const ConfigLive = Layer.effect(Config, loadConfigFromEnv);

// Get UTXORPC headers for a specific network
export const getUtxorpcHeaders = (networkType: 'source' | 'destination'): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  const apiKeyVar = networkType === 'source' ? 'SOURCE_UTXORPC_API_KEY' : 'DEST_UTXORPC_API_KEY';
  const apiKey = process.env[apiKeyVar];
  
  if (apiKey) {
    headers['dmtr-api-key'] = apiKey;
  }
  
  return headers;
};

// Configuration validation
export const validateConfig = (config: BridgeConfig): void => {
  // Validate addresses
  if (!config.networks.source.depositAddresses?.length) {
    throw new Error("Source network must have at least one deposit address");
  }

  if (!config.networks.destination.senderAddresses?.length) {
    throw new Error("Destination network must have at least one sender address");
  }

  // Validate amounts
  const minDeposit = BigInt(config.bridge.minDepositAmount);
  const maxTransfer = BigInt(config.bridge.maxTransferAmount);
  const fee = BigInt(config.bridge.feeAmount);

  if (minDeposit >= maxTransfer) {
    throw new Error("Minimum deposit amount must be less than maximum transfer amount");
  }

  if (fee >= minDeposit) {
    throw new Error("Fee amount must be less than minimum deposit amount");
  }

  // Validate ports
  const ports = [config.grpc.indexerPort, config.grpc.relayerPort, config.grpc.mirrorPort];
  const uniquePorts = new Set(ports);
  if (uniquePorts.size !== ports.length) {
    throw new Error("All gRPC ports must be unique");
  }

  // Validate UTXORPC endpoints
  if (!config.networks.source.utxorpcEndpoint.startsWith('http')) {
    throw new Error("Source UTXORPC endpoint must be a valid HTTP(S) URL");
  }

  if (!config.networks.destination.utxorpcEndpoint.startsWith('http')) {
    throw new Error("Destination UTXORPC endpoint must be a valid HTTP(S) URL");
  }

  // Validate per-asset configs on routes
  for (const route of config.routes) {
    if (!route.bridge.assetConfigs) continue;
    for (const [symbol, assetCfg] of Object.entries(route.bridge.assetConfigs)) {
      if (!route.bridge.allowedAssets.includes(symbol)) {
        throw new Error(`Route ${route.id}: assetConfig "${symbol}" not in allowedAssets`);
      }
      if (assetCfg.destinationAction === "mint" && !assetCfg.mintScriptType) {
        throw new Error(`Route ${route.id}: asset "${symbol}" has destinationAction "mint" but no mintScriptType`);
      }
      // Validate unit format: must be 56+ hex chars (policyId + assetName) or start with PLACEHOLDER
      for (const field of ["sourceUnit", "destinationUnit"] as const) {
        const unit = assetCfg[field];
        if (unit && !unit.startsWith("PLACEHOLDER") && (unit.length < 56 || !/^[0-9a-fA-F]+$/.test(unit))) {
          console.warn(`⚠️ Route ${route.id}: asset "${symbol}" ${field} "${unit}" does not look like a valid Cardano unit (expected 56+ hex chars)`);
        }
      }
      const assetMin = BigInt(assetCfg.minDepositAmount);
      const assetMax = BigInt(assetCfg.maxTransferAmount);
      if (assetMin >= assetMax) {
        throw new Error(`Route ${route.id}: asset "${symbol}" minDepositAmount must be less than maxTransferAmount`);
      }
    }
  }
};

// Helper function to load config from file as an Effect
export const loadConfigFromFile = (filePath: string): Effect.Effect<BridgeConfig, Error> =>
  Effect.tryPromise({
    try: async () => {
      const fs = await import("node:fs");
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const config = JSON.parse(content) as BridgeConfig;
      validateConfig(config);
      return config;
    },
    catch: (unknown) => new Error(`Failed to load config from file: ${unknown}`),
  });

// Default configuration for testing (fallback)
export const defaultConfig: BridgeConfig = {
  routes: [{
    id: "preproduction-to-preview",
    source: {
      chainId: "cardano-preproduction",
      chainType: "cardano",
      name: "preproduction",
      utxorpcEndpoint: "https://cardano-preprod.utxorpc-m1.demeter.run",
      lucidProvider: "https://preprod.koios.rest/api/v1",
      lucidNetwork: "Preprod",
      addresses: ["addr_test1qpnueplse6f4d55eumh7f3tzp3wx882xk7qs6ydxtynrfsw89vzfjf0v4yca056el40n7pr568rdls6lp6eu0dwek9nqku88yp"],
    },
    destination: {
      chainId: "cardano-preview",
      chainType: "cardano",
      name: "preview",
      utxorpcEndpoint: "https://cardano-preview.utxorpc-m1.demeter.run",
      lucidProvider: "https://preview.koios.rest/api/v1",
      lucidNetwork: "Preview",
      addresses: ["addr_test1qpg5fj3gsmt673lpxlpzhum6mrw2z0hyk3u455swep39zdt6yr3r556e70k6uvrj8jyey6jwnaeamenujatxuqs50ljq2mq4xl"],
    },
    bridge: { allowedAssets: ["ADA"], minDepositAmount: "1000000", maxTransferAmount: "100000000000", feeAmount: "1000000" },
    security: { requiredConfirmations: 5, retryAttempts: 3, retryDelayMs: 5000 },
  }],
  networks: {
    source: {
      name: "preproduction",
      utxorpcEndpoint: "https://cardano-preprod.utxorpc-m1.demeter.run",
      lucidProvider: "https://preprod.koios.rest/api/v1",
      lucidNetwork: "Preproduction",
      depositAddresses: ["addr_test1qpnueplse6f4d55eumh7f3tzp3wx882xk7qs6ydxtynrfsw89vzfjf0v4yca056el40n7pr568rdls6lp6eu0dwek9nqku88yp"],
    },
    destination: {
      name: "preview",
      utxorpcEndpoint: "https://cardano-preview.utxorpc-m1.demeter.run",
      lucidProvider: "https://preview.koios.rest/api/v1",
      lucidNetwork: "Preview",
      senderAddresses: ["addr_test1qpg5fj3gsmt673lpxlpzhum6mrw2z0hyk3u455swep39zdt6yr3r556e70k6uvrj8jyey6jwnaeamenujatxuqs50ljq2mq4xl"],
    },
  },
  bridge: { allowedAssets: ["ADA"], minDepositAmount: "1000000", maxTransferAmount: "100000000000", feeAmount: "1000000" },
  security: { requiredConfirmations: 5, retryAttempts: 3, retryDelayMs: 5000 },
  grpc: { indexerPort: 50051, relayerPort: 50052, mirrorPort: 50053 },
  api: { port: 3001 },
}; 