"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Documentation", href: "/docs" },
  { label: "Learn More", href: "/learn" },
];

interface HeaderProps {
  onConnectWallet?: () => void;
  onDisconnectWallet?: () => void;
  walletLabel?: string | null;
  walletConnected?: boolean;
}

export default function Header({
  onConnectWallet,
  onDisconnectWallet,
  walletLabel,
  walletConnected = false,
}: HeaderProps) {
  const pathname = usePathname();
  const isAppPage = pathname === "/app";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[86px] backdrop-blur-[2px] bg-[rgba(0,0,0,0.2)]">
      {/* ── Desktop layout (centered) ─────────────────────────── */}
      <div className="hidden md:flex items-center gap-[80px] absolute left-1/2 top-[23px] -translate-x-1/2">
        <Link href="/" className="shrink-0">
          <Image
            src="/assets/logo.svg"
            alt="Vista"
            width={125}
            height={40}
            priority
          />
        </Link>

        <nav className="flex items-center gap-[30px] px-[10px] py-[10px]" style={{ fontFamily: "'Raleway', sans-serif" }}>
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-white font-bold text-[14px] hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {isAppPage ? (
          walletConnected && walletLabel ? (
            <button
              onClick={onDisconnectWallet}
              className="group bg-[#1c1c1c] hover:bg-[#f85858]/20 border border-[#333] hover:border-[#f85858] transition-all text-white font-bold text-[14px] px-[20px] py-[12px] rounded-full h-[40px] flex items-center justify-center whitespace-nowrap gap-[8px]"
              style={{ fontFamily: "'Raleway', sans-serif" }}
            >
              <span className="w-[8px] h-[8px] rounded-full bg-[#4ade80] shrink-0" />
              <span className="group-hover:hidden">{walletLabel}</span>
              <span className="hidden group-hover:inline text-[#f85858]">Disconnect</span>
            </button>
          ) : (
            <button
              onClick={onConnectWallet}
              className="bg-[#f85858] hover:bg-[#f85858]/90 transition-colors text-white font-bold text-[14px] px-[20px] py-[12px] rounded-full h-[40px] flex items-center justify-center whitespace-nowrap gap-[6px]"
              style={{ fontFamily: "'Raleway', sans-serif" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3.5" width="14" height="10" rx="2" stroke="white" strokeWidth="1.3" />
                <path d="M1 6.5H15" stroke="white" strokeWidth="1.3" />
                <circle cx="12" cy="9.5" r="1" fill="white" />
              </svg>
              Connect Wallet
            </button>
          )
        ) : (
          <Link
            href="/app"
            className="bg-[#f85858] hover:bg-[#f85858]/90 transition-colors text-white font-bold text-[14px] px-[20px] py-[12px] rounded-full h-[40px] flex items-center justify-center whitespace-nowrap"
            style={{ fontFamily: "'Raleway', sans-serif" }}
          >
            Launch App
          </Link>
        )}
      </div>

      {/* ── Mobile layout ─────────────────────────────────────── */}
      <div className="flex md:hidden items-center justify-between px-4 h-full">
        <Link href="/" className="shrink-0">
          <Image
            src="/assets/logo.svg"
            alt="Vista"
            width={100}
            height={32}
            priority
          />
        </Link>

        <div className="flex items-center gap-3">
          {/* Wallet / Launch button (compact) */}
          {isAppPage ? (
            walletConnected && walletLabel ? (
              <button
                onClick={onDisconnectWallet}
                className="bg-[#1c1c1c] border border-[#333] text-white font-bold text-[12px] px-3 py-2 rounded-full h-[34px] flex items-center gap-[6px]"
                style={{ fontFamily: "'Raleway', sans-serif" }}
              >
                <span className="w-[6px] h-[6px] rounded-full bg-[#4ade80] shrink-0" />
                <span className="max-w-[80px] truncate">{walletLabel}</span>
              </button>
            ) : (
              <button
                onClick={onConnectWallet}
                className="bg-[#f85858] hover:bg-[#f85858]/90 text-white font-bold text-[12px] px-3 py-2 rounded-full h-[34px] flex items-center gap-[4px]"
                style={{ fontFamily: "'Raleway', sans-serif" }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3.5" width="14" height="10" rx="2" stroke="white" strokeWidth="1.3" />
                  <path d="M1 6.5H15" stroke="white" strokeWidth="1.3" />
                  <circle cx="12" cy="9.5" r="1" fill="white" />
                </svg>
                Connect
              </button>
            )
          ) : (
            <Link
              href="/app"
              className="bg-[#f85858] hover:bg-[#f85858]/90 text-white font-bold text-[12px] px-3 py-2 rounded-full h-[34px] flex items-center"
              style={{ fontFamily: "'Raleway', sans-serif" }}
            >
              Launch App
            </Link>
          )}

          {/* Burger icon */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-[34px] h-[34px] flex flex-col items-center justify-center gap-[5px] rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`block w-[18px] h-[2px] bg-white transition-all duration-200 ${mobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
            <span className={`block w-[18px] h-[2px] bg-white transition-all duration-200 ${mobileMenuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-[18px] h-[2px] bg-white transition-all duration-200 ${mobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Mobile menu overlay ───────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[86px] left-0 right-0 bg-[#0c0c0c]/95 backdrop-blur-md border-t border-[#252525] animate-fadeIn">
          <nav className="flex flex-col py-4" style={{ fontFamily: "'Raleway', sans-serif" }}>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-white font-bold text-[16px] px-6 py-3 hover:bg-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
