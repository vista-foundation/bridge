// ── localStorage persistence for user deposit metadata ──────────────
// The backend returns empty senderAddress/amount for processed deposits,
// so we capture this context at submit time and store it client-side.

const STORAGE_KEY = "vista-bridge:deposits";
export const MAX_ENTRIES = 100;

export interface DepositMeta {
  txHash: string;
  fromNetworkId: string;
  fromNetworkName: string;
  toNetworkId: string;
  toNetworkName: string;
  token: string;
  outputToken: string;
  /** Human-readable amount (e.g. "150"), NOT lovelace */
  amount: string;
  senderAddress: string;
  recipientAddress: string;
  timestamp: number;
}

export function loadDeposits(): DepositMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveDeposit(meta: DepositMeta): void {
  if (typeof window === "undefined") return;
  const existing = loadDeposits();
  // Dedupe by txHash
  const filtered = existing.filter((d) => d.txHash !== meta.txHash);
  const updated = [meta, ...filtered].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getDepositMeta(txHash: string): DepositMeta | undefined {
  return loadDeposits().find((d) => d.txHash === txHash);
}
