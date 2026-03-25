export interface DocSection {
  slug: string;
  title: string;
  category: string;
  content: string;
}

export interface DocCategory {
  name: string;
  sections: { slug: string; title: string }[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    name: "Getting Started",
    sections: [
      { slug: "introduction", title: "What is Vista Bridge?" },
      { slug: "how-it-works", title: "How It Works" },
      { slug: "getting-started", title: "Getting Started" },
    ],
  },
  {
    name: "Using the Bridge",
    sections: [
      { slug: "connecting-wallet", title: "Connecting Your Wallet" },
      { slug: "bridging-assets", title: "Bridging Assets" },
      { slug: "your-inventory", title: "Your Inventory" },
    ],
  },
  {
    name: "Networks & Tokens",
    sections: [
      { slug: "supported-networks", title: "Supported Networks" },
      { slug: "supported-tokens", title: "Supported Tokens" },
      { slug: "vista-wrapping", title: "Vista Wrapping (v-Prefix)" },
    ],
  },
  {
    name: "Smart Contracts",
    sections: [
      { slug: "contracts-overview", title: "On-Chain Contracts" },
      { slug: "custodial-transfer", title: "Custodial Transfer" },
    ],
  },
  {
    name: "Help & Resources",
    sections: [
      { slug: "supported-wallets", title: "Supported Wallets" },
      { slug: "faq", title: "FAQ" },
      { slug: "security", title: "Security" },
    ],
  },
];

