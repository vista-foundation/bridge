"use client";

import Link from "next/link";

export interface PendingTransaction {
  id: string;
  fromNetwork: string;
  toNetwork: string;
  amount: string;
  token: string;
  outputToken: string;
  timestamp: number;
  status: "deposited" | "pending" | "submitted" | "confirmed" | "failed";
  txHash: string;
}

interface PendingTransactionAlertProps {
  transactions: PendingTransaction[];
}

export default function PendingTransactionAlert({ transactions }: PendingTransactionAlertProps) {
  const pending = transactions.filter((t) => t.status !== "confirmed");
  if (pending.length === 0) return null;

  const latest = pending[0];
  const statusLabel = latest.status === "failed" ? "Transaction failed" : "Transaction pending";

  return (
    <Link
      href="/app/history"
      className="group w-full max-w-[520px] md:w-[478px] flex items-center gap-3 bg-[#1a1400] border border-[#f59e0b]/30 rounded-[10px] px-4 py-3 hover:border-[#f59e0b]/60 transition-colors cursor-pointer"
    >
      {/* Pulsing dot */}
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f59e0b] opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f59e0b]" />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[13px] font-semibold text-[#f59e0b]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {statusLabel}
          </span>
          {pending.length > 1 && (
            <span className="text-[11px] text-[#a1a1a1] bg-[#252525] rounded-full px-2 py-0.5">
              +{pending.length - 1} more
            </span>
          )}
        </div>
        <p
          className="text-[12px] text-[#a1a1a1] truncate mt-0.5"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {latest.amount} {latest.token} → {latest.outputToken} &middot;{" "}
          {latest.fromNetwork} → {latest.toNetwork}
        </p>
      </div>

      {/* Arrow */}
      <svg
        className="w-4 h-4 text-[#a1a1a1] group-hover:text-white transition-colors shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
