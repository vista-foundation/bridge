"use client";

import { useState, useEffect } from "react";
import type { ApiBridgeConfig } from "@vista-bridge/shared";
import { bridgeApi } from "../api-client";

interface UseBridgeConfigResult {
  config: ApiBridgeConfig | null;
  loading: boolean;
  error: string | null;
}

export function useBridgeConfig(): UseBridgeConfigResult {
  const [config, setConfig] = useState<ApiBridgeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    bridgeApi
      .getConfig()
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load bridge config");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading, error };
}
