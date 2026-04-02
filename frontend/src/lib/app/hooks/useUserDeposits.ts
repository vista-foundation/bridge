"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { DepositStatusType } from "@vista-bridge/shared";
import { bridgeApi } from "../api-client";
import { loadDeposits, saveDeposit, MAX_ENTRIES, type DepositMeta } from "../deposit-store";

export interface UserDeposit extends DepositMeta {
  status: DepositStatusType | "DEPOSITED";
  mirrorTxHash: string;
  errorMessage?: string;
}

interface UseUserDepositsResult {
  deposits: UserDeposit[];
  pending: UserDeposit[];
  loading: boolean;
  addDeposit: (meta: DepositMeta) => void;
}

function toUserDeposit(meta: DepositMeta): UserDeposit {
  return {
    ...meta,
    status: "DEPOSITED",
    mirrorTxHash: "",
  };
}

const TERMINAL_STATUSES: ReadonlySet<string> = new Set(["CONFIRMED", "FAILED"]);

function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Reads the user's deposits from localStorage and polls the backend
 * for live status on each non-terminal deposit every `intervalMs`.
 *
 * Uses a ref to always read the latest deposits inside the interval
 * callback, avoiding stale closures. A generation counter discards
 * responses from superseded poll cycles.
 */
export function useUserDeposits(intervalMs: number = 5000): UseUserDepositsResult {
  const [deposits, setDeposits] = useState<UserDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generationRef = useRef(0);
  // Always-current deposits ref so the interval callback never reads stale state
  const depositsRef = useRef(deposits);
  depositsRef.current = deposits;

  // Initial load from localStorage
  useEffect(() => {
    const stored = loadDeposits();
    const initial = stored.map(toUserDeposit);
    setDeposits(initial);
    depositsRef.current = initial;
    setLoading(false);
  }, []);

  // Poll non-terminal deposits for live status
  useEffect(() => {
    if (deposits.length === 0) return;

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const poll = () => {
      // Read latest deposits from ref, not the stale closure
      const current = depositsRef.current;
      const needsPoll = current.filter((d) => !isTerminal(d.status));

      if (needsPoll.length === 0) {
        stopPolling();
        return;
      }

      const gen = ++generationRef.current;

      pollDeposits(needsPoll.map((d) => d.txHash)).then((updates) => {
        if (gen !== generationRef.current) return;

        setDeposits((prev) =>
          prev.map((d) => {
            const update = updates.get(d.txHash);
            if (!update) return d;
            if (isTerminal(d.status)) return d;
            return {
              ...d,
              status: update.status,
              mirrorTxHash: update.mirrorTxHash || d.mirrorTxHash,
              errorMessage: update.errorMessage,
            };
          }),
        );
      });
    };

    poll();
    intervalRef.current = setInterval(poll, intervalMs);

    return stopPolling;
    // Re-subscribe when deposits length changes (new deposit added)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deposits.length, intervalMs]);

  const addDeposit = useCallback((meta: DepositMeta) => {
    saveDeposit(meta);
    setDeposits((prev) => {
      const filtered = prev.filter((d) => d.txHash !== meta.txHash);
      return [toUserDeposit(meta), ...filtered].slice(0, MAX_ENTRIES);
    });
  }, []);

  const pending = deposits.filter((d) => !isTerminal(d.status));

  return { deposits, pending, loading, addDeposit };
}

async function pollDeposits(
  txHashes: string[],
): Promise<Map<string, { status: DepositStatusType; mirrorTxHash: string; errorMessage?: string }>> {
  const results = await Promise.allSettled(
    txHashes.map((hash) => bridgeApi.getDepositStatus(hash)),
  );

  const updates = new Map<
    string,
    { status: DepositStatusType; mirrorTxHash: string; errorMessage?: string }
  >();

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      updates.set(txHashes[i], {
        status: result.value.status,
        mirrorTxHash: result.value.mirrorTxHash,
        errorMessage: result.value.errorMessage,
      });
    }
  });

  return updates;
}
