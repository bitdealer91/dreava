# Dreava Launchpad (Public Frontend)

This is the public, sanitized frontend of the Dreava Launchpad used for Somnia Testnet.

- Network: Somnia Testnet (chainId 50312, 0xc488)
- Wallets: MetaMask, Rabby, WalletConnect via Reown AppKit + Wagmi
- Core flows: connect, network switch enforcement, mint, create collection, launch sale
- Quest endpoints: `/api/quest/*` consumed from production API (not part of this repo)

What’s included
- Frontend source (`src/`), Vite/Tailwind configs, `index.html`, and public assets
- `.env.example` with required environment vars
- Docs: `SOMNIA_QUEST_API.md` (read-only API spec), `REOWN_ONLY_SETUP.md`, `Docs.md`

What’s excluded
- Private backend code, deployment scripts, server configs, secrets

Quickstart
1. Copy `.env.example` to `.env` and fill values
2. Install deps: `npm i`
3. Dev: `npm run dev`
4. Build: `npm run build` and `npm run preview`

Notes
- The app enforces Somnia Testnet on critical actions.
- Service worker and caching safe for mobile wallets.
- Media assets are minimal; replace with your own if needed.
