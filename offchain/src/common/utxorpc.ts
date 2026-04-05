import { Effect, Context, Layer, Stream } from "effect";
import { CardanoWatchClient, CardanoSubmitClient } from "@utxorpc/sdk";
import { cardano } from "@utxorpc/spec";
import { CML } from '@lucid-evolution/lucid'
import { bech32 } from "bech32";
import type { DepositEvent } from "./types.js";
import { Config, getUtxorpcHeaders } from "./config.js";

// UTXORPC Error types
export class UtxorpcError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "UtxorpcError";
  }
}

// Define a Utxorpc Service using Context.Tag
export class Utxorpc extends Context.Tag("Utxorpc")<Utxorpc, {
  readonly watchAddresses: (addresses: string[]) => Stream.Stream<DepositEvent, UtxorpcError>;
  readonly submitTransaction: (txCbor: Uint8Array) => Effect.Effect<string, UtxorpcError>;
  readonly waitForTxConfirmation: (txHash: string) => Stream.Stream<string, UtxorpcError>;
  readonly watchMempool: () => Stream.Stream<any, UtxorpcError>;
  readonly close: () => Effect.Effect<void>;
}>() { }

// UTXORPC implementation
const makeUtxorpcService = (config: Context.Tag.Service<Config>): Effect.Effect<Context.Tag.Service<Utxorpc>, UtxorpcError> =>
  Effect.try({
    try: () => {
      const headers = getUtxorpcHeaders('source');

      if (headers && headers['dmtr-api-key']) {
        console.log('🔑 Using dmtr-api-key authentication');
      }

      const clientOptions = {
        uri: config.networks.source.utxorpcEndpoint,
        ...(headers && { headers }),
      };

      const watchClient = new CardanoWatchClient(clientOptions);
      const submitClient = new CardanoSubmitClient(clientOptions);

      return {
        watchAddresses: (addresses: string[]) =>
          Stream.async<DepositEvent, UtxorpcError>((emit) => {
            console.log(`🔍 Watching addresses: ${addresses.join(', ')} on ${config.networks.source.utxorpcEndpoint}`);

            const watchStreams = addresses.map(async (addressBech32) => {
              try {
                const addressBytes = addressToBytes(addressBech32);
                console.log(`📡 Starting watch stream for address: ${addressBech32}`);
                // console.log(`🔑 Auth headers: ${JSON.stringify(headers)}`);

                const txEvents = watchClient.watchTxForAddress(addressBytes);

                for await (const event of txEvents) {
                  console.log(`📨 Received transaction event:`, event);

                  if (event.action === 'apply' && event.Tx) {
                    const deposits = await extractDepositsFromTx(event.Tx, addressBech32);
                    for (const deposit of deposits) {
                      emit.single(deposit);
                    }
                  }
                }
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorCode = (error as any)?.code;

                // Only log auth errors — transient stream drops are expected and auto-recovered
                if (errorMessage.includes('Unauthorized') || errorCode === 16) {
                  console.error(`🔑 Authentication failed for ${config.networks.source.utxorpcEndpoint} — check API key`);
                }

                emit.fail(new UtxorpcError(`Failed to watch addresses: ${error}`, error));
              }
            });

            // Start all watch streams
            Promise.all(watchStreams).catch(error => {
              emit.fail(new UtxorpcError(`Failed to start watch streams: ${error}`, error));
            });

            return Effect.sync(() => {});
          }),

        submitTransaction: (txCbor: Uint8Array) =>
          Effect.tryPromise({
            try: async () => {
              console.log(`📡 Submitting transaction to ${config.networks.source.utxorpcEndpoint}`);

              const txHash = await submitClient.submitTx(txCbor);
              const hashHex = Buffer.from(txHash).toString('hex');

              console.log(`✅ Transaction submitted successfully: ${hashHex}`);
              return hashHex;
            },
            catch: (error) => {
              console.error(`❌ Transaction submission failed:`, error);

              const errorMessage = error instanceof Error ? error.message : String(error);
              const errorCode = (error as any)?.code;

              if (errorMessage.includes('Unauthorized') || errorCode === 16) {
                console.log('🔍 Submit authentication failed. Check API key permissions for Submit service.');
              }

              return new UtxorpcError(`Failed to submit transaction: ${error}`, error);
            },
          }),

        waitForTxConfirmation: (txHash: string) =>
          Stream.async<string, UtxorpcError>((emit) => {
            console.log(`⏳ Waiting for transaction confirmation: ${txHash}`);

            const watchConfirmation = async () => {
              try {
                const txHashBytes = Buffer.from(txHash, 'hex');
                const confirmationStates = submitClient.waitForTx(txHashBytes);

                for await (const stage of confirmationStates) {
                  console.log(`📊 Transaction ${txHash} stage: ${stage}`);
                  emit.single(stage.toString());
                }

                emit.end();
              } catch (error) {
                console.error(`❌ Error waiting for confirmation:`, error);
                emit.fail(new UtxorpcError(`Failed to wait for confirmation: ${error}`, error));
              }
            };

            watchConfirmation();

            return Effect.sync(() => {
              console.log(`🔌 Stopping confirmation watch for ${txHash}`);
            });
          }),

        watchMempool: () =>
          Stream.async<any, UtxorpcError>((emit) => {
            console.log(`👀 Watching mempool on ${config.networks.source.utxorpcEndpoint}`);

            const watchMempoolEvents = async () => {
              try {
                const mempoolEvents = submitClient.watchMempool();

                for await (const event of mempoolEvents) {
                  console.log(`🏊 Mempool event:`, event);
                  emit.single(event);
                }
              } catch (error) {
                console.error(`❌ Error watching mempool:`, error);
                emit.fail(new UtxorpcError(`Failed to watch mempool: ${error}`, error));
              }
            };

            watchMempoolEvents();

            return Effect.sync(() => {
              console.log("🔌 Stopping mempool watch");
            });
          }),

        close: () =>
          Effect.sync(() => {
            console.log("🔌 Closing UTXORPC client connections");
            // The SDK clients don't have explicit close methods
            // Connections will be closed when the instance is garbage collected
          }),
      };
    },
    catch: (error) => new UtxorpcError(`Failed to create UTXORPC service: ${error}`, error),
  });

