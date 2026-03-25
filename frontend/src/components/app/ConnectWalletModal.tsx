"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

// ── Wallet metadata per category ──────────────────────────────────────
export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  /** How do we detect this wallet in the browser? */
  detect: () => boolean;
  installed: boolean;
}

export interface WalletCategory {
  label: string;
  wallets: WalletInfo[];
}

/** Browser detection helpers (safe for SSR) */
const win = () =>
  typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : undefined;

const hasEthProvider = (key?: string) => {
  const w = win();
  if (!w?.ethereum) return false;
  if (!key) return true;
  return !!(w.ethereum as Record<string, unknown>)?.[key];
};

const hasCardanoProvider = (key: string) => {
  const w = win();
  if (!w?.cardano) return false;
  const cardano = w.cardano as Record<string, unknown>;
  return typeof (cardano[key] as { enable?: unknown })?.enable === "function";
};

const WALLET_CATEGORIES: { label: string; wallets: Omit<WalletInfo, "installed">[] }[] = [
  {
    label: "EVM Compatible",
    wallets: [
      { id: "metamask", name: "MetaMask", icon: "/assets/wallets/metamask.svg", detect: () => hasEthProvider("isMetaMask") },
      { id: "rabby", name: "Rabby Wallet", icon: "/assets/wallets/rabby.svg", detect: () => hasEthProvider("isRabby") },
      { id: "xdcpay", name: "XDCPay", icon: "/assets/wallets/xdcpay.svg", detect: () => !!(win() as Record<string, unknown>)?.xdc },
      { id: "okx", name: "OKX Wallet", icon: "/assets/wallets/okx.svg", detect: () => !!(win() as Record<string, unknown>)?.okxwallet },
      { id: "walletconnect", name: "WalletConnect", icon: "/assets/wallets/walletconnect.svg", detect: () => true /* protocol-based, always available */ },
      { id: "wanwallet", name: "WanWallet", icon: "/assets/wallets/wanwallet.svg", detect: () => !!(win() as Record<string, unknown>)?.wanchain },
    ],
  },
  {
    label: "BTC",
    wallets: [
      { id: "unisat", name: "Unisat", icon: "/assets/wallets/unisat.svg", detect: () => !!(win() as Record<string, unknown>)?.unisat },
      { id: "ota", name: "One-Time Address", icon: "/assets/wallets/ota.svg", detect: () => true /* manual entry, always available */ },
    ],
  },
  {
    label: "Cardano",
    wallets: [
      { id: "playwright", name: "Test Wallet", icon: "/assets/wallets/lace.svg", detect: () => hasCardanoProvider("playwright") },
      { id: "lace", name: "Lace", icon: "/assets/wallets/lace.svg", detect: () => hasCardanoProvider("lace") },
      { id: "yoroi", name: "Yoroi", icon: "/assets/wallets/yoroi.svg", detect: () => hasCardanoProvider("yoroi") },
      { id: "eternl", name: "Eternl", icon: "/assets/wallets/eternl.svg", detect: () => hasCardanoProvider("eternl") },
      { id: "gerowallet", name: "GeroWallet", icon: "/assets/wallets/gerowallet.svg", detect: () => hasCardanoProvider("gerowallet") },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────
interface ConnectWalletModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (walletId: string, category: string) => void;
  connecting: string | null;
}

export default function ConnectWalletModal({
  open,
  onClose,
  onSelect,
  connecting,
}: ConnectWalletModalProps) {
  const [categories, setCategories] = useState<WalletCategory[]>([]);

  // Detect installed wallets when modal opens
  useEffect(() => {
    if (!open) return;

    const detect = () => {
      const detected: WalletCategory[] = WALLET_CATEGORIES.map((cat) => ({
        label: cat.label,
        wallets: cat.wallets.map((w) => ({
          ...w,
          installed: w.detect(),
        })),
      }));
      setCategories(detected);
    };

    // Small delay so extensions have time to inject
    const timer = setTimeout(detect, 200);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#0c0c0c] border border-[#252525] rounded-[16px] w-[calc(100%-32px)] max-w-[480px] max-h-[85vh] flex flex-col shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-[25px] pt-[25px] pb-[15px]">
          <h3
            className="text-white font-semibold text-[20px]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Connect Wallet
          </h3>
          <button
            onClick={onClose}
            className="text-[#a1a1a1] hover:text-white transition-colors text-[20px] leading-none"
          >
            ✕
          </button>
        </div>

        {/* Scrollable wallet list */}
        <div className="flex-1 overflow-y-auto px-[25px] pb-[25px] flex flex-col gap-[20px]">
          {categories.map((cat) => (
            <div key={cat.label}>
              {/* Category label */}
              <div className="border border-[#252525] rounded-[12px] p-[16px]">
                <span
                  className="text-[13px] text-[#a1a1a1] block mb-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {cat.label}
                </span>

                {/* 3-column grid of wallet cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-[8px]">
                  {cat.wallets.map((w) => {
                    const isConnecting = connecting === w.id;
                    return (
                      <button
                        key={w.id}
                        onClick={() => onSelect(w.id, cat.label)}
                        disabled={connecting !== null && !isConnecting}
                        className={`flex flex-col items-center gap-[8px] py-[14px] px-[8px] rounded-[10px] transition-all ${
                          isConnecting
                            ? "bg-[#f85858]/15 border border-[#f85858]"
                            : "bg-[#141414] hover:bg-[#1c1c1c] border border-transparent hover:border-[#333] cursor-pointer"
                        } ${connecting !== null && !isConnecting ? "opacity-50" : ""}`}
                      >
                        {/* Wallet icon */}
                        <div className="w-[48px] h-[48px] rounded-[10px] overflow-hidden flex items-center justify-center shrink-0 bg-[#f5f5f5]">
                          <Image
                            src={w.icon}
                            alt={w.name}
                            width={48}
                            height={48}
                            className="object-contain"
                          />
                        </div>

                        {/* Wallet name */}
                        <span
                          className="text-[12px] text-white text-center leading-tight"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {isConnecting ? "Connecting..." : w.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
