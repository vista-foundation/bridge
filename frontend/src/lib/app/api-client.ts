import type {
  ApiBridgeConfig,
  ApiBridgeRoutesResponse,
  ApiBridgeState,
  ApiDepositStatus,
  ApiHealthResponse,
  ApiRegisterDepositRequest,
  ApiRegisterDepositResponse,
} from "@vista-bridge/shared";

const API_BASE =
  process.env.NEXT_PUBLIC_BRIDGE_API_URL || "http://localhost:3001";

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const bridgeApi = {
  getHealth: () => apiGet<ApiHealthResponse>("/api/health"),

  getConfig: () => apiGet<ApiBridgeConfig>("/api/config"),

  getRoutes: () => apiGet<ApiBridgeRoutesResponse>("/api/routes"),

  getState: () => apiGet<ApiBridgeState>("/api/state"),

  getDepositStatus: (txHash: string) =>
    apiGet<ApiDepositStatus>(`/api/deposit/${txHash}`),

  registerDeposit: (req: ApiRegisterDepositRequest) =>
    apiPost<ApiRegisterDepositResponse>("/api/deposit/register", req),
};