// Create a Layer that provides the Utxorpc service
export const UtxorpcLive = Layer.effect(
  Utxorpc,
  Effect.flatMap(Config, makeUtxorpcService)
);

// Helper: Convert Bech32 Cardano address to raw bytes
export const addressToBytes = (addressBech32: string): Uint8Array => {
  try {
    // Decode Cardano bech32 address (addr_test1... / addr1...)
    // Uses bech32 library with extended limit for Cardano's longer addresses
    const decoded = bech32.decode(addressBech32, 200);
    return new Uint8Array(bech32.fromWords(decoded.words));
  } catch (error) {
    // Fallback: try CML
    try {
      const cmlAddress = CML.Address.from_bech32(addressBech32);
      return cmlAddress.to_raw_bytes();
    } catch (cmlError) {
      throw new UtxorpcError(
        `Failed to decode address ${addressBech32}: bech32 error: ${error}, CML error: ${cmlError}`,
      );
    }
  }
};

/**
 * Extract deposit information from a transaction.
 *
 * @param tx            UTXORPC transaction
 * @param watchedAddress  Bech32 address to match outputs against
 * @param allowedAssetUnits  Optional map of on-chain unit (policyId+assetNameHex) → symbol.
 *                           When provided, native token outputs matching these units are
 *                           extracted as token deposits. When absent, only ADA is extracted.
 */
export const extractDepositsFromTx = async (
  tx: cardano.Tx,
  watchedAddress: string,
  allowedAssetUnits?: Map<string, string>,
): Promise<DepositEvent[]> => {
  const deposits: DepositEvent[] = [];

  try {
    console.log(`🔍 Extracting deposits from transaction for address: ${watchedAddress}`);

    const txHash = tx.hash ? Buffer.from(tx.hash).toString('hex') : 'unknown_hash';
    const metadata = extractMetadata(tx);

    // Read the "a" (asset) field from label-1337 metadata.
    // Default to "ADA" when absent for backward compatibility.
    const rawMetadataAsset = resolveMetadataAsset(metadata);
    // Sanitize: alphanumeric, max 20 chars
    const metadataAsset = /^[A-Za-z0-9]{1,20}$/.test(rawMetadataAsset) ? rawMetadataAsset : "ADA";

    if (tx.outputs && tx.outputs.length > 0) {
      for (let outputIndex = 0; outputIndex < tx.outputs.length; outputIndex++) {
        const output = tx.outputs[outputIndex];

        if (output?.address && output.coin !== undefined) {
          try {
            const outputAddressBech32 = CML.Address.from_raw_bytes(output.address).to_bech32();
            if (outputAddressBech32 !== watchedAddress) continue;

            const adaAmount = BigInt(output.coin);

            // Extract sender address from first input
            const senderAddress = extractSenderAddress(tx);

            // If metadata says this is a token deposit, look for native tokens
            if (metadataAsset !== "ADA" && allowedAssetUnits && output.assets && output.assets.length > 0) {
              const tokenDeposit = extractTokenDeposit(
                output, metadataAsset, allowedAssetUnits,
                txHash, senderAddress, watchedAddress, outputIndex, metadata, adaAmount,
              );
              if (tokenDeposit) {
                deposits.push(tokenDeposit);
                console.log(`💰 Found token deposit: ${tokenDeposit.amount} ${tokenDeposit.assetType} to ${watchedAddress} (output ${outputIndex})`);
                continue; // Don't also create an ADA deposit for this output
              }
              // Metadata says token but token not found — skip this output entirely
              // (don't create a spurious ADA deposit for a failed token match)
              console.warn(`⚠️ Metadata asset "${metadataAsset}" not found on output ${outputIndex}, skipping`);
              continue;
            }

            // ADA deposit (default path — only when metadata is absent or explicitly "ADA")
            if (adaAmount > 0) {
              deposits.push({
                routeId: "",
                transactionHash: txHash,
                senderAddress,
                recipientAddress: watchedAddress,
                amount: adaAmount,
                assetType: "ADA",
                blockSlot: BigInt(0),
                blockHash: "unknown_block",
                outputIndex,
                metadata,
                timestamp: BigInt(Date.now()),
              });
              console.log(`💰 Found deposit: ${adaAmount} lovelace to ${watchedAddress} (output ${outputIndex})`);
            }
          } catch (error) {
            console.warn(`⚠️ Could not process output ${outputIndex}:`, error);
          }
        }
      }
    }

    if (deposits.length === 0) {
      console.log(`ℹ️ No deposits found for address ${watchedAddress} in transaction ${txHash}`);
    }

    return deposits;
  } catch (error) {
    console.error(`❌ Error extracting deposits:`, error);
    return [];
  }
};

/** Extract sender address from the first transaction input. */
const extractSenderAddress = (tx: cardano.Tx): string => {
  if (tx.inputs && tx.inputs.length > 0) {
    const firstInput = tx.inputs[0];
    if (firstInput?.asOutput?.address) {
      try {
        return CML.Address.from_raw_bytes(firstInput.asOutput.address).to_bech32();
      } catch {
        // fall through
      }
    }
  }
  return "unknown_sender";
};

/**
 * Read the asset symbol from label-1337 metadata field "a".
 * Returns "ADA" if missing (backward compat with v1.0.0 metadata).
 */
const resolveMetadataAsset = (metadata: Record<string, string>): string => {
  // Label 1337 metadata is stored under key "1337" as a JSON string
  const raw = metadata["1337"];
  if (!raw) return "ADA";
  try {
    const parsed = JSON.parse(raw);
    // "a" field can be at top level or nested in the parsed map
    if (typeof parsed === "object" && parsed !== null) {
      if (typeof parsed.a === "string") return parsed.a;
      // Handle array format from Cardano metadata (map entries)
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (entry?.a && typeof entry.a === "string") return entry.a;
        }
      }
    }
  } catch {
    // Metadata "a" might be stored as a direct key if extractMetadata flattened it
    if (metadata["a"] && typeof metadata["a"] === "string") return metadata["a"];
  }
  return "ADA";
};

/**
 * Extract a native token deposit from a UTXORPC output.
 * Returns null if the output doesn't contain the expected token.
 */
const extractTokenDeposit = (
  output: cardano.TxOutput,
  assetSymbol: string,
  allowedAssetUnits: Map<string, string>,
  txHash: string,
  senderAddress: string,
  watchedAddress: string,
  outputIndex: number,
  metadata: Record<string, string>,
  adaAmount: bigint,
): DepositEvent | null => {
  if (!output.assets) return null;

  for (const multiasset of output.assets) {
    const policyIdHex = Buffer.from(multiasset.policyId).toString("hex");
    for (const asset of multiasset.assets) {
      const assetNameHex = Buffer.from(asset.name).toString("hex");
      const unit = policyIdHex + assetNameHex;
      const quantity = BigInt(asset.outputCoin);

      // Check if this unit matches an allowed asset AND matches the metadata symbol
      const configSymbol = allowedAssetUnits.get(unit);
      if (configSymbol && configSymbol === assetSymbol && quantity > 0n) {
        return {
          routeId: "",
          transactionHash: txHash,
          senderAddress,
          recipientAddress: watchedAddress,
          amount: quantity,
          assetType: assetSymbol,
          blockSlot: BigInt(0),
          blockHash: "unknown_block",
          outputIndex,
          metadata,
          timestamp: BigInt(Date.now()),
          attachedLovelace: adaAmount,
        };
      }
    }
  }
  return null;
};

// Helper: Extract metadata from transaction
const extractMetadata = (tx: cardano.Tx): Record<string, string> => {
  const metadata: Record<string, string> = {};

  try {
    if (tx.auxiliary && tx.auxiliary.metadata) {
      // Parse metadata if available
      const metadataArray = tx.auxiliary.metadata;
      if (Array.isArray(metadataArray)) {
        for (const metadataItem of metadataArray) {
          if (metadataItem.label && metadataItem.value) {
            const key = metadataItem.label.toString();
            const value = extractMetadatumValue(metadataItem.value);
            if (value !== null) {
              metadata[key] = value;
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Could not extract metadata:`, error);
  }

  return metadata;
};

// Helper: Extract value from Metadatum
const extractMetadatumValue = (metadatum: any): string | null => {
  try {
    if (!metadatum || !metadatum.metadatum) {
      return null;
    }

    const { metadatum: value } = metadatum;

    if (value.case === 'text' && typeof value.value === 'string') {
      return value.value;
    } else if (value.case === 'int' && typeof value.value === 'bigint') {
      return value.value.toString();
    } else if (value.case === 'bytes' && value.value instanceof Uint8Array) {
      return Buffer.from(value.value).toString('utf8');
    } else if (value.case === 'array' || value.case === 'map') {
      return JSON.stringify(value.value);
    }

    return JSON.stringify(value);
  } catch (error) {
    console.warn(`⚠️ Could not extract metadatum value:`, error);
    return null;
  }
};

// Legacy compatibility helpers
export const createAddressPredicate = (addresses: string[]) => ({
  match: {
    cardano: {
      has_address: {
        exact_address: addresses,
      },
    },
  },
});

export const createDepositPredicate = (depositAddresses: string[]) => ({
  match: {
    cardano: {
      produces: {
        address: {
          exact_address: depositAddresses,
        },
      },
    },
  },
});

// Type-safe wrapper for UTXORPC responses
export interface UtxorpcResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const wrapUtxorpcCall = <T>(
  call: Effect.Effect<T, UtxorpcError>
): Effect.Effect<T, UtxorpcError> => call; 