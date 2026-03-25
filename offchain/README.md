# VISTA Bridge

A cross-chain bridge for Cardano networks using UTXORPC protocol for real-time transaction monitoring and submission.

## Features

- **Real UTXORPC Integration**: Uses `@utxorpc/sdk` for live transaction monitoring
- **Environment Configuration**: Flexible configuration via `.env` files
- **Multi-Network Support**: Bridge between any two Cardano networks (testnet/mainnet)
- **State Persistence**: Uses SQLite to persist bridge state.
- **Comprehensive Monitoring**: Real-time status reporting and health checks

## Architecture

The bridge consists of three core services:

1. **🔍 Indexer**: Watches deposit addresses using UTXORPC WatchClient
2. **📡 Relayer**: Message queue and state management 
3. **🔄 Mirror**: Creates and submits mirror transactions using UTXORPC SubmitClient

These services run together in a single monolithic process.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the environment template and populate with your values:

```bash
cp config/env.template .env
```

Edit `.env` with your configuration:

```env
# Source Network (where deposits are watched)
SOURCE_NETWORK_NAME=preproduction
SOURCE_UTXORPC_URL=https://cardano-preprod-v1.utxorpc.io
SOURCE_UTXORPC_API_KEY=your_demeter_api_key_here
SOURCE_DEPOSIT_ADDRESSES=addr_test1q...

# Destination Network (where mirror transactions are sent)
DEST_NETWORK_NAME=preview
DEST_UTXORPC_URL=https://cardano-preview-v1.utxorpc.io
DEST_UTXORPC_API_KEY=your_demeter_api_key_here
DEST_SENDER_ADDRESSES=addr_test1q...

# Bridge Configuration
BRIDGE_ALLOWED_ASSETS=ADA
BRIDGE_MIN_DEPOSIT_AMOUNT=2000000
BRIDGE_MAX_TRANSFER_AMOUNT=100000000000
BRIDGE_FEE_AMOUNT=1000000
```

### 3. Get Demeter API Keys

1. Visit [Demeter.run](https://demeter.run)
2. Create an account and project
3. Get your API keys for UTXORPC endpoints
4. Add them to your `.env` file

### 4. Build and Run

```bash
npm run build
npm start
```

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

```bash
npm test
```

## UTXORPC Integration

The bridge uses the official UTXORPC SDK with these features:

### Watching Deposits
- **CardanoWatchClient**: Monitors addresses for incoming transactions
- **Real-time Processing**: Processes transactions as they occur on-chain
- **Automatic Retries**: Handles connection failures gracefully

### Submitting Transactions
- **CardanoSubmitClient**: Submits mirror transactions to destination network
- **Transaction Tracking**: Monitors submission status and confirmations
- **Error Handling**: Comprehensive error reporting and retry logic

### Authentication
- **Demeter Integration**: Uses `dmtr-api-key` header format
- **Per-Network Keys**: Separate API keys for source and destination networks
- **Secure Configuration**: API keys loaded from environment variables

## Bridge Flow

1. **Deposit Detection**: Indexer watches configured addresses via UTXORPC
2. **Validation**: Checks deposit amount, asset type, and confirmations
3. **Queue Processing**: Relayer manages deposit queue and notifies subscribers
4. **Mirror Creation**: Mirror service builds equivalent transaction for destination
5. **Transaction Submission**: Mirror transaction submitted via UTXORPC
6. **Confirmation Tracking**: Monitor transaction status until confirmed

## Security Considerations

- **Private Key Management**: Store keys securely, never in code
- **API Key Security**: Use environment variables for Demeter keys
- **Address Validation**: Verify addresses belong to your control
- **Amount Limits**: Configure appropriate min/max transfer amounts
- **Network Isolation**: Use separate keys for different networks

## Production Deployment

1. **Environment Setup**: Use production UTXORPC endpoints
2. **Key Management**: Secure API key storage (e.g., AWS Secrets Manager)
3. **Monitoring**: Set up alerts for bridge health and transaction failures
4. **Backup**: Implement state backup and recovery procedures
5. **Logging**: Configure structured logging for audit trails

## Support

For issues and questions:
- Check the configuration template: `config/env.template`
- Review UTXORPC documentation: [UTXORPC Spec](https://utxorpc.org)
- Visit Demeter for API support: [Demeter.run](https://demeter.run)
- Visit Koios for API docs: [koios.rest](https://koios.rest)

## License

Shield: [![CC BY 4.0][cc-by-shield]][cc-by]

This work is licensed under a
[Creative Commons Attribution 4.0 International License][cc-by].

[![CC BY 4.0][cc-by-image]][cc-by]

[cc-by]: http://creativecommons.org/licenses/by/4.0/
[cc-by-image]: https://i.creativecommons.org/l/by/4.0/88x31.png
[cc-by-shield]: https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg



