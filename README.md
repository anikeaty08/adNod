# AdNode

AdNode is a decentralized advertising platform for Fhenix-style workflows that pairs advertisers (Hosters) with publishers (Developers) through escrow-backed campaigns, on-chain performance tracking, and automated payouts.

## Included

- React 18 + TypeScript frontend with Vite
- Tailwind CSS sky-blue design system with dark mode
- Full-screen 20-second intro video from `public/adnode-intro.mp4`
- Role-based onboarding for Hosters and Developers
- Hoster dashboard, Developer dashboard, marketplace, docs, and innovation hub
- Campaign creation flow with validation and contract-shaped execution helpers
- Multi-framework snippet generator with copy support
- Solidity escrow contract, Hardhat test, and deployment script
- Optional Express + MongoDB API scaffold for campaign metadata

## Environment

Keep secrets in a local `.env` file and never commit them. Use [.env.example](/C:/Users/anike/Desktop/added/.env.example) as the template.

Required values:

- `MONGO_URI`
- `PRIVATE_KEY`
- `ARBITRUM_SEPOLIA_RPC_URL`
- `VITE_API_URL`

## Commands

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run dev:api
npm.cmd run build
npx hardhat test
npx hardhat run scripts/deploy.cjs --network arbitrumSepolia
```

## Important notes

- The frontend adapter in [src/lib/fhenix-contract.ts](/C:/Users/anike/Desktop/added/src/lib/fhenix-contract.ts) is a mock execution layer so the UI runs locally without a live Fhenix wallet SDK.
- The deployment config in [hardhat.config.cjs](/C:/Users/anike/Desktop/added/hardhat.config.cjs) reads your wallet key from env for Arbitrum Sepolia.
- The optional Mongo API entry point is [server/index.ts](/C:/Users/anike/Desktop/added/server/index.ts).
- The main contract is [contracts/AdNodeEscrow.sol](/C:/Users/anike/Desktop/added/contracts/AdNodeEscrow.sol).

## Production follow-up

- Replace the mock wallet/contract adapter with the official Fhenix SDK.
- Add signature verification and fraud controls around performance events.
- Use a relayer or indexer for analytics rather than direct public tracking calls.
- Rotate any credentials that were exposed outside your local machine.
