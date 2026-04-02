"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Header from "@/components/Header";
import SolarSystemBackground from "@/components/SolarSystemBackground";
import Inventory from "@/components/app/Inventory";
import BridgePanel from "@/components/app/BridgePanel";
import TransactionTracker from "@/components/app/TransactionTracker";
import ToastContainer, { type ToastMessage } from "@/components/app/Toast";
import PendingTransactionAlert from "@/components/app/PendingTransactionAlert";
import { getInventoryForNetwork, NETWORKS, EMPTY_BALANCES } from "@/lib/app/bridge-data";
import { useUserDeposits } from "@/lib/app/hooks/useUserDeposits";

export default function AppPage() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // ── Shared wallet / network state ──────────────────────────────────
  const [walletConnected, setWalletConnected] = useState(false);
  const [activeNetworkId, setActiveNetworkId] = useState<string | null>(null);
  const [walletLabel, setWalletLabel] = useState<string | null>(null);

  // ── User deposits (localStorage + live API polling) ────────────────
  const { pending: pendingDeposits, addDeposit } = useUserDeposits();

  // ── Active bridge transaction ──────────────────────────────────────
  const [activeBridgeTx, setActiveBridgeTx] = useState<string | null>(null);

  // Keep a ref to walletConnected so handleNetworkChange stays stable
  const walletRef = useRef(walletConnected);
  useEffect(() => { walletRef.current = walletConnected; }, [walletConnected]);

  // Refs for Header / Inventory → BridgePanel triggers
  const connectWalletRef = useRef<(() => void) | null>(null);
  const disconnectWalletRef = useRef<(() => void) | null>(null);
  const selectTokenRef = useRef<((symbol: string) => void) | null>(null);

  const addToast = useCallback((toast: ToastMessage) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Called by BridgePanel when wallet connect/disconnect happens
  const handleWalletChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (connected: boolean, networkId: string, label: string, _address: string) => {
      setWalletConnected(connected);
      setActiveNetworkId(connected ? networkId : null);
      setWalletLabel(connected ? label : null);
    }, []);

  // Called by BridgePanel when source network changes
  const handleNetworkChange = useCallback((fromNetworkId: string) => {
    // Only update if wallet is currently connected
    if (walletRef.current) {
      setActiveNetworkId(fromNetworkId);
    }
  }, []);

  // Called by BridgePanel when a bridge transaction is submitted
  const handleBridgeSubmit = useCallback((txHash: string, meta: {
    fromNetworkId: string;
    fromNetworkName: string;
    toNetworkId: string;
    toNetworkName: string;
    token: string;
    outputToken: string;
    amount: string;
    senderAddress: string;
    recipientAddress: string;
  }) => {
    setActiveBridgeTx(txHash);
    addDeposit({
      txHash,
      ...meta,
      timestamp: Date.now(),
    });
  }, [addDeposit]);

  // Build inventory items based on the connected network
  // Uses empty balances — real balances come from useWalletBalance in BridgePanel
  const inventoryItems = useMemo(() => {
    if (!walletConnected || !activeNetworkId) return [];
    return getInventoryForNetwork(activeNetworkId, EMPTY_BALANCES);
  }, [walletConnected, activeNetworkId]);

  // Resolve the display name for the connected network
  const connectedNetworkName = useMemo(() => {
    if (!walletConnected || !activeNetworkId) return null;
    return NETWORKS.find((n) => n.id === activeNetworkId)?.name ?? null;
  }, [walletConnected, activeNetworkId]);

  return (
    <div className="relative min-h-screen bg-black">
      <SolarSystemBackground variant="subtle" />
      <Header
        onConnectWallet={() => connectWalletRef.current?.()}
        onDisconnectWallet={() => disconnectWalletRef.current?.()}
        walletConnected={walletConnected}
        walletLabel={walletLabel}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <main className="relative z-10 flex flex-col md:flex-row items-center md:items-stretch justify-center gap-[26px] pt-[100px] md:pt-[120px] pb-[60px] px-4">
        <div className="hidden md:block">
          <Inventory
            items={inventoryItems}
            connectedNetwork={connectedNetworkName}
            walletLabel={walletLabel}
            onDisconnect={() => disconnectWalletRef.current?.()}
            onAssetSelect={(item) => selectTokenRef.current?.(item.symbol)}
          />
        </div>
        <div className="flex flex-col gap-[16px]">
          <PendingTransactionAlert transactions={pendingDeposits.map((d) => ({
            id: d.txHash,
            fromNetwork: d.fromNetworkName,
            toNetwork: d.toNetworkName,
            amount: d.amount,
            token: d.token,
            outputToken: d.outputToken,
            timestamp: d.timestamp,
            status: d.status.toLowerCase() as "deposited" | "pending" | "submitted" | "confirmed" | "failed",
            txHash: d.txHash,
          }))} />
          <BridgePanel
            onToast={addToast}
            onWalletChange={handleWalletChange}
            onNetworkChange={handleNetworkChange}
            onBridgeSubmit={handleBridgeSubmit}
            connectWalletRef={connectWalletRef}
            disconnectWalletRef={disconnectWalletRef}
            selectTokenRef={selectTokenRef}
          />
          {activeBridgeTx && (
            <TransactionTracker
              txHash={activeBridgeTx}
              onClose={() => setActiveBridgeTx(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