export const DOC_SECTIONS: DocSection[] = [
  // ─── Getting Started ────────────────────────────────────────────
  {
    slug: "introduction",
    title: "What is Vista Bridge?",
    category: "Getting Started",
    content: `
# What is Vista Bridge?

**Vista Bridge** is a cross-chain bridge that lets you move digital assets between different blockchain networks. Whether you hold ADA, BTC, ETH, SOL, or BNB, Vista Bridge gives you a single place to transfer tokens across chains quickly and seamlessly.

## Why Use Vista Bridge?

Blockchain networks like Cardano, Ethereum, and Bitcoin each operate independently. If you hold BTC on Bitcoin but want to use it on Cardano, you need a bridge. Vista Bridge handles this for you — wrapping your tokens into a compatible format on the destination chain and unwrapping them when you move them back.

## Key Highlights

- **5 supported networks** — Cardano, Bitcoin, Ethereum, Solana, and BNB Chain
- **Multiple tokens** — Bridge native tokens like ADA, BTC, ETH, SOL, BNB, HOSKY, and stablecoins
- **12 supported wallets** — Connect with popular wallets like MetaMask, Lace, Unisat, and more
- **Vista Wrapping** — Assets are wrapped with a \`v\` prefix (e.g., BTC becomes \`vBTC\`) when moved to another chain
- **Stablecoin support** — USDT and USDC transfer directly across chains without wrapping

## Who Is Vista Bridge For?

Vista Bridge is built for anyone who holds crypto across multiple blockchains and wants a simple way to move assets between them. No coding or technical knowledge required — just connect your wallet, select your tokens, and bridge.

## Open Source

Vista Bridge is fully open source and built by [Agrow Labs](https://github.com/Agrow-Labs):

- [**vista-bridge**](https://github.com/Agrow-Labs/vista-bridge) — The bridge web application
- [**smart-contracts**](https://github.com/Agrow-Labs/smart-contracts) — On-chain smart contracts powering bridge operations
`,
  },
  {
    slug: "how-it-works",
    title: "How It Works",
    category: "Getting Started",
    content: `
# How It Works

Vista Bridge moves your tokens from one blockchain to another using a simple wrapping and unwrapping process.

## The Basic Concept

When you bridge a token from its home network to another chain, Vista Bridge creates a **wrapped version** of that token on the destination network. This wrapped token represents your original asset and can be bridged back at any time to recover the original.

\`\`\`
You send:       BTC on Bitcoin
You receive:    vBTC on Cardano (a wrapped representation)

Later...

You send:       vBTC on Cardano
You receive:    BTC on Bitcoin (your original asset back)
\`\`\`

## Step-by-Step Overview

1. **Choose your networks** — Pick which chain you're sending from and which you're sending to
2. **Connect your wallet** — Link a compatible wallet for the source network
3. **Select a token** — Choose which token you want to bridge
4. **Enter the amount** — Specify how much to send, or use quick-select buttons (10%, 25%, 50%, 75%, MAX)
5. **Enter a receiver address** — Provide your wallet address on the destination network
6. **Review and bridge** — Check the summary and confirm the transfer

## What Happens Behind the Scenes

- If you're sending a token **away** from its native chain, it gets **wrapped** with the Vista \`v\` prefix (e.g., ETH becomes \`vETH\`)
- If you're sending a wrapped token **back** to its home chain, it gets **unwrapped** (e.g., \`vETH\` becomes ETH)
- **Stablecoins** (USDT, USDC) exist on multiple chains natively, so they transfer directly without wrapping

## Address Validation

Vista Bridge checks that your receiver address matches the format required by the destination network. You'll see a visual indicator:

- **Green checkmark** — The address format is valid
- **Red X** — The address format doesn't match the selected network

This helps prevent sending assets to an incompatible address.
`,
  },
  {
    slug: "getting-started",
    title: "Getting Started",
    category: "Getting Started",
    content: `
# Getting Started

Follow these steps to start bridging assets with Vista Bridge.

## What You'll Need

Before you begin, make sure you have:

- **A supported browser wallet** installed (see [Supported Wallets](/docs/supported-wallets))
- **Tokens in your wallet** on the source network you want to bridge from
- **A receiver address** on the destination network

## Step 1: Visit Vista Bridge

Open Vista Bridge in your web browser. You'll see the bridge interface with two main panels:

- **Left panel (Inventory)** — Shows your token balances on the connected network
- **Right panel (Bridge)** — Where you configure and execute bridge transfers

## Step 2: Select Your Networks

Use the **From** and **To** dropdowns to choose your source and destination networks. Available networks:

| Network | Native Token |
|---------|-------------|
| Cardano | ADA |
| Bitcoin | BTC |
| Ethereum | ETH |
| Solana | SOL |
| BNB Chain | BNB |

> **Tip:** Use the swap button (arrows icon) between the dropdowns to quickly reverse the bridge direction.

## Step 3: Connect Your Wallet

Click **Connect Wallet** to open the wallet selection panel. Choose the wallet you have installed — the bridge will automatically detect which wallets are available in your browser.

## Step 4: Bridge Your Tokens

1. Select a token from the dropdown
2. Enter the amount to bridge
3. Paste your receiver address on the destination chain
4. Review the bridge summary showing what you'll receive
5. Click **Bridge** to initiate the transfer

That's it! The bridge handles the rest, including wrapping or unwrapping your tokens as needed.
`,
  },

  // ─── Using the Bridge ──────────────────────────────────────────
  {
    slug: "connecting-wallet",
    title: "Connecting Your Wallet",
    category: "Using the Bridge",
    content: `
# Connecting Your Wallet

To bridge tokens, you first need to connect a wallet that holds your assets. Vista Bridge supports wallets across all five supported networks.

## How to Connect

1. Click the **Connect Wallet** button in the bridge panel
2. A wallet selection modal will appear, showing three categories of wallets:
   - **EVM Compatible** — For Ethereum and BNB Chain
   - **BTC** — For Bitcoin
   - **Cardano** — For Cardano
3. Click on the wallet you want to connect
4. Approve the connection request in your wallet extension
5. Once connected, your wallet address will appear in the bridge panel

## Wallet Detection

Vista Bridge automatically detects which wallet extensions are installed in your browser. Wallets that are installed and ready to connect will appear as **enabled**, while wallets you haven't installed yet will appear as **disabled**.

## Supported Wallets by Network

| Network | Supported Wallets |
|---------|------------------|
| Ethereum | MetaMask, Rabby, XDCPay, OKX, WalletConnect, WanWallet |
| BNB Chain | MetaMask, Rabby, XDCPay, OKX, WalletConnect, WanWallet |
| Bitcoin | Unisat, One-Time Address |
| Cardano | Lace, Yoroi, Eternl, GeroWallet |
| Solana | Coming soon |

## One-Time Address (Bitcoin)

If you don't have a Bitcoin browser wallet, you can use the **One-Time Address** option. This lets you manually paste a Bitcoin address instead of connecting a wallet extension. This is useful if you're using a hardware wallet or a mobile wallet.

## Disconnecting

To disconnect your wallet, you can close the browser tab or refresh the page. Your wallet connection does not persist between sessions for security.

## Troubleshooting

- **Wallet not showing?** Make sure the browser extension is installed and enabled
- **Connection rejected?** Try again — you may have accidentally declined the popup
- **Wrong network?** Some wallets need to be switched to the correct network in the extension itself
`,
  },
  {
    slug: "bridging-assets",
    title: "Bridging Assets",
    category: "Using the Bridge",
    content: `
# Bridging Assets

This guide walks you through the complete process of bridging tokens from one network to another.

## Choosing Networks

Use the **From** dropdown to select the blockchain where your tokens currently are. Use the **To** dropdown to select the blockchain you want to send them to.

You can click the **swap button** (↕) between the two dropdowns to quickly reverse the bridge direction.

## Selecting a Token

After choosing your networks, the token dropdown will show all tokens available on the source network. Select the token you'd like to bridge.

Available tokens depend on which network you're bridging from:

| From Network | Available Tokens |
|-------------|-----------------|
| Cardano | ADA, HOSKY, USDT, USDC |
| Bitcoin | BTC |
| Ethereum | ETH, USDT, USDC |
| Solana | SOL, USDT, USDC |
| BNB Chain | BNB, USDT, USDC |

## Entering an Amount

Type the amount you want to bridge, or use the quick-select buttons:

| Button | What It Does |
|--------|-------------|
| **10%** | Sets to 10% of your balance |
| **25%** | Sets to 25% of your balance |
| **50%** | Sets to half your balance |
| **75%** | Sets to 75% of your balance |
| **MAX** | Sets to your full balance |

## Entering a Receiver Address

Paste your wallet address on the **destination** network. This is where you'll receive the bridged tokens. The bridge will validate the address format in real-time:

- A **green checkmark** means the address is valid
- A **red X** means the format doesn't match the destination network

> **Important:** Always double-check your receiver address. Sending tokens to a wrong address may result in permanent loss.

## Reviewing the Bridge Summary

Before confirming, review the bridge details shown at the bottom of the panel:

| Detail | Description |
|--------|-------------|
| **You Receive** | The token and amount you'll receive on the destination chain |
| **Estimated Time** | How long the transfer is expected to take |
| **Slippage** | Price slippage tolerance |
| **Result** | Description of wrapping behavior (e.g., "BTC wrapped as vBTC on Cardano") |

## Confirming the Bridge

Click the **Bridge** button to initiate the transfer. The bridge will verify that:

- Your amount is greater than zero
- Your receiver address matches the destination network format
- The source and destination networks are different

If everything checks out, the transfer begins.
`,
  },
  {
    slug: "your-inventory",
    title: "Your Inventory",
    category: "Using the Bridge",
    content: `
# Your Inventory

The Inventory panel on the left side of the Vista Bridge interface shows your token balances on the currently connected network.

## What You'll See

Each token in your inventory appears as a card showing:

- **Token icon** — Visual icon for the asset
- **Token symbol** — The ticker symbol (e.g., ADA, vBTC)
- **Balance** — Your current balance of that token

## Vista-Wrapped Tokens

If you hold any Vista-wrapped tokens (tokens that were bridged from another chain), they'll display with a small red **VISTA** badge in the corner of the card. This helps you quickly identify which assets are wrapped representations vs. native tokens.

For example, if you bridged BTC from Bitcoin to Cardano, you'll see **vBTC** in your Cardano inventory with the Vista badge.

## Network Switching

Your inventory updates automatically when you:

- **Connect a wallet** on a different network
- **Change the source network** in the bridge panel

The inventory always reflects the tokens available on the currently selected source network.

## Token Types in Your Inventory

On any given network, you might see:

- **Native tokens** — Tokens that belong to this network (e.g., ADA on Cardano)
- **Vista-wrapped tokens** — Tokens bridged from other chains (e.g., vBTC, vETH on Cardano)
- **Stablecoins** — USDT and USDC, which exist natively on most networks
`,
  },

  // ─── Networks & Tokens ─────────────────────────────────────────
  {
    slug: "supported-networks",
    title: "Supported Networks",
    category: "Networks & Tokens",
    content: `
# Supported Networks

Vista Bridge currently supports five blockchain networks. Each has its own set of native tokens, wallet options, and address format.

## Network Overview

| Network | Native Token | Wallet Type | Address Example |
|---------|-------------|-------------|----------------|
| **Cardano** | ADA | Lace, Yoroi, Eternl, GeroWallet | \`addr1qx2fxv2...\` |
| **Bitcoin** | BTC | Unisat, One-Time Address | \`bc1qw508d6...\` |
| **Ethereum** | ETH | MetaMask, Rabby, OKX, etc. | \`0x742d35Cc...\` |
| **Solana** | SOL | Coming soon | \`DRpbCBMxV...\` |
| **BNB Chain** | BNB | MetaMask, Rabby, OKX, etc. | \`0x742d35Cc...\` |

## Cardano

Cardano is the primary network of the Vista ecosystem. It uses ADA as its native currency and supports Cardano-native tokens like HOSKY. Cardano wallets connect via the CIP-30 browser wallet standard.

**Wallets:** Lace, Yoroi, Eternl, GeroWallet

## Bitcoin

Bitcoin is the original cryptocurrency network. Vista Bridge supports both browser wallet connections through Unisat and manual address entry through the One-Time Address option.

**Wallets:** Unisat, One-Time Address (manual entry)

## Ethereum

Ethereum is the largest smart contract platform. EVM-compatible wallets like MetaMask work for both Ethereum and BNB Chain.

**Wallets:** MetaMask, Rabby, XDCPay, OKX, WalletConnect, WanWallet

## Solana

Solana is a high-performance blockchain. Wallet support for Solana is coming soon.

## BNB Chain

BNB Chain (formerly Binance Smart Chain) is an EVM-compatible chain. The same wallets that work with Ethereum also work with BNB Chain.

**Wallets:** MetaMask, Rabby, XDCPay, OKX, WalletConnect, WanWallet
`,
  },
  {
    slug: "supported-tokens",
    title: "Supported Tokens",
    category: "Networks & Tokens",
    content: `
# Supported Tokens

Vista Bridge supports both native blockchain tokens and stablecoins. When tokens are bridged to a non-native chain, they become Vista-wrapped tokens.

## Native Tokens

These are the primary tokens on each blockchain:

| Token | Name | Home Network |
|-------|------|-------------|
| **ADA** | Cardano | Cardano |
| **BTC** | Bitcoin | Bitcoin |
| **ETH** | Ether | Ethereum |
| **SOL** | Solana | Solana |
| **BNB** | BNB | BNB Chain |
| **HOSKY** | Hosky Token | Cardano |

## Stablecoins

Stablecoins exist natively on multiple networks, so they bridge directly without wrapping:

| Token | Available On |
|-------|-------------|
| **USDT** (Tether) | Ethereum, BNB Chain, Solana, Cardano |
| **USDC** (USD Coin) | Ethereum, BNB Chain, Solana, Cardano |

> **Note:** When you bridge USDT or USDC between chains, the token keeps its name — no \`v\` prefix is added.

## Vista-Wrapped Tokens

When a native token is bridged to another chain, it becomes a Vista-wrapped token with a \`v\` prefix:

| Wrapped Token | Original | Available On |
|--------------|----------|-------------|
| **vBTC** | BTC | Cardano, Ethereum, Solana |
| **vETH** | ETH | Cardano, Bitcoin, BNB Chain |
| **vADA** | ADA | Ethereum, Bitcoin, Solana, BNB Chain |
| **vSOL** | SOL | Cardano |
| **vBNB** | BNB | Cardano |
| **vHOSKY** | HOSKY | Ethereum |

## Tokens Available Per Network

Here's what tokens you can bridge from each network:

| From Network | Tokens You Can Bridge |
|-------------|----------------------|
| Cardano | ADA, HOSKY, USDT, USDC |
| Bitcoin | BTC |
| Ethereum | ETH, USDT, USDC |
| Solana | SOL, USDT, USDC |
| BNB Chain | BNB, USDT, USDC |
`,
  },
  {
    slug: "vista-wrapping",
    title: "Vista Wrapping (v-Prefix)",
    category: "Networks & Tokens",
    content: `
# Vista Wrapping (v-Prefix)

When you bridge a token to a different blockchain, Vista Bridge creates a wrapped version of that token on the destination chain. This wrapped token is identified by a **v prefix** in its name.

## How It Works

The \`v\` stands for "Vista" and indicates that the token is a bridge-wrapped representation of an asset from another chain.

**Examples:**

| You Send | From | To | You Receive |
|----------|------|-----|-------------|
| BTC | Bitcoin | Cardano | **vBTC** |
| ETH | Ethereum | Cardano | **vETH** |
| ADA | Cardano | Ethereum | **vADA** |
| SOL | Solana | Cardano | **vSOL** |

## Getting Your Original Tokens Back

To convert a wrapped token back to the original, simply bridge it back to its home network. The \`v\` prefix is removed automatically:

| You Send | From | To | You Receive |
|----------|------|-----|-------------|
| vBTC | Cardano | Bitcoin | **BTC** |
| vETH | Cardano | Ethereum | **ETH** |
| vADA | Ethereum | Cardano | **ADA** |

## Stablecoins Are Different

Stablecoins like **USDT** and **USDC** already exist on multiple blockchains natively. When you bridge a stablecoin, it keeps its original name — no wrapping is needed:

| You Send | From | To | You Receive |
|----------|------|-----|-------------|
| USDT | Ethereum | Cardano | **USDT** |
| USDC | Solana | BNB Chain | **USDC** |

## How to Identify Wrapped Tokens

In your [Inventory](/docs/your-inventory), Vista-wrapped tokens are marked with a small red **VISTA** badge on the token card. This makes it easy to tell which tokens are wrapped representations and which are native to the current network.

## Quick Summary

- Tokens leaving their home network get a \`v\` prefix (wrapped)
- Tokens returning to their home network lose the \`v\` prefix (unwrapped)
- Stablecoins (USDT, USDC) never get wrapped
- Wrapped tokens can always be bridged back for the original asset
`,
  },

  // ─── Smart Contracts ────────────────────────────────────────────
  {
    slug: "contracts-overview",
    title: "On-Chain Contracts",
    category: "Smart Contracts",
    content: `
# On-Chain Smart Contracts

Vista Bridge is backed by smart contracts deployed on the Cardano blockchain. These contracts handle the on-chain logic that makes secure cross-chain bridging possible.

## What Are Smart Contracts?

Smart contracts are programs that run on a blockchain. They execute automatically when certain conditions are met, without needing a middleman. For Vista Bridge, smart contracts manage how assets are locked, wrapped, and transferred across chains.

## Vista Bridge Contracts

The smart contracts for Vista Bridge are developed in the [smart-contracts repository](https://github.com/Agrow-Labs/smart-contracts) and include:

| Contract | Purpose | Status |
|----------|---------|--------|
| **Custodial Transfer** | Manages custody and delivery of assets between parties | In Development |

## Design Principles

All Vista Bridge contracts are built with these principles in mind:

- **Open source** — All code is publicly available and auditable
- **Well documented** — Clear documentation and usage examples
- **Tested** — Comprehensive test suites with test-network examples
- **Cardano native** — Built on Cardano's Plutus smart contract platform

## Why Cardano?

Cardano's unique UTXO-based model provides strong security guarantees for smart contracts. The Plutus programming language allows for formally verified contract logic, reducing the risk of bugs or exploits.
`,
  },
  {
    slug: "custodial-transfer",
    title: "Custodial Transfer",
    category: "Smart Contracts",
    content: `
# Custodial Transfer

The Custodial Transfer contract is a public utility smart contract being built for the Cardano blockchain. It manages scenarios where assets are held in custody during transfer between two parties.

## What Does It Do?

Think of it like shipping a package: a sender gives the package to a carrier, and the carrier delivers it to the receiver. The Custodial Transfer contract works the same way, but with digital assets on the blockchain.

\`\`\`
Sender  ──►  Carrier (Custodian)  ──►  Receiver
\`\`\`

The contract ensures that:

- The **sender** can transfer custody of assets
- The **carrier** (custodian) holds assets securely during transit
- The **receiver** gets the assets delivered correctly

## Use Cases

This contract is designed for real-world scenarios like:

- **Shipping & logistics** — Tracking custody of goods as they move through a supply chain
- **Escrow services** — Holding assets until delivery conditions are met
- **Multi-party transfers** — Managing handoffs between multiple participants

## Current Status

The Custodial Transfer contract is currently **in development**. Planned deliverables include:

1. Published smart contract source code
2. Comprehensive usage documentation
3. Automated test suite
4. Test network examples for integration

Check the [smart-contracts repository](https://github.com/Agrow-Labs/smart-contracts) for the latest progress and updates.
`,
  },

  // ─── Help & Resources ──────────────────────────────────────────
  {
    slug: "supported-wallets",
    title: "Supported Wallets",
    category: "Help & Resources",
    content: `
# Supported Wallets

Vista Bridge works with 12 browser wallets across three categories. Here's everything you need to know about each.

## EVM Wallets (Ethereum & BNB Chain)

These wallets work with both **Ethereum** and **BNB Chain**:

| Wallet | Description | Get It |
|--------|-------------|--------|
| **MetaMask** | The most popular crypto wallet for Ethereum | [metamask.io](https://metamask.io) |
| **Rabby** | Multi-chain wallet with built-in security checks | [rabby.io](https://rabby.io) |
| **XDCPay** | Wallet for the XDC Network (EVM compatible) | Browser extension |
| **OKX Wallet** | Full-featured wallet from the OKX exchange | [okx.com](https://www.okx.com/web3) |
| **WalletConnect** | Connect any mobile wallet via QR code | Coming soon |
| **WanWallet** | Wallet for Wanchain cross-chain transactions | Browser extension |

## Bitcoin Wallets

| Wallet | Description | Get It |
|--------|-------------|--------|
| **Unisat** | Leading Bitcoin browser wallet with Ordinals support | [unisat.io](https://unisat.io) |
| **One-Time Address** | Manually paste any Bitcoin address (no extension needed) | Built-in |

> **Tip:** The One-Time Address option is great if you use a hardware wallet or mobile wallet that doesn't have a browser extension.

## Cardano Wallets

| Wallet | Description | Get It |
|--------|-------------|--------|
| **Lace** | Modern Cardano wallet built by IOG | [lace.io](https://www.lace.io) |
| **Yoroi** | Lightweight Cardano wallet by EMURGO | [yoroi-wallet.com](https://yoroi-wallet.com) |
| **Eternl** | Feature-rich Cardano wallet for power users | [eternl.io](https://eternl.io) |
| **GeroWallet** | DeFi-focused Cardano wallet | [gerowallet.io](https://www.gerowallet.io) |

## Which Wallet Should I Use?

It depends on which network you're bridging from:

| If you're bridging from... | Recommended wallet |
|---------------------------|-------------------|
| Cardano | **Lace** or **Eternl** |
| Bitcoin | **Unisat** |
| Ethereum | **MetaMask** or **Rabby** |
| BNB Chain | **MetaMask** |

## Installing a Wallet

Most wallets are browser extensions. To install:

1. Visit the wallet's website (linked in the tables above)
2. Click the download or install button
3. Follow the setup instructions to create or import a wallet
4. Refresh the Vista Bridge page — your wallet will be automatically detected
`,
  },
  {
    slug: "faq",
    title: "FAQ",
    category: "Help & Resources",
    content: `
# Frequently Asked Questions

## General

### What is Vista Bridge?

Vista Bridge is a cross-chain bridge that lets you transfer cryptocurrency tokens between different blockchain networks — Cardano, Bitcoin, Ethereum, Solana, and BNB Chain.

### Is Vista Bridge free to use?

Standard bridge operations may include network transaction fees (gas fees) from the source and destination chains. Check the bridge summary before confirming for fee details.

### Do I need an account?

No. Vista Bridge works directly with your browser wallet. There's no registration or account creation required.

## Bridging

### What happens to my tokens when I bridge them?

When you bridge a token to another chain, your original tokens are locked and a wrapped version (with a \`v\` prefix) is created on the destination chain. For example, bridging BTC to Cardano gives you vBTC.

### Can I get my original tokens back?

Yes. Simply bridge the wrapped token back to its home network. For example, bridging vBTC from Cardano back to Bitcoin gives you BTC.

### Why don't USDT and USDC get wrapped?

Stablecoins like USDT and USDC exist natively on multiple blockchains, so there's no need to create a wrapped version. They transfer directly.

### What does the "v" prefix mean?

The \`v\` stands for "Vista" and indicates that a token is a wrapped representation of an asset from another blockchain. For example, \`vETH\` is Ethereum's ETH wrapped for use on another chain.

### How long does a bridge transfer take?

Transfer times vary depending on the source and destination networks. The bridge summary shows an estimated completion time before you confirm.

## Wallets

### My wallet isn't showing up. What do I do?

Make sure your wallet's browser extension is installed and enabled. Try refreshing the page after installing. Vista Bridge automatically detects installed wallet extensions.

### Can I use a hardware wallet?

For Bitcoin, you can use the **One-Time Address** option to manually enter an address from any wallet, including hardware wallets. For other networks, you'll need a supported browser extension.

### Do I need to stay on the page during a bridge transfer?

It's recommended to stay on the page until the bridge confirms your transaction. Closing the tab before confirmation may cause issues.

## Security

### Is Vista Bridge safe?

Vista Bridge is open source, meaning the code can be reviewed by anyone. The smart contracts are built on Cardano's Plutus platform, which supports formal verification. Always double-check your receiver address before confirming a bridge transfer.

### What if I enter the wrong address?

Bridge transfers to incorrect addresses may not be recoverable. Vista Bridge validates address formats in real-time to help prevent mistakes, but always verify the full address before confirming.
`,
  },
  {
    slug: "security",
    title: "Security",
    category: "Help & Resources",
    content: `
# Security

Vista Bridge is built with security as a top priority. Here's what you should know about staying safe while bridging assets.

## Open Source Code

All Vista Bridge code is open source and publicly available on GitHub. This means:

- Anyone can review the code for vulnerabilities
- The community can contribute security improvements
- Transparency builds trust

Repositories:

- [vista-bridge](https://github.com/Agrow-Labs/vista-bridge) — Bridge web application
- [smart-contracts](https://github.com/Agrow-Labs/smart-contracts) — On-chain contracts

## Smart Contract Security

Vista Bridge smart contracts are built on Cardano's **Plutus** platform, which uses Haskell — a programming language well-suited for writing reliable, formally verifiable code. The UTXO model used by Cardano provides additional security guarantees compared to account-based models.

## Best Practices for Users

### Verify Your Receiver Address

Always double-check the receiver address before confirming a bridge transfer. Transactions on the blockchain are irreversible — if tokens are sent to the wrong address, they may not be recoverable.

Vista Bridge helps by validating address formats in real-time, but format validation can't catch address typos that still produce a valid format.

### Use Trusted Wallets

Only connect wallets you trust and have downloaded from official sources. Vista Bridge supports well-known wallets like MetaMask, Lace, Unisat, and others from their official websites.

### Start Small

If you're bridging for the first time or trying a new network, consider starting with a small amount to make sure everything works as expected before bridging larger sums.

### Keep Your Wallet Secure

- Never share your seed phrase or private keys with anyone
- Use strong passwords for your wallet
- Keep your browser wallet extensions updated
- Be cautious of phishing sites that mimic Vista Bridge

### Check the URL

Always make sure you're on the official Vista Bridge website. Bookmark the official URL to avoid phishing attempts.

## Reporting Security Issues

If you discover a security vulnerability in Vista Bridge, please report it responsibly through the [GitHub Issues](https://github.com/Agrow-Labs/vista-bridge/issues) page or contact the Agrow Labs team directly.
`,
  },
];

export function getDocBySlug(slug: string): DocSection | undefined {
  return DOC_SECTIONS.find((s) => s.slug === slug);
}

export function getDefaultDoc(): DocSection {
  return DOC_SECTIONS[0];
}
