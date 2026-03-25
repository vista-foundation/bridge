"use client";

import { useState, useEffect } from "react";
import type { WalletBalance } from "../bridge-data";
import { bridgeApi } from "../api-client";

interface UseWalletBalanceResult {
  balances: WalletBalance[];
  loading: boolean;
  error: string | null;
}

/**
 * Queries wallet balances using two strategies:
 * 1. Backend UTXORPC query (works for any address — no wallet extension needed)
 * 2. Mesh SDK BrowserWallet fallback (for connected Cardano wallets)
 *
 * The backend route is preferred because it works for pasted addresses too.
 */
export function useWalletBalance(
  walletInstance: unknown | null,
  networkId: string | null,
  address: string | null = null,
): UseWalletBalanceResult {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!networkId || (!walletInstance && !address)) {
      setBalances([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchBalances = async () => {
      // Strategy 1: Use backend UTXORPC query if we have an address
      if (address && networkId === "cardano") {
        try {
          const resp = await bridgeApi.getBalance(address);
          if (cancelled) return;

          const parsed: WalletBalance[] = resp.assets.map((asset) => {
            if (asset.unit === "lovelace") {
              const ada = Number(BigInt(asset.quantity)) / 1_000_000;
              return {
                symbol: "ADA",
                balance: ada.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                }),
              };
            }
            return {
              symbol: asset.symbol,
              balance: Number(asset.quantity).toLocaleString(),
            };
          });

          setBalances(parsed);
          setLoading(false);
          return;
        } catch {
          // Fall through to Mesh SDK
        }
      }

      // Strategy 2: Use Mesh SDK BrowserWallet directly
      if (walletInstance) {
        try {
          const wallet = walletInstance as {
            getBalance: () => Promise<
              Array<{ unit: string; quantity: string }>
            >;
          };
          const rawBalances = await wallet.getBalance();
          if (cancelled) return;

          const parsed: WalletBalance[] = rawBalances.map((asset) => {
            if (asset.unit === "lovelace") {
              const ada = Number(BigInt(asset.quantity)) / 1_000_000;
              return {
                symbol: "ADA",
                balance: ada.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                }),
              };
            }

            const assetName = asset.unit.slice(56);
            let symbol = asset.unit.slice(0, 8) + "...";
            try {
              if (assetName) {
                symbol = Buffer.from(assetName, "hex").toString("utf8");
              }
            } catch {
              // Keep truncated hex
            }

            return {
              symbol,
              balance: Number(asset.quantity).toLocaleString(),
            };
          });

          setBalances(parsed);
          setLoading(false);
          return;
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof Error
                ? err.message
                : "Failed to fetch wallet balance",
            );
            setLoading(false);
          }
          return;
        }
      }

      setLoading(false);
    };

    fetchBalances();

    return () => {
      cancelled = true;
    };
  }, [walletInstance, networkId, address]);

  return { balances, loading, error };
}
