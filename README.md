# AdNode

AdNode is a decentralized advertising marketplace on the Fhenix-compatible Arbitrum Sepolia testnet. It connects:

- Hosters: advertisers who fund campaigns
- Developers: publishers who register slots and embed ads

The product loop is simple and live: fund campaign escrow, assign campaign to a slot, serve the slot snippet, measure delivery, settle on-chain, and move payouts through the confidential wrapper before unshielding back to native ETH.

## Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS, wouter
- Wallets: wagmi, viem, WalletConnect v2
- Privacy: CoFHE SDK on Fhenix-compatible testnet
- Backend: Express + Vercel serverless handlers for metadata, embed delivery, and settlement measurement
- Contracts: Solidity + Hardhat
- Motion/UI: GSAP + Barba.js transition orchestration + lucide-react icons

## WalletConnect v2

WalletConnect v2 is the only wallet connection path in the app.

What it supports:

- WalletConnect QR modal
- Fhenix-compatible Arbitrum Sepolia testnet
- Connected address display
- Disconnect
- Auto reconnect via wagmi storage
- Wrong-network handling
- Connection error messaging
- CoFHE compatibility by reusing the active wagmi wallet client for encrypted flows

## Environment

Create `.env` from `.env.example` and set:

```env
VITE_CHAIN_ID=421614
VITE_FHENIX_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_ADREGISTRY_ADDRESS=your_registry_address
VITE_ADANALYTICS_ADDRESS=your_analytics_address
VITE_API_URL=http://127.0.0.1:4000
MONGO_URI=your_mongo_uri
PRIVATE_KEY=your_deployer_key
SETTLEMENT_PRIVATE_KEY=server_side_settlement_signer
ADNODE_EMBED_SECRET=server_side_secret
ADNODE_SETTLEMENT_REPLAY_INTERVAL_MS=60000
WRAPPED_NATIVE_TOKEN_ADDRESS=network_wrapped_native_token
```

`SETTLEMENT_PRIVATE_KEY` and `ADNODE_EMBED_SECRET` must stay server-side only.

## User Flows

### Hoster

- Connect through WalletConnect on Arbitrum Sepolia
- Create a campaign with creative, category, pricing model, rate, and escrow funding
- Review escrow totals and activate or pause campaigns
- Let developers attach the campaign to registered slots

### Developer

- Connect through WalletConnect on Arbitrum Sepolia
- Register a slot and save public site metadata
- Assign a funded campaign to that slot
- Copy the generated slot snippet into a site or app
- Decrypt earnings, claim into the confidential wrapper, then unshield back to native ETH

## Measurement and Settlement

- Embed frames receive a signed measurement token tied to a specific slot and campaign assignment
- `/api/measure` records impressions and clicks, deduplicates them, and immediately attempts settlement on-chain
- If RPC or signer issues interrupt settlement, the measurement stays pending instead of being lost
- Pending writes can be replayed through `POST /api/settlement/replay` or automatically with `ADNODE_SETTLEMENT_REPLAY_INTERVAL_MS`
- Payout credits flow from escrow into the FHERC20 native wrapper and are unshielded back to ETH when the developer finalizes the claim

## Running The App

```powershell
npm.cmd install
npm.cmd run dev:api
npm.cmd run dev
```

## Production Notes

- Ad serving is slot-based, not campaign-id based
- Wallet-gated flows stay intact for CoFHE encryption and decryption
- Campaign metadata writes are signed and checked against chain ownership
- Developer payouts are claimable only after funded settlement is recorded
- Settlement uses explicit analytics and earnings roles instead of broad owner-only control
- The frontend expects WalletConnect and the Fhenix-compatible Arbitrum Sepolia RPC to point at the same deployment

## Repo Docs

- [Architecture](docs/ADNODE_ARCHITECTURE.md)
- [Docs Page Source](src/pages/Docs.tsx)

## Commands

```powershell
npx.cmd hardhat compile
npm.cmd run build
npx.cmd hardhat run scripts/deploy.cjs --network fhenixArbitrumSepolia
```

## Key Files

- [src/lib/contract-client.ts](src/lib/contract-client.ts)
- [src/context/WalletContext.tsx](src/context/WalletContext.tsx)
- [src/components/shared/WalletConnectionModal.tsx](src/components/shared/WalletConnectionModal.tsx)
- [src/pages/Docs.tsx](src/pages/Docs.tsx)
- [server/settlement-service.ts](server/settlement-service.ts)
- [server/public-campaigns.ts](server/public-campaigns.ts)
- [contracts/AdRegistry.sol](contracts/AdRegistry.sol)
- [contracts/AdAnalytics.sol](contracts/AdAnalytics.sol)
