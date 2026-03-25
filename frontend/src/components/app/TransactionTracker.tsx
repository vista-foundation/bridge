"use client";

import { useDepositStatus } from "@/lib/app/hooks/useDepositStatus";
import type { DepositStatusType } from "@vista-bridge/shared";

interface TransactionTrackerProps {
  txHash: string;
  onClose: () => void;
}

const STEPS: { key: DepositStatusType | "DEPOSITED"; label: string }[] = [
  { key: "DEPOSITED", label: "Deposit Submitted" },
  { key: "PENDING", label: "Waiting for Confirmations" },
  { key: "SUBMITTED", label: "Mirror Processing" },
  { key: "CONFIRMED", label: "Bridge Complete" },
];

function getActiveStep(
  status: DepositStatusType | null,
): number {
  if (!status) return 0; // deposited, waiting for backend
  switch (status) {
    case "PENDING":
      return 1;
    case "SUBMITTED":
      return 2;
    case "CONFIRMED":
      return 3;
    case "FAILED":
      return -1;
    default:
      return 0;
  }
}

export default function TransactionTracker({
  txHash,
  onClose,
}: TransactionTrackerProps) {
  const { status } = useDepositStatus(txHash);
  const activeStep = getActiveStep(status?.status ?? null);
  const isFailed = status?.status === "FAILED";
  const isComplete = status?.status === "CONFIRMED";

  return (
    <div
      className="bg-[#0c0c0c] border border-[#252525] rounded-[10px] p-4 md:p-[25px] w-full max-w-[520px] md:w-[478px]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-[16px]">
        <h3 className="text-[16px] font-semibold text-white">
          Bridge Status
        </h3>
        <button
          onClick={onClose}
          className="text-[#a1a1a1] hover:text-white text-[12px] transition-colors"
        >
          Close
        </button>
      </div>

      {/* TX Hash */}
      <div className="bg-[#1c1c1c] rounded-[8px] px-[12px] py-[8px] mb-[16px]">
        <span className="text-[11px] text-[#a1a1a1]">Deposit TX: </span>
        <span className="text-[11px] text-white font-mono">
          {txHash.slice(0, 20)}...{txHash.slice(-8)}
        </span>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-[4px]">
        {STEPS.map((step, i) => {
          const isDone = !isFailed && activeStep > i;
          const isCurrent = !isFailed && activeStep === i;

          return (
            <div key={step.key} className="flex items-center gap-[12px] py-[8px]">
              {/* Step indicator */}
              <div
                className={`w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold ${
                  isDone
                    ? "bg-[#22c55e] text-black"
                    : isCurrent
                      ? "bg-[#f85858] text-white animate-pulse"
                      : "bg-[#252525] text-[#555]"
                }`}
              >
                {isDone ? "\u2713" : i + 1}
              </div>

              {/* Step label */}
              <span
                className={`text-[13px] ${
                  isDone
                    ? "text-[#22c55e]"
                    : isCurrent
                      ? "text-white font-medium"
                      : "text-[#555]"
                }`}
              >
                {step.label}
              </span>

              {/* Spinner for current step */}
              {isCurrent && (
                <div className="w-[14px] h-[14px] border-2 border-[#f85858] border-t-transparent rounded-full animate-spin ml-auto" />
              )}
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {isFailed && (
        <div className="mt-[12px] bg-[#f85858]/10 border border-[#f85858]/30 rounded-[8px] px-[12px] py-[10px]">
          <span className="text-[12px] text-[#f85858]">
            Bridge failed{status?.errorMessage ? `: ${status.errorMessage}` : ""}
          </span>
        </div>
      )}

      {/* Mirror TX hash on success */}
      {isComplete && status?.mirrorTxHash && (
        <div className="mt-[12px] bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-[8px] px-[12px] py-[10px]">
          <span className="text-[11px] text-[#a1a1a1]">Mirror TX: </span>
          <span className="text-[11px] text-[#22c55e] font-mono">
            {status.mirrorTxHash.slice(0, 20)}...{status.mirrorTxHash.slice(-8)}
          </span>
        </div>
      )}
    </div>
  );
}
