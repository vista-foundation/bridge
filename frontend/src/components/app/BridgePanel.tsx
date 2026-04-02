"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
// BrowserWallet is imported dynamically at runtime to avoid
// Turbopack polyfill issues (Mesh SDK depends on Node.js Buffer, etc.)
import {
  NETWORKS,
  TOKENS,
  getTokensForNetwork,
  getBridgeResult,
  validateAddress,
  type Network,
  type Token,
} from "@/lib/app/bridge-data";
import { createToast, type ToastMessage } from "./Toast";
import ConnectWalletModal from "./ConnectWalletModal";
import { useBridgeConfig } from "@/lib/app/hooks/useBridgeConfig";
import { useWalletBalance } from "@/lib/app/hooks/useWalletBalance";
import { bridgeApi } from "@/lib/app/api-client";

const percentages = ["10%", "25%", "50%", "75%", "MAX"];

interface BridgePanelProps {
  onToast?: (toast: ToastMessage) => void;
  onWalletChange?: (connected: boolean, networkId: string, label: string, address: string) => void;
  onNetworkChange?: (fromNetworkId: string) => void;
  onBridgeSubmit?: (txHash: string, meta: {
    fromNetworkId: string;
    fromNetworkName: string;
    toNetworkId: string;
    toNetworkName: string;
    token: string;
    outputToken: string;
    amount: string;
    senderAddress: string;
    recipientAddress: string;
  }) => void;
  /** Ref the parent can call .current() to open the wallet modal */
  connectWalletRef?: React.MutableRefObject<(() => void) | null>;
  /** Ref the parent can call .current() to disconnect the wallet */
  disconnectWalletRef?: React.MutableRefObject<(() => void) | null>;
  /** Ref the parent can call .current(symbol) to select a token by symbol */
  selectTokenRef?: React.MutableRefObject<((symbol: string) => void) | null>;
}

