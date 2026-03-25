"use client";

import { useState, useEffect } from "react";
import type { ApiBridgeRoute } from "@vista-bridge/shared";
import { bridgeApi } from "../api-client";

interface UseBridgeRoutesResult {
  routes: ApiBridgeRoute[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches available bridge routes from the backend.
 * Routes define which source→destination pairs are supported.
 */
export function useBridgeRoutes(): UseBridgeRoutesResult {
  const [routes, setRoutes] = useState<ApiBridgeRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    bridgeApi
      .getRoutes()
      .then((data) => {
        if (!cancelled) {
          setRoutes(data.routes);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load routes");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { routes, loading, error };
}
