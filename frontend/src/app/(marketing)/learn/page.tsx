"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

/* ─── Section data ─────────────────────────────────────────────── */

interface Section {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: "what-is-bridging",
    title: "What Is a Blockchain Bridge?",
    subtitle: "Moving assets between separate networks",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M4 20C4 20 8 12 14 12C20 12 24 20 24 20" stroke="#f85858" strokeWidth="2" strokeLinecap="round" />
        <circle cx="4" cy="20" r="2" fill="#f85858" />
        <circle cx="24" cy="20" r="2" fill="#f85858" />
        <path d="M14 12V6" stroke="#f85858" strokeWidth="2" strokeLinecap="round" />
        <circle cx="14" cy="5" r="1.5" fill="#f85858" />
      </svg>
    ),
    content: (
      <>
        <p>
          Blockchains like Cardano, Ethereum, and Bitcoin are separate networks
          that don't naturally communicate with each other. A <strong>blockchain bridge</strong> is
          a protocol that connects two or more of these networks, allowing you to
          transfer assets from one chain to another.
        </p>
        <p>
          Think of it like an exchange booth at an airport — you hand over one
          currency and receive its equivalent in another. Bridges do the same
          thing, but with crypto tokens across blockchains.
        </p>

        <h3>How Does Bridging Work?</h3>
        <p>
          When you bridge a token, the bridge <strong>locks</strong> your
          original asset on the source chain and <strong>mints</strong> a
          wrapped representation of that asset on the destination chain. The
          wrapped token has the same value as the original and can be bridged
          back at any time to unlock your original tokens.
        </p>
        <div className="bridge-diagram">
          <div className="bridge-diagram-step">
            <span className="bridge-step-num">1</span>
            <div>
              <strong>Lock</strong>
              <p>Your original tokens are locked on the source chain</p>
            </div>
          </div>
          <div className="bridge-diagram-arrow">→</div>
          <div className="bridge-diagram-step">
            <span className="bridge-step-num">2</span>
            <div>
              <strong>Verify</strong>
              <p>The bridge verifies the transaction across chains</p>
            </div>
          </div>
          <div className="bridge-diagram-arrow">→</div>
          <div className="bridge-diagram-step">
            <span className="bridge-step-num">3</span>
            <div>
              <strong>Mint</strong>
              <p>Wrapped tokens are created on the destination chain</p>
            </div>
          </div>
        </div>

        <h3>Why Do You Need a Bridge?</h3>
        <ul>
          <li>Use your BTC on Cardano DeFi platforms</li>
          <li>Move ETH to take advantage of lower fees on another chain</li>
          <li>Access applications only available on specific networks</li>
          <li>Diversify your assets across multiple ecosystems</li>
        </ul>
      </>
    ),
  },
  {
    id: "web3-wallets",
    title: "Understanding Web3 Wallets",
    subtitle: "Your key to interacting with blockchains",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="7" width="22" height="16" rx="3" stroke="#f85858" strokeWidth="2" />
        <path d="M3 12H25" stroke="#f85858" strokeWidth="2" />
        <circle cx="20" cy="18" r="2" fill="#f85858" />
      </svg>
    ),
    content: (
      <>
        <p>
          A <strong>Web3 wallet</strong> is a digital wallet that lets you store,
          send, and receive cryptocurrency. Unlike a traditional bank account,
          you have full control over your assets — no bank or company can freeze
          or take your funds.
        </p>

        <h3>Types of Wallets</h3>

        <div className="wallet-types-grid">
          <div className="wallet-type-card">
            <h4>Browser Extension Wallets</h4>
            <p>
              Extensions that live inside your web browser (Chrome, Firefox, Brave).
              These are the most common type for interacting with bridges and dApps.
            </p>
            <span className="wallet-type-examples">MetaMask, Lace, Rabby, Unisat, Eternl</span>
          </div>
          <div className="wallet-type-card">
            <h4>Hardware Wallets</h4>
            <p>
              Physical devices that store your private keys offline. Considered the
              most secure option for storing large amounts of crypto.
            </p>
            <span className="wallet-type-examples">Ledger, Trezor</span>
          </div>
          <div className="wallet-type-card">
            <h4>Mobile Wallets</h4>
            <p>
              Apps on your phone for managing crypto on the go. Some can connect
              to desktop dApps via QR codes (WalletConnect).
            </p>
            <span className="wallet-type-examples">Trust Wallet, Exodus</span>
          </div>
        </div>

        <h3>Wallet Basics</h3>
        <ul>
          <li>
            <strong>Public address</strong> — Like your email address. You can share
            it freely so others can send you tokens.
          </li>
          <li>
            <strong>Private key</strong> — Like your password. Never share it with
            anyone. Whoever holds the private key controls the funds.
          </li>
          <li>
            <strong>Seed phrase</strong> — A 12 or 24-word recovery phrase generated
            when you create a wallet. Write it down on paper and store it safely —
            it's your backup if you lose access to your wallet.
          </li>
        </ul>

        <h3>Different Chains, Different Wallets</h3>
        <p>
          Not all wallets work on all blockchains. EVM-compatible wallets like
          MetaMask work with Ethereum and BNB Chain, while Cardano requires
          wallets like Lace or Eternl, and Bitcoin uses Unisat. Vista Bridge
          shows you which wallets are compatible when you click Connect Wallet.
        </p>
      </>
    ),
  },
  {
    id: "risks",
    title: "Risks of Using Bridges",
    subtitle: "What you should know before you bridge",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L26 25H2L14 3Z" stroke="#f85858" strokeWidth="2" strokeLinejoin="round" />
        <path d="M14 11V17" stroke="#f85858" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="14" cy="21" r="1.5" fill="#f85858" />
      </svg>
    ),
    content: (
      <>
        <p>
          Blockchain bridges are powerful tools, but they come with risks that
          every user should understand. Being aware of these risks helps you make
          smarter decisions and protect your assets.
        </p>

        <div className="risk-cards">
          <div className="risk-card">
            <div className="risk-card-header">
              <span className="risk-level high">High Impact</span>
              <h4>Smart Contract Vulnerabilities</h4>
            </div>
            <p>
              Bridges rely on smart contracts — code that runs on the blockchain.
              If there's a bug in the code, attackers may be able to exploit it and
              drain funds. Several major bridge hacks have happened in the crypto
              industry due to smart contract flaws.
            </p>
            <div className="risk-mitigation">
              <strong>How to protect yourself:</strong> Use bridges that are open
              source, audited, and have a strong track record. Vista Bridge's
              contracts are fully open source on GitHub.
            </div>
          </div>

          <div className="risk-card">
            <div className="risk-card-header">
              <span className="risk-level high">High Impact</span>
              <h4>Irreversible Transactions</h4>
            </div>
            <p>
              Blockchain transactions cannot be reversed. If you send tokens to
              the wrong address or bridge to the wrong network, there is usually
              no way to recover them.
            </p>
            <div className="risk-mitigation">
              <strong>How to protect yourself:</strong> Always double-check your
              receiver address before confirming. Start with a small test
              transaction when bridging for the first time.
            </div>
          </div>

          <div className="risk-card">
            <div className="risk-card-header">
              <span className="risk-level medium">Medium Impact</span>
              <h4>Wrapped Token Risk</h4>
            </div>
            <p>
              Wrapped tokens (like vBTC or vETH) represent real assets, but their
              value depends on the bridge operating correctly. If the bridge goes
              offline or is compromised, wrapped tokens could lose their backing.
            </p>
            <div className="risk-mitigation">
              <strong>How to protect yourself:</strong> Don't hold more wrapped
              tokens than you need. Bridge back to native tokens when you're done
              using them on the destination chain.
            </div>
          </div>

          <div className="risk-card">
            <div className="risk-card-header">
              <span className="risk-level medium">Medium Impact</span>
              <h4>Phishing and Scams</h4>
            </div>
            <p>
              Fake websites may impersonate bridge interfaces to steal your wallet
              credentials or trick you into signing malicious transactions.
            </p>
            <div className="risk-mitigation">
              <strong>How to protect yourself:</strong> Always verify you're on the
              official Vista Bridge URL. Bookmark it. Never click bridge links from
              unknown sources like DMs or emails.
            </div>
          </div>

          <div className="risk-card">
            <div className="risk-card-header">
              <span className="risk-level low">Low Impact</span>
              <h4>Network Congestion and Delays</h4>
            </div>
            <p>
              Bridge transactions may take longer during periods of high network
              activity. Your funds are safe during this time but may not arrive as
              quickly as expected.
            </p>
            <div className="risk-mitigation">
              <strong>How to protect yourself:</strong> Be patient. Check the
              estimated time before bridging. Avoid bridging during known periods
              of high network congestion.
            </div>
          </div>

          <div className="risk-card">
            <div className="risk-card-header">
              <span className="risk-level low">Low Impact</span>
              <h4>Transaction Fees</h4>
            </div>
            <p>
              Bridging involves transaction fees on both the source and destination
              chains. During high-demand periods, fees (especially on Ethereum) can
              be significant.
            </p>
            <div className="risk-mitigation">
              <strong>How to protect yourself:</strong> Check the fee estimate in
              the bridge summary before confirming. Consider bridging during
              off-peak hours for lower fees.
            </div>
          </div>
        </div>

        <h3>General Safety Tips</h3>
        <ul>
          <li>Never share your seed phrase or private keys with anyone</li>
          <li>Always verify the website URL before connecting your wallet</li>
          <li>Start with small test transactions on new bridges</li>
          <li>Keep your wallet extensions and browser updated</li>
          <li>Use a hardware wallet for storing large amounts</li>
          <li>Revoke wallet approvals for dApps you no longer use</li>
        </ul>
      </>
    ),
  },
  {
    id: "vista-approach",
    title: "How Vista Bridge Stays Secure",
    subtitle: "Our approach to building a safer bridge",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 2L4 7V13C4 19.63 8.28 25.79 14 27C19.72 25.79 24 19.63 24 13V7L14 2Z" stroke="#f85858" strokeWidth="2" strokeLinejoin="round" />
        <path d="M10 14L13 17L19 11" stroke="#f85858" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    content: (
      <>
        <p>
          Vista Bridge is built with security and transparency at its core.
          Here's how we work to keep your assets safe.
        </p>

        <div className="security-features">
          <div className="security-feature">
            <div className="security-feature-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10L8 15L17 5" stroke="#f85858" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <strong>Fully Open Source</strong>
              <p>
                All code — both the bridge application and smart contracts — is
                publicly available on GitHub. Anyone can review, audit, and verify
                the code.
              </p>
            </div>
          </div>
          <div className="security-feature">
            <div className="security-feature-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10L8 15L17 5" stroke="#f85858" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <strong>Built on Cardano Plutus</strong>
              <p>
                Our smart contracts use Cardano's Plutus platform, written in
                Haskell — a language designed for reliability and formal
                verification.
              </p>
            </div>
          </div>
          <div className="security-feature">
            <div className="security-feature-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10L8 15L17 5" stroke="#f85858" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <strong>Real-Time Address Validation</strong>
              <p>
                Every receiver address is validated against the destination
                network's format before you can confirm a transaction.
              </p>
            </div>
          </div>
          <div className="security-feature">
            <div className="security-feature-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10L8 15L17 5" stroke="#f85858" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <strong>No Account Required</strong>
              <p>
                Vista Bridge connects directly to your browser wallet. We don't
                store passwords, emails, or personal data.
              </p>
            </div>
          </div>
          <div className="security-feature">
            <div className="security-feature-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 10L8 15L17 5" stroke="#f85858" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <strong>Tested Smart Contracts</strong>
              <p>
                All on-chain contracts include comprehensive test suites with
                test-network compatible examples before deployment.
              </p>
            </div>
          </div>
        </div>
      </>
    ),
  },
];

