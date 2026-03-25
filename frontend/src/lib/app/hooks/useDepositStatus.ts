"use client";

import { useState, useEffect, useRef } from "react";
import type { ApiDepositStatus } from "@vista-bridge/shared";
import { bridgeApi } from "../api-client";

interface UseDepositStatusResult {
  status: ApiDepositStatus | null;
  loading: boolean;
  error: string | null;
}

/**
 * Polls the bridge backend for the status of a deposit transaction.
 * Polls every `intervalMs` (default 5s) while status is PENDING or SUBMITTED.
 * Stops when CONFIRMED, FAILED, or txHash is null.
 */
export function useDepositStatus(
  txHash: string | null,
  intervalMs: number = 5000,
): UseDepositStatusResult {
  const [status, setStatus] = useState<ApiDepositStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!txHash) {
      setStatus(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const poll = async () => {
      try {
        const data = await bridgeApi.getDepositStatus(txHash);
        setStatus(data);
        setLoading(false);

        // Stop polling on terminal states
        if (data.status === "CONFIRMED" || data.status === "FAILED") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err) {
        // 404 is expected while the backend hasn't seen the deposit yet
        setLoading(false);
      }
    };

    // Initial fetch
    poll();

    // Start polling
    intervalRef.current = setInterval(poll, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [txHash, intervalMs]);

  return { status, loading, error };
}
