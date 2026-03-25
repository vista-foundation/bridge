# VISTA

Open-source cross-chain bridge protocol built by [Agrow Labs](https://agrowlabs.io), funded through [Project Catalyst](https://projectcatalyst.io).

## Project Structure

```
src/
├── app/
│   ├── (marketing)/          # Marketing website
│   │   ├── page.tsx          #   Home        → /
│   │   ├── about/            #   About       → /about
│   │   ├── docs/             #   Docs        → /docs
│   │   └── learn/            #   Learn More  → /learn
│   └── (app)/                # Bridge application
│       └── app/              #   Bridge UI   → /app
├── components/
│   ├── Header.tsx            # Shared header (both teams)
│   ├── marketing/            # Marketing components (Footer, DocsLayout, etc.)
│   └── app/                  # App components (BridgePanel, Inventory, etc.)
├── lib/
│   ├── marketing/            # Marketing data & content
│   └── app/                  # Bridge logic & token data
├── contracts/                # Smart contracts (coming soon)
└── backend/                  # Backend services (coming soon)
```

The `(marketing)` and `(app)` folders are Next.js [route groups](https://nextjs.org/docs/app/building-your-application/routing/route-groups) — the parentheses are stripped from URLs.

## Teams

| Area | Directory | Description |
|------|-----------|-------------|
| **Marketing Website** | `src/app/(marketing)/`, `src/components/marketing/`, `src/lib/marketing/` | Home, About, Docs, Learn pages |
| **Bridge App** | `src/app/(app)/`, `src/components/app/`, `src/lib/app/` | Bridge UI, wallet connection, asset transfers |
| **Smart Contracts** | `src/contracts/` | On-chain bridge contracts (TBD) |
| **Backend** | `src/backend/` | Relay services, indexers, APIs (TBD) |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the marketing site, or navigate to [http://localhost:3000/app](http://localhost:3000/app) for the bridge.
