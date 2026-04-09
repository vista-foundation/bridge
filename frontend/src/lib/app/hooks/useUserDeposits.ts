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
 */
export function useUserDeposits(intervalMs: number = 5000): UseUserDepositsResult {
  const [deposits, setDeposits] = useState<UserDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef(false);
  // Ref so the poll closure always reads fresh deposits without re-triggering the effect
  const depositsRef = useRef(deposits);
  depositsRef.current = deposits;

  const hasNonTerminal = deposits.some((d) => !isTerminal(d.status));

  // Initial load from localStorage
  useEffect(() => {
    const stored = loadDeposits();
    setDeposits(stored.map(toUserDeposit));
    setLoading(false);
  }, []);

  // Poll non-terminal deposits for live status
  useEffect(() => {
    if (!hasNonTerminal) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      try {
        const current = depositsRef.current;
        const needsPoll = current.filter((d) => !isTerminal(d.status));
        if (needsPoll.length === 0) return;

        // Race against a timeout so a stalled fetch doesn't block future polls
        const POLL_TIMEOUT_MS = 15_000;
        const updates = await Promise.race([
          pollDeposits(needsPoll.map((d) => d.txHash)),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), POLL_TIMEOUT_MS)),
        ]);

        if (!updates) return; // timed out — will retry next interval

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
      } finally {
        pollingRef.current = false;
      }
    };

    poll();
    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasNonTerminal, intervalMs]);

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
