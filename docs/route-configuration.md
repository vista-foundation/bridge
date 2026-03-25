# Route Configuration

## Overview

Vista Bridge uses **routes** to define bridge paths. Each route is a one-way connection between a source chain and a destination chain. For bidirectional bridging, configure two routes.

## Configuration Methods

### Method 1: Legacy Environment Variables (Single Route)

The simplest setup — a single route from legacy `SOURCE_*` / `DEST_*` env vars:

```bash
# offchain/.env
SOURCE_NETWORK_NAME=preproduction
SOURCE_UTXORPC_URL=https://cardano-preprod.utxorpc-m1.demeter.run
SOURCE_UTXORPC_API_KEY=your_api_key
SOURCE_LUCID_PROVIDER=https://preprod.koios.rest/api/v1
SOURCE_LUCID_NETWORK=Preproduction
SOURCE_DEPOSIT_ADDRESSES=addr_test1...

DEST_NETWORK_NAME=preview
DEST_UTXORPC_URL=https://cardano-preview.utxorpc-m1.demeter.run
DEST_UTXORPC_API_KEY=your_api_key
DEST_LUCID_PROVIDER=https://preview.koios.rest/api/v1
DEST_LUCID_NETWORK=Preview
DEST_SENDER_ADDRESSES=addr_test1...
DEST_SENDER_WALLET_SEED=your seed phrase here

BRIDGE_ALLOWED_ASSETS=ADA
BRIDGE_FEE_AMOUNT=1000000
API_PORT=3001
```

This creates a single route with ID `preproduction-to-preview`.

### Method 2: Routes JSON File (Multiple Routes)

For multi-route setups (e.g., bidirectional), create a JSON config:

```bash
# offchain/.env
BRIDGE_ROUTES_FILE=config/routes.json
API_PORT=3001
```

```json
// offchain/config/routes.json
{
  "routes": [
    {
      "id": "preprod-to-preview",
      "source": {
        "chainId": "cardano-preprod",
        "chainType": "cardano",
        "name": "preproduction",
        "utxorpcEndpoint": "https://cardano-preprod.utxorpc-m1.demeter.run",
        "lucidProvider": "https://preprod.koios.rest/api/v1",
        "lucidNetwork": "Preprod",
        "addresses": ["addr_test1q_deposit_on_preprod..."]
      },
      "destination": {
        "chainId": "cardano-preview",
        "chainType": "cardano",
        "name": "preview",
        "utxorpcEndpoint": "https://cardano-preview.utxorpc-m1.demeter.run",
        "lucidProvider": "https://preview.koios.rest/api/v1",
        "lucidNetwork": "Preview",
        "addresses": ["addr_test1q_sender_on_preview..."]
      },
      "bridge": {
        "allowedAssets": ["ADA"],
        "minDepositAmount": "2000000",
        "maxTransferAmount": "100000000000",
        "feeAmount": "1000000"
      },
      "security": {
        "requiredConfirmations": 5,
        "retryAttempts": 3,
        "retryDelayMs": 5000
      }
    },
    {
      "id": "preview-to-preprod",
      "source": {
        "chainId": "cardano-preview",
        "chainType": "cardano",
        "name": "preview",
        "utxorpcEndpoint": "https://cardano-preview.utxorpc-m1.demeter.run",
        "addresses": ["addr_test1q_deposit_on_preview..."]
      },
      "destination": {
        "chainId": "cardano-preprod",
        "chainType": "cardano",
        "name": "preproduction",
        "utxorpcEndpoint": "https://cardano-preprod.utxorpc-m1.demeter.run",
        "lucidProvider": "https://preprod.koios.rest/api/v1",
        "lucidNetwork": "Preprod",
        "addresses": ["addr_test1q_sender_on_preprod..."]
      },
      "bridge": { "..." : "same structure" }
    }
  ]
}
```

### Secrets via Environment Variables

API keys and wallet seeds should NOT be in the JSON file. Use env vars with a naming convention:

```bash
# Per-route secrets
ROUTE_PREPROD_TO_PREVIEW_SOURCE_API_KEY=utxorpc...
ROUTE_PREPROD_TO_PREVIEW_DEST_API_KEY=utxorpc...
ROUTE_PREPROD_TO_PREVIEW_DEST_WALLET_SEED=word1 word2 ...

ROUTE_PREVIEW_TO_PREPROD_SOURCE_API_KEY=utxorpc...
ROUTE_PREVIEW_TO_PREPROD_DEST_API_KEY=utxorpc...
ROUTE_PREVIEW_TO_PREPROD_DEST_WALLET_SEED=word1 word2 ...
```

## Route Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique route identifier |
| `source.chainId` | Yes | Unique chain ID (e.g., "cardano-preprod") |
| `source.chainType` | Yes | Chain family: "cardano", "evm", "solana", "bitcoin" |
| `source.name` | Yes | Human-readable name |
| `source.utxorpcEndpoint` | Cardano | UTXORPC gRPC endpoint |
| `source.utxorpcApiKey` | Cardano | Demeter API key |
| `source.addresses` | Yes | Deposit addresses to watch |
| `destination.chainId` | Yes | Unique chain ID |
| `destination.chainType` | Yes | Chain family |
| `destination.utxorpcEndpoint` | Cardano | UTXORPC for submission |
| `destination.lucidProvider` | Cardano | Koios URL for UTXO queries |
| `destination.lucidNetwork` | Cardano | "Preprod", "Preview", or "Mainnet" |
| `destination.addresses` | Yes | Sender addresses for mirror txs |
| `destination.walletSeed` | Yes | Seed phrase for signing mirror txs |
| `bridge.allowedAssets` | Yes | Allowed asset types (e.g., ["ADA"]) |
| `bridge.feeAmount` | Yes | Bridge fee in smallest unit (lovelace) |
| `bridge.minDepositAmount` | Yes | Minimum deposit |
| `bridge.maxTransferAmount` | Yes | Maximum deposit |
| `security.requiredConfirmations` | Yes | Block confirmations needed |
| `security.retryAttempts` | Yes | Max mirror tx retry attempts |

## Generating Wallet Addresses

For Cardano routes, generate deposit and sender addresses:

```bash
cd offchain && bun run scripts/generate-bridge-wallets.ts
```

This outputs addresses for both Preprod and Preview networks, plus the seed phrases to put in your `.env`.

## Verifying Routes

After configuration, verify with the API:

```bash
curl http://localhost:3001/api/routes | jq
```

Should return all configured routes with their deposit addresses, fees, and network info.