/* ─── Page Component ───────────────────────────────────────────── */

export default function LearnMorePage() {
  const [activeSection, setActiveSection] = useState<string>("what-is-bridging");

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] flex flex-col"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <Header />

      {/* Hero */}
      <div className="pt-[86px]">
        <div className="max-w-[900px] mx-auto px-6 pt-16 pb-10">
          <p className="text-[#f85858] text-[13px] font-semibold uppercase tracking-widest mb-3">
            Learn
          </p>
          <h1 className="text-[28px] md:text-[40px] font-bold text-white leading-[1.15] tracking-tight mb-4">
            Understanding Bridges,<br className="hidden md:block" />Wallets &amp; Risk
          </h1>
          <p className="text-[#a1a1a1] text-[16px] leading-relaxed max-w-[600px]">
            Everything you need to know before you bridge your first token.
            Learn how cross-chain bridges work, how wallets keep your assets safe,
            and what risks to watch out for.
          </p>
        </div>

        {/* Section Navigation Tabs */}
        <div className="max-w-[900px] mx-auto px-6 mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  activeSection === s.id
                    ? "bg-[#f85858] text-white"
                    : "bg-[#1c1c1c] text-[#a1a1a1] hover:bg-[#252525] hover:text-white"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="max-w-[900px] mx-auto px-6 pb-20">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="mb-16 scroll-mt-[150px]"
            >
              {/* Section Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-[52px] h-[52px] rounded-xl bg-[#f85858]/10 flex items-center justify-center shrink-0 mt-0.5">
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-[24px] font-bold text-white leading-tight mb-1">
                    {section.title}
                  </h2>
                  <p className="text-[14px] text-[#777]">{section.subtitle}</p>
                </div>
              </div>

              {/* Section Content */}
              <div className="learn-content pl-0 md:pl-[68px]">
                {section.content}
              </div>
            </section>
          ))}

          {/* Bottom CTA */}
          <div className="mt-8 pt-10 border-t border-[#1e1e1e] text-center">
            <h3 className="text-[20px] font-bold text-white mb-3">Ready to Bridge?</h3>
            <p className="text-[#a1a1a1] text-[14px] mb-6 max-w-[420px] mx-auto">
              Now that you understand how bridging works, head over to Vista Bridge and start transferring assets across chains.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center bg-[#f85858] hover:bg-[#f85858]/90 text-white font-semibold text-[14px] px-6 py-3 rounded-full transition-colors"
              >
                Launch Bridge
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center justify-center bg-[#1c1c1c] hover:bg-[#252525] text-[#a1a1a1] hover:text-white font-medium text-[14px] px-6 py-3 rounded-full transition-colors border border-[#2a2a2a]"
              >
                Read the Docs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
