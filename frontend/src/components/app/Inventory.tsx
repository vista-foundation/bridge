"use client";

import Image from "next/image";
import type { InventoryItem } from "@/lib/app/bridge-data";

interface InventoryProps {
  items: InventoryItem[];
  connectedNetwork: string | null;
  walletLabel?: string | null;
  onDisconnect?: () => void;
  onAssetSelect?: (item: InventoryItem) => void;
}

export default function Inventory({
  items = [],
  connectedNetwork,
  walletLabel,
  onDisconnect,
  onAssetSelect,
}: InventoryProps) {
  const isEmpty = items.length === 0;

  // Determine grid layout based on item count
  const cols = items.length <= 4 ? 2 : 3;
  const gridClass = cols === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="bg-[#0c0c0c] border border-[#252525] rounded-[10px] p-[25px] w-full md:w-[478px] flex flex-col gap-[10px] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2
          className="font-semibold text-[24px] text-white"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Inventory
        </h2>
        {connectedNetwork && (
          <span
            className="text-[11px] text-[#a1a1a1] bg-[#1c1c1c] rounded-full px-[10px] py-[4px]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {connectedNetwork}
          </span>
        )}
      </div>

      {/* Connected wallet info */}
      {walletLabel && (
        <div className="flex items-center justify-between bg-[#141414] rounded-[8px] px-[12px] py-[8px] animate-fadeIn">
          <div className="flex items-center gap-[8px]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#4ade80]" />
            <span
              className="text-[12px] text-[#a1a1a1]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {walletLabel}
            </span>
          </div>
          <button
            onClick={onDisconnect}
            className="text-[10px] text-[#555] hover:text-[#f85858] transition-colors"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Disconnect
          </button>
        </div>
      )}

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-[15px] py-[40px] transition-opacity duration-300">
          <div className="w-[48px] h-[48px] rounded-full bg-[#1c1c1c] flex items-center justify-center">
            <Image src="/assets/icons/wallet.svg" alt="wallet" width={24} height={24} style={{ opacity: 0.4 }} />
          </div>
          <p
            className="text-[14px] text-[#555] text-center max-w-[260px]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Connect your wallet to view your assets
          </p>
        </div>
      ) : (
        <div className={`flex-1 grid ${gridClass} gap-[7px] min-h-0 auto-rows-min`}>
          {items.map((item, index) => (
            <button
              key={item.symbol}
              onClick={() => onAssetSelect?.(item)}
              className="bg-[#141414] rounded-[6px] flex flex-col gap-[10px] items-center justify-center px-[7px] py-[12px] hover:bg-[#1c1c1c] transition-all duration-200 cursor-pointer relative animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Wrapped badge */}
              {item.isWrapped && (
                <span
                  className="absolute top-[4px] right-[4px] text-[8px] font-bold bg-[#f85858] text-white rounded-full px-[5px] py-[1px]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  VISTA
                </span>
              )}

              <div
                className="w-[42px] h-[41px] rounded-full overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: item.bgColor }}
              >
                <Image
                  src={item.image}
                  alt={item.symbol}
                  width={30}
                  height={30}
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col gap-[3px] items-center">
                <span
                  className="font-semibold text-[14px] text-white"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {item.symbol}
                </span>
                <span
                  className="text-[11px] text-[#a1a1a1] text-center leading-tight"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {item.balance}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
