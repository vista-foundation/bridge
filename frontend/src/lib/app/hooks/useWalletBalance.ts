"use client";

import { useState, useEffect } from "react";
import type { WalletBalance } from "../bridge-data";

interface UseWalletBalanceResult {
  balances: WalletBalance[];
  loading: boolean;
  error: string | null;
}

/**
 * Queries wallet balances from the connected wallet's CIP-30 API.
 * No backend call needed — the wallet extension provides balances directly.
 */
export function useWalletBalance(
  walletInstance: unknown | null,
  networkId: string | null,
  _address: string | null = null,
): UseWalletBalanceResult {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletInstance || !networkId) {
      setBalances([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchBalances = async () => {
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
  }, [walletInstance, networkId, _address]);

  return { balances, loading, error };
}
