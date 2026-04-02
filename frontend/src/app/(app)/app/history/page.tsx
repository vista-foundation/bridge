"use client";

import Link from "next/link";
import Header from "@/components/Header";
import SolarSystemBackground from "@/components/SolarSystemBackground";
import type { PendingTransaction } from "@/components/app/PendingTransactionAlert";

// Demo transaction data — Cardano → Agrologos vADA
const DEMO_TRANSACTIONS: PendingTransaction[] = [
  {
    id: "tx-001",
    fromNetwork: "Cardano",
    toNetwork: "Agrologos",
    amount: "150",
    token: "ADA",
    outputToken: "vADA",
    timestamp: Date.now() - 45_000,
    status: "submitted",
    txHash: "a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01",
  },
  {
    id: "tx-002",
    fromNetwork: "Cardano",
    toNetwork: "Agrologos",
    amount: "500",
    token: "ADA",
    outputToken: "vADA",
    timestamp: Date.now() - 3_600_000,
    status: "confirmed",
    txHash: "f0e1d2c3b4a596870123456789abcdef0123456789abcdef0123456789abcdef",
  },
  {
    id: "tx-003",
    fromNetwork: "Cardano",
    toNetwork: "Agrologos",
    amount: "75",
    token: "ADA",
    outputToken: "vADA",
    timestamp: Date.now() - 86_400_000,
    status: "confirmed",
    txHash: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  },
];

const STATUS_STEPS = ["deposited", "pending", "submitted", "confirmed"] as const;

function getStepIndex(status: string) {
  const idx = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
  return idx === -1 ? 0 : idx;
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    deposited: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Deposited" },
    pending: { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Confirming" },
    submitted: { bg: "bg-orange-500/10", text: "text-orange-400", label: "Mirroring" },
    confirmed: { bg: "bg-green-500/10", text: "text-green-400", label: "Complete" },
    failed: { bg: "bg-red-500/10", text: "text-red-400", label: "Failed" },
  };
  const c = colors[status] ?? colors.pending;
  return (
    <span className={`${c.bg} ${c.text} text-[11px] font-semibold px-2.5 py-1 rounded-full`}>
      {c.label}
    </span>
  );
}

function ProgressBar({ status }: { status: string }) {
  const step = getStepIndex(status);
  const pct = status === "failed" ? 0 : ((step + 1) / STATUS_STEPS.length) * 100;

  return (
    <div className="w-full h-1.5 bg-[#1c1c1c] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          status === "confirmed"
            ? "bg-green-500"
            : status === "failed"
              ? "bg-red-500"
              : "bg-[#f59e0b]"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <div className="relative min-h-screen bg-black">
      <SolarSystemBackground variant="subtle" />
      <Header />

      <main className="relative z-10 flex flex-col items-center pt-[100px] md:pt-[120px] pb-[60px] px-4">
        {/* Header row */}
        <div className="w-full max-w-[640px] flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="text-[#a1a1a1] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1
              className="text-[22px] md:text-[26px] font-semibold text-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Transaction History
            </h1>
          </div>
          <span className="text-[13px] text-[#a1a1a1]">
            {DEMO_TRANSACTIONS.length} transactions
          </span>
        </div>

        {/* Transaction list */}
        <div className="w-full max-w-[640px] flex flex-col gap-3">
          {DEMO_TRANSACTIONS.map((tx) => (
            <div
              key={tx.id}
              className="bg-[#0c0c0c] border border-[#252525] rounded-[12px] p-4 md:p-5 hover:border-[#3a3a3a] transition-colors"
            >
              {/* Top row: route + status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[15px] font-semibold text-white"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {tx.amount} {tx.token}
                  </span>
                  <svg className="w-4 h-4 text-[#a1a1a1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span
                    className="text-[15px] font-semibold text-white"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {tx.outputToken}
                  </span>
                </div>
                <StatusBadge status={tx.status} />
              </div>

              {/* Progress bar */}
              <ProgressBar status={tx.status} />

              {/* Step labels */}
              <div className="flex justify-between mt-2 mb-3">
                {STATUS_STEPS.map((step, i) => {
                  const currentStep = getStepIndex(tx.status);
                  const done = i <= currentStep;
                  return (
                    <span
                      key={step}
                      className={`text-[10px] ${done ? "text-[#a1a1a1]" : "text-[#555]"}`}
                    >
                      {step === "deposited"
                        ? "Deposit"
                        : step === "pending"
                          ? "Confirm"
                          : step === "submitted"
                            ? "Mirror"
                            : "Done"}
                    </span>
                  );
                })}
              </div>

              {/* Bottom row: networks + time */}
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#a1a1a1]">
                  {tx.fromNetwork} → {tx.toNetwork}
                </span>
                <span className="text-[12px] text-[#555]">{formatTime(tx.timestamp)}</span>
              </div>

              {/* TX hash */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-[#555] font-mono truncate">
                  {tx.txHash.slice(0, 16)}...{tx.txHash.slice(-8)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