export default function BridgePanel({ onToast, onWalletChange, onNetworkChange, onBridgeSubmit, connectWalletRef, disconnectWalletRef, selectTokenRef }: BridgePanelProps) {
  // ── Network state ──────────────────────────────────────────────────
  const [fromNetwork, setFromNetwork] = useState<Network>(NETWORKS[0]); // Cardano
  const [toNetwork, setToNetwork] = useState<Network>(NETWORKS[2]); // Ethereum

  // ── Token state ────────────────────────────────────────────────────
  const availableTokens = getTokensForNetwork(fromNetwork.id);
  const [selectedToken, setSelectedToken] = useState<Token>(availableTokens[0]);

  // ── Amount state ───────────────────────────────────────────────────
  const [amount, setAmount] = useState("0");
  const [selectedPercent, setSelectedPercent] = useState<string | null>(null);

  // ── Wallet state ───────────────────────────────────────────────────
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [senderAddress, setSenderAddress] = useState("");
  const [walletLabel, setWalletLabel] = useState("");

  // ── Wallet modal state ───────────────────────────────────────────
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  // ── Wallet instance (for balance queries + tx signing) ──────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walletInstanceRef = useRef<any>(null);

  // ── Bridge API hooks ────────────────────────────────────────────
  const { config: bridgeConfig } = useBridgeConfig();
  const { balances: walletBalances } = useWalletBalance(
    walletInstanceRef.current,
    isWalletConnected ? fromNetwork.id : null,
    isWalletConnected ? senderAddress : null,
  );

  // ── Active bridge transaction ───────────────────────────────────
  const [activeBridgeTx, setActiveBridgeTx] = useState<string | null>(null);
  const [bridging, setBridging] = useState(false);

  // ── Receiver state ─────────────────────────────────────────────────
  const [receiverAddress, setReceiverAddress] = useState("");

  // ── Dropdown visibility ────────────────────────────────────────────
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const [showMobileTokenDropdown, setShowMobileTokenDropdown] = useState(false);

  // ── Refs for click outside ─────────────────────────────────────────
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef<HTMLDivElement>(null);
  const mobileTokenRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) setShowFromDropdown(false);
      if (toRef.current && !toRef.current.contains(e.target as Node)) setShowToDropdown(false);
      if (tokenRef.current && !tokenRef.current.contains(e.target as Node)) setShowTokenDropdown(false);
      if (mobileTokenRef.current && !mobileTokenRef.current.contains(e.target as Node)) setShowMobileTokenDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // When from-network changes, reset token to first available and notify parent
  useEffect(() => {
    const tokens = getTokensForNetwork(fromNetwork.id);
    if (tokens.length > 0 && !tokens.find((t) => t.symbol === selectedToken.symbol)) {
      setSelectedToken(tokens[0]);
    }
    onNetworkChange?.(fromNetwork.id);
  }, [fromNetwork.id, selectedToken.symbol, onNetworkChange]);

  // Notify parent when wallet connection changes
  useEffect(() => {
    onWalletChange?.(isWalletConnected || senderAddress.length > 5, fromNetwork.id, walletLabel, senderAddress);
  }, [isWalletConnected, senderAddress, fromNetwork.id, walletLabel, onWalletChange]);

  // ── Bridge result ──────────────────────────────────────────────────
  const bridgeResult = getBridgeResult(selectedToken, fromNetwork.id, toNetwork.id);

  // ── Derived values ────────────────────────────────────────────────
  const numAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const feeAda = bridgeConfig
    ? Number(BigInt(bridgeConfig.feeAmount)) / 1_000_000
    : 1; // default 1 ADA fee
  const receiveAmount =
    numAmount > feeAda ? (numAmount - feeAda).toFixed(6) : "0";
  const usdValue = ""; // Testnet — no USD value

  // ── Handlers ───────────────────────────────────────────────────────
  const toast = useCallback(
    (type: ToastMessage["type"], msg: string) => {
      onToast?.(createToast(type, msg));
    },
    [onToast]
  );

  const handleSelectFromNetwork = (net: Network) => {
    if (net.id === toNetwork.id) {
      // Swap networks
      setToNetwork(fromNetwork);
    }
    setFromNetwork(net);
    setShowFromDropdown(false);
    // Reset wallet when switching source network
    setIsWalletConnected(false);
    setSenderAddress("");
    setWalletLabel("");
    setAmount("0");
    setSelectedPercent(null);
  };

  const handleSelectToNetwork = (net: Network) => {
    if (net.id === fromNetwork.id) {
      setFromNetwork(toNetwork);
    }
    setToNetwork(net);
    setShowToDropdown(false);
    setReceiverAddress("");
  };

  const handleSwapNetworks = () => {
    const prevFrom = fromNetwork;
    const prevTo = toNetwork;
    setFromNetwork(prevTo);
    setToNetwork(prevFrom);
    setIsWalletConnected(false);
    setSenderAddress("");
    setWalletLabel("");
    setReceiverAddress("");
    setAmount("0");
    setSelectedPercent(null);
  };

  const handleSelectToken = (token: Token) => {
    setSelectedToken(token);
    setShowTokenDropdown(false);
    setShowMobileTokenDropdown(false);
    setAmount("0");
    setSelectedPercent(null);
  };

  /** Select a token by symbol (called externally via selectTokenRef).
   *  Handles wrapped tokens: "vBTC" → selects native "BTC" if available. */
  const selectTokenBySymbol = useCallback(
    (symbol: string) => {
      const tokens = getTokensForNetwork(fromNetwork.id);
      // Direct match first (e.g. "HOSKY" on Cardano)
      let match = tokens.find((t) => t.symbol === symbol);
      // If no direct match and it's a wrapped token, try the unwrapped base
      if (!match && symbol.startsWith("v")) {
        const baseSymbol = symbol.slice(1);
        match = tokens.find((t) => t.symbol === baseSymbol);
      }
      if (match) {
        setSelectedToken(match);
        setShowTokenDropdown(false);
        setShowMobileTokenDropdown(false);
        setAmount("0");
        setSelectedPercent(null);
      }
    },
    [fromNetwork.id]
  );

  const handlePercentClick = (pct: string) => {
    setSelectedPercent(pct);
    // Find the real balance for the selected token
    const tokenBalance = walletBalances.find(
      (b) => b.symbol === selectedToken.symbol,
    );
    const balance = tokenBalance
      ? parseFloat(tokenBalance.balance.replace(/,/g, ""))
      : 0;
    const pctNum = pct === "MAX" ? 100 : parseInt(pct);
    setAmount(((balance * pctNum) / 100).toString());
  };

  const handleConnectWallet = useCallback(() => {
    // Open the unified wallet selection modal for all chain types
    setShowWalletModal(true);
  }, []);

  const handleDisconnectWallet = useCallback(() => {
    setIsWalletConnected(false);
    setSenderAddress("");
    setWalletLabel("");
    walletInstanceRef.current = null;
  }, []);

  // Expose handleConnectWallet / handleDisconnectWallet / selectTokenBySymbol to parent via refs
  useEffect(() => {
    if (connectWalletRef) connectWalletRef.current = handleConnectWallet;
    if (disconnectWalletRef) disconnectWalletRef.current = handleDisconnectWallet;
    if (selectTokenRef) selectTokenRef.current = selectTokenBySymbol;
    return () => {
      if (connectWalletRef) connectWalletRef.current = null;
      if (disconnectWalletRef) disconnectWalletRef.current = null;
      if (selectTokenRef) selectTokenRef.current = null;
    };
  }, [connectWalletRef, disconnectWalletRef, selectTokenRef, handleConnectWallet, handleDisconnectWallet, selectTokenBySymbol]);

  const handleBridge = async () => {
    if (!isWalletConnected && !senderAddress) {
      handleConnectWallet();
      return;
    }

    // Validate amount
    if (numAmount <= 0) {
      toast("error", "Please enter an amount greater than 0");
      return;
    }

    // Validate receiver address
    if (!receiverAddress.trim()) {
      toast("error", "Please enter a receiver address");
      return;
    }

    const validation = validateAddress(receiverAddress, toNetwork);
    if (!validation.valid) {
      toast("error", validation.error!);
      return;
    }

    // Validate sender isn't sending to same format for wrong chain
    if (fromNetwork.id === toNetwork.id) {
      toast("error", "Source and destination networks must be different");
      return;
    }

    // ── Real bridge flow for Cardano wallets ──────────────────────
    if (fromNetwork.walletType === "cardano" && walletInstanceRef.current) {
      if (!bridgeConfig?.depositAddresses?.length) {
        toast("error", "Bridge is not configured. Please try again later.");
        return;
      }

      setBridging(true);
      try {
        const { Transaction } = await import("@meshsdk/core");
        const wallet = walletInstanceRef.current;
        const depositAddress = bridgeConfig.depositAddresses[0];
        const lovelace = Math.round(numAmount * 1_000_000).toString();

        // Build deposit transaction
        const tx = new Transaction({ initiator: wallet });
        tx.sendLovelace(depositAddress, lovelace);
        // Cardano metadata: 64-byte max per string — chunk long addresses
        tx.setMetadata(1337, {
          d: receiverAddress.length > 64
            ? [receiverAddress.slice(0, 64), receiverAddress.slice(64)]
            : receiverAddress,
          v: "1.0.0",
        });

        const unsignedTx = await tx.build();
        const signedTx = await wallet.signTx(unsignedTx);
        const txHash = await wallet.submitTx(signedTx);

        // Register with backend
        try {
          await bridgeApi.registerDeposit({
            depositTxHash: txHash,
            senderAddress,
            recipientAddress: receiverAddress,
            amount: lovelace,
            sourceNetwork: fromNetwork.id,
          });
        } catch {
          // Non-fatal: the indexer will pick it up independently
        }

        setActiveBridgeTx(txHash);
        onBridgeSubmit?.(txHash, {
          fromNetworkId: fromNetwork.id,
          fromNetworkName: fromNetwork.name,
          toNetworkId: toNetwork.id,
          toNetworkName: toNetwork.name,
          token: selectedToken.symbol,
          outputToken: bridgeResult.outputSymbol,
          amount,
          senderAddress,
          recipientAddress: receiverAddress,
        });
        toast(
          "success",
          `Deposit submitted! TX: ${txHash.slice(0, 16)}...`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Transaction failed";
        toast("error", `Bridge failed: ${message}`);
      } finally {
        setBridging(false);
      }
      return;
    }

    // Non-Cardano chains: coming soon
    toast("info", `${fromNetwork.name} bridging coming soon. Currently only Cardano is supported.`);
  };

  // ── Unified wallet selection handler ────────────────────────────
  const handleWalletSelect = async (walletId: string, category: string) => {
    setConnectingWallet(walletId);
    try {
      if (category === "Cardano") {
        // ── Cardano: Mesh SDK BrowserWallet ──────────────────────
        const { BrowserWallet } = await import("@meshsdk/core");
        const wallet = await BrowserWallet.enable(walletId);
        const address = await wallet.getChangeAddress();
        walletInstanceRef.current = wallet;
        setSenderAddress(address);
        setWalletLabel(truncateAddress(address));
        setIsWalletConnected(true);
        setShowWalletModal(false);
        setConnectingWallet(null);
        const walletName = walletId.charAt(0).toUpperCase() + walletId.slice(1);
        toast("success", `Connected to Cardano via ${walletName}`);

      } else if (category === "EVM Compatible") {
        // ── EVM wallets: window.ethereum provider ────────────────
        if (walletId === "walletconnect") {
          // WalletConnect requires a separate SDK integration
          setConnectingWallet(null);
          toast("info", "WalletConnect integration coming soon. Please use MetaMask or another browser wallet.");
          return;
        }

        const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : undefined;
        let provider: { request: (args: { method: string }) => Promise<string[]> } | undefined;

        // Resolve the correct provider for each wallet
        if (walletId === "xdcpay" && w?.xdc) {
          provider = w.xdc as typeof provider;
        } else if (walletId === "okx" && w?.okxwallet) {
          provider = w.okxwallet as typeof provider;
        } else if (walletId === "wanwallet" && w?.wanchain) {
          provider = w.wanchain as typeof provider;
        } else if (w?.ethereum) {
          provider = w.ethereum as typeof provider;
        }

        if (!provider) {
          setConnectingWallet(null);
          const walletName = walletId.charAt(0).toUpperCase() + walletId.slice(1);
          toast("error", `${walletName} not detected. Please install the extension.`);
          return;
        }

        const accounts = await provider.request({ method: "eth_requestAccounts" });
        if (accounts.length > 0) {
          setSenderAddress(accounts[0]);
          setWalletLabel(truncateAddress(accounts[0]));
          setIsWalletConnected(true);
          setShowWalletModal(false);
          setConnectingWallet(null);
          const walletName = walletId.charAt(0).toUpperCase() + walletId.slice(1);
          toast("success", `Connected via ${walletName}`);
        }

      } else if (category === "BTC") {
        // ── BTC wallets ─────────────────────────────────────────
        if (walletId === "ota") {
          // One-Time Address: close modal and let user paste address
          setShowWalletModal(false);
          setConnectingWallet(null);
          toast("info", "Paste your BTC address in the Sender field above.");
          return;
        }

        const w = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : undefined;
        if (walletId === "unisat" && w?.unisat) {
          const unisat = w.unisat as { requestAccounts: () => Promise<string[]> };
          const accounts = await unisat.requestAccounts();
          if (accounts.length > 0) {
            setSenderAddress(accounts[0]);
            setWalletLabel(truncateAddress(accounts[0]));
            setIsWalletConnected(true);
            setShowWalletModal(false);
            setConnectingWallet(null);
            toast("success", "Connected via Unisat");
          }
        } else {
          setConnectingWallet(null);
          toast("error", "Unisat wallet not detected. Please install the extension.");
        }
      }
    } catch (err) {
      setConnectingWallet(null);
      const message = err instanceof Error ? err.message : "Connection denied";
      toast("error", `Wallet connection failed: ${message}`);
    }
  };

  return (
    <div className="bg-[#0c0c0c] border border-[#252525] rounded-[10px] p-4 md:p-[25px] w-full max-w-[520px] md:w-[478px] flex flex-col gap-[10px] overflow-visible">
      <h2
        className="font-semibold text-[20px] md:text-[24px] text-white w-full"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        Bridge Assets
      </h2>

      <div className="flex flex-col gap-[12px] flex-1">
        {/* ── From / To network selectors ───────────────────────────── */}
        <div className="flex gap-[5px] items-center h-[62px] overflow-visible">
          <NetworkDropdown
            ref={fromRef}
            label="From"
            selected={fromNetwork}
            networks={NETWORKS}
            exclude={toNetwork.id}
            open={showFromDropdown}
            onToggle={() => { setShowFromDropdown(!showFromDropdown); setShowToDropdown(false); setShowTokenDropdown(false); setShowMobileTokenDropdown(false); }}
            onSelect={handleSelectFromNetwork}
          />

          <button
            onClick={handleSwapNetworks}
            className="bg-[#313131] rounded-[8px] w-[30px] h-[30px] flex items-center justify-center shrink-0 hover:bg-[#3a3a3a] transition-colors overflow-hidden p-[10px]"
          >
            <Image src="/assets/icons/chevron-right.svg" alt="swap" width={15} height={15} />
          </button>

          <NetworkDropdown
            ref={toRef}
            label="To"
            selected={toNetwork}
            networks={NETWORKS}
            exclude={fromNetwork.id}
            open={showToDropdown}
            onToggle={() => { setShowToDropdown(!showToDropdown); setShowFromDropdown(false); setShowTokenDropdown(false); setShowMobileTokenDropdown(false); }}
            onSelect={handleSelectToNetwork}
          />
        </div>

        {/* ── Mobile token selector (shown only on small screens) ──── */}
        <div ref={mobileTokenRef} className="relative md:hidden">
          <button
            onClick={() => { setShowMobileTokenDropdown(!showMobileTokenDropdown); setShowTokenDropdown(false); setShowFromDropdown(false); setShowToDropdown(false); }}
            className="bg-[#1c1c1c] rounded-[10px] w-full flex items-center gap-[10px] px-[15px] py-[12px] hover:bg-[#252525] transition-colors"
          >
            <div
              className="w-[28px] h-[28px] rounded-full overflow-hidden flex items-center justify-center shrink-0"
              style={{ backgroundColor: selectedToken.bgColor }}
            >
              <Image src={selectedToken.image} alt={selectedToken.symbol} width={22} height={22} className="object-cover" />
            </div>
            <div className="flex flex-col items-start flex-1" style={{ fontFamily: "'Inter', sans-serif" }}>
              <span className="text-[11px] text-[#a1a1a1]">Token</span>
              <span className="text-[14px] text-white font-semibold">{selectedToken.symbol}</span>
            </div>
            <Image
              src="/assets/icons/chevron-down.svg"
              alt="select"
              width={12}
              height={12}
              className={`transition-transform ${showMobileTokenDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {showMobileTokenDropdown && (
            <div className="absolute top-full left-0 right-0 mt-[5px] bg-[#1c1c1c] border border-[#252525] rounded-[10px] py-[5px] z-50 shadow-xl max-h-[200px] overflow-y-auto">
              {availableTokens.map((token) => (
                <button
                  key={token.symbol}
                  onClick={() => handleSelectToken(token)}
                  className={`w-full flex items-center gap-[10px] px-[15px] py-[10px] hover:bg-[#252525] transition-colors ${
                    token.symbol === selectedToken.symbol ? "bg-[#252525]" : ""
                  }`}
                >
                  <div
                    className="w-[24px] h-[24px] rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{ backgroundColor: token.bgColor }}
                  >
                    <Image src={token.image} alt={token.symbol} width={18} height={18} className="object-cover" />
                  </div>
                  <span className="text-[14px] text-white font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {token.symbol}
                  </span>
                  <span className="text-[12px] text-[#a1a1a1] ml-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {token.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Sender address (shows after wallet connect) ───────────── */}
        <div className="bg-[#1c1c1c] rounded-[10px] px-[15px] py-[10px] flex items-center gap-[10px]">
          <span className="text-[12px] text-[#a1a1a1] shrink-0" style={{ fontFamily: "'Inter', sans-serif" }}>
            Sender:
          </span>
          {isWalletConnected ? (
            <div className="flex items-center gap-[8px] flex-1 min-w-0">
              <span className="text-[12px] text-white truncate" style={{ fontFamily: "'Inter', sans-serif" }}>
                {walletLabel || senderAddress}
              </span>
              <button
                onClick={handleDisconnectWallet}
                className="text-[10px] text-[#f85858] hover:text-white transition-colors shrink-0"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <input
              type="text"
              placeholder={`Paste ${fromNetwork.name} address or connect wallet`}
              value={senderAddress}
              onChange={(e) => {
                setSenderAddress(e.target.value);
                if (e.target.value.length > 5) setIsWalletConnected(false);
              }}
              className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder-[#555] min-w-0"
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
          )}
          {!isWalletConnected && (
            <button
              onClick={handleConnectWallet}
              className="bg-[#f85858] hover:bg-[#f85858]/80 text-white text-[10px] font-bold px-[10px] py-[5px] rounded-full shrink-0 transition-colors"
              style={{ fontFamily: "'Raleway', sans-serif" }}
            >
              Connect
            </button>
          )}
        </div>

        {/* ── Amount input ─────────────────────────────────────────── */}
        <div className="bg-[#1c1c1c] rounded-[15px] h-[116px] flex items-center justify-between px-[15px] overflow-visible relative">
          <div className="flex flex-col gap-[5px] flex-1 min-w-0" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span className="text-[12px] text-[#a1a1a1]">Send</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setSelectedPercent(null); }}
              className="bg-transparent text-white text-[22px] md:text-[26px] font-semibold outline-none w-full"
              style={{ fontFamily: "'Inter', sans-serif" }}
            />
            {usdValue && (
              <span className="text-[12px] text-[#a1a1a1]">{usdValue}</span>
            )}
          </div>

          {/* Token selector (desktop only) */}
          <div ref={tokenRef} className="relative hidden md:block">
            <button
              onClick={() => { setShowTokenDropdown(!showTokenDropdown); setShowMobileTokenDropdown(false); setShowFromDropdown(false); setShowToDropdown(false); }}
              className="bg-[#0b0b0b] rounded-full flex items-center gap-[5px] pl-[7px] pr-[10px] py-[7px] hover:bg-[#141414] transition-colors"
            >
              <div
                className="w-[20px] h-[19px] rounded-full overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: selectedToken.bgColor }}
              >
                <Image src={selectedToken.image} alt={selectedToken.symbol} width={18} height={18} className="object-cover" />
              </div>
              <span className="text-[14px] font-semibold text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                {selectedToken.symbol}
              </span>
              <Image
                src="/assets/icons/chevron-down.svg"
                alt="select"
                width={15}
                height={15}
                className={`transition-transform ${showTokenDropdown ? "rotate-180" : "rotate-90"}`}
              />
            </button>

            {showTokenDropdown && (
              <div className="absolute top-full right-0 mt-[5px] bg-[#1c1c1c] border border-[#252525] rounded-[10px] py-[5px] min-w-[180px] z-50 shadow-xl max-h-[200px] overflow-y-auto">
                {availableTokens.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => handleSelectToken(token)}
                    className={`w-full flex items-center gap-[8px] px-[12px] py-[8px] hover:bg-[#252525] transition-colors ${
                      token.symbol === selectedToken.symbol ? "bg-[#252525]" : ""
                    }`}
                  >
                    <div
                      className="w-[20px] h-[20px] rounded-full overflow-hidden flex items-center justify-center shrink-0"
                      style={{ backgroundColor: token.bgColor }}
                    >
                      <Image src={token.image} alt={token.symbol} width={16} height={16} className="object-cover" />
                    </div>
                    <span className="text-[13px] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {token.symbol}
                    </span>
                    <span className="text-[11px] text-[#a1a1a1] ml-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {token.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Percentage buttons ────────────────────────────────────── */}
        <div className="flex flex-wrap gap-[5px]">
          {percentages.map((pct) => (
            <button
              key={pct}
              onClick={() => handlePercentClick(pct)}
              className={`flex-1 min-w-[50px] rounded-[15px] px-[12px] md:px-[15px] py-[10px] text-[12px] text-center transition-colors ${
                selectedPercent === pct
                  ? "bg-white text-[#0c0c0c] border border-[#0c0c0c]"
                  : "bg-[#141414] text-[#a1a1a1] hover:bg-[#1c1c1c]"
              }`}
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {pct}
            </button>
          ))}
        </div>

        {/* ── Receiver address ─────────────────────────────────────── */}
        <div className="bg-[#1c1c1c] rounded-[10px] px-[15px] py-[10px] flex items-center gap-[10px]">
          <span className="text-[12px] text-[#a1a1a1] shrink-0" style={{ fontFamily: "'Inter', sans-serif" }}>
            To:
          </span>
          <input
            type="text"
            placeholder={`Paste ${toNetwork.name} address (${toNetwork.addressHint})`}
            value={receiverAddress}
            onChange={(e) => setReceiverAddress(e.target.value)}
            className="flex-1 bg-transparent text-[12px] text-white outline-none placeholder-[#555] min-w-0"
            style={{ fontFamily: "'Inter', sans-serif" }}
          />
          {receiverAddress && (
            <div className="shrink-0">
              {validateAddress(receiverAddress, toNetwork).valid ? (
                <span className="text-[#22c55e] text-[14px]">{"\u2714"}</span>
              ) : (
                <span className="text-[#f85858] text-[14px]">{"\u2716"}</span>
              )}
            </div>
          )}
        </div>

        {/* ── Receive info ─────────────────────────────────────────── */}
        <div className="border border-[#1c1c1c] rounded-[15px] flex flex-wrap items-center justify-between gap-2 px-[15px] py-[12px] overflow-hidden">
          <div className="flex items-center gap-[5px] text-[12px] font-medium flex-wrap" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span className="text-[#a1a1a1]">Receive:</span>
            <span className="text-white">{receiveAmount} {bridgeResult.outputSymbol}</span>
          </div>
          <div className="flex gap-[5px]">
            <span
              className="bg-[#1c1c1c] rounded-full px-[7px] py-[5px] text-[12px] font-medium"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <span className="text-[#a1a1a1]">Time </span>
              <span className="text-white">&lt;10s</span>
            </span>
            <span
              className="bg-[#1c1c1c] rounded-full px-[7px] py-[5px] text-[12px] font-medium"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <span className="text-[#a1a1a1]">Fee </span>
              <span className="text-white">{feeAda} ADA</span>
            </span>
          </div>
        </div>

        {/* ── Bridge result hint ────────────────────────────────────── */}
        {fromNetwork.id !== toNetwork.id && numAmount > 0 && (
          <div className="text-[11px] text-[#a1a1a1] text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
            {bridgeResult.description}
          </div>
        )}

        {/* ── CTA Button ───────────────────────────────────────────── */}
        <button
          onClick={handleBridge}
          disabled={bridging}
          className={`${bridging ? "bg-[#f85858]/50 cursor-not-allowed" : "bg-[#f85858] hover:bg-[#f85858]/90"} transition-colors rounded-full h-[53px] flex items-center justify-center gap-[5px] w-full`}
        >
          <Image src="/assets/icons/wallet.svg" alt="wallet" width={16} height={16} />
          <span className="font-bold text-[13px] md:text-[14px] text-white" style={{ fontFamily: "'Raleway', sans-serif" }}>
            {bridging
              ? "Submitting..."
              : isWalletConnected || senderAddress
                ? `Bridge ${selectedToken.symbol} to ${bridgeResult.outputSymbol}`
                : "Connect Wallet to Bridge"}
          </span>
        </button>
      </div>

      {/* ── Unified wallet selection modal ─────────────────────────── */}
      <ConnectWalletModal
        open={showWalletModal}
        onClose={() => { setShowWalletModal(false); setConnectingWallet(null); }}
        onSelect={handleWalletSelect}
        connecting={connectingWallet}
      />
    </div>
  );
}

// ── NetworkDropdown component ──────────────────────────────────────────
import { forwardRef } from "react";

interface NetworkDropdownProps {
  label: string;
  selected: Network;
  networks: Network[];
  exclude: string;
  open: boolean;
  onToggle: () => void;
  onSelect: (net: Network) => void;
}

const NetworkDropdown = forwardRef<HTMLDivElement, NetworkDropdownProps>(
  function NetworkDropdown({ label, selected, networks, exclude, open, onToggle, onSelect }, ref) {
    return (
      <div ref={ref} className="relative flex-1 h-full">
        <button
          onClick={onToggle}
          className="bg-[#1c1c1c] rounded-[15px] w-full h-full flex items-center gap-[10px] px-[15px] py-[10px] hover:bg-[#252525] transition-colors overflow-hidden min-w-0"
        >
          <div className="w-[28px] h-[28px] rounded-full overflow-hidden shrink-0">
            <Image src={selected.image} alt={selected.name} width={28} height={28} className="object-cover" />
          </div>
          <div className="flex flex-col items-start flex-1 min-w-0" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span className="text-[12px] text-[#a1a1a1]">{label}</span>
            <span className="text-[13px] md:text-[14px] text-white font-semibold truncate">{selected.name}</span>
          </div>
          <Image
            src="/assets/icons/chevron-down.svg"
            alt="expand"
            width={12}
            height={12}
            className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-[5px] bg-[#1c1c1c] border border-[#252525] rounded-[10px] py-[5px] w-full z-50 shadow-xl">
            {networks
              .filter((n) => n.id !== exclude)
              .map((net) => (
                <button
                  key={net.id}
                  onClick={() => onSelect(net)}
                  className={`w-full flex items-center gap-[8px] px-[12px] py-[8px] hover:bg-[#252525] transition-colors ${
                    net.id === selected.id ? "bg-[#252525]" : ""
                  }`}
                >
                  <div className="w-[22px] h-[22px] rounded-full overflow-hidden shrink-0">
                    <Image src={net.image} alt={net.name} width={22} height={22} className="object-cover" />
                  </div>
                  <span className="text-[13px] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {net.name}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    );
  }
);

// ── Helpers ─────────────────────────────────────────────────────────────
function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}
