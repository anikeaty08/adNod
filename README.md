# AdNode

[![React](https://img.shields.io/badge/React-18-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-2F74C0?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-Frontend-5A67FF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployable-111111?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Backend-1F8A4D?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Solidity](https://img.shields.io/badge/Solidity-Smart%20Contracts-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org/)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/anikeaty08/adNod&project-name=adnode&repository-name=adNod&env=MONGO_URI,PRIVATE_KEY,ARBITRUM_SEPOLIA_RPC_URL,VITE_API_URL)

AdNode is a decentralized advertising platform designed for the Fhenix ecosystem. It connects advertisers, called Hosters, with publishers, called Developers, through a blockchain-native workflow for campaign creation, marketplace discovery, integration, and payout-oriented tracking.

## Overview

AdNode includes:

- A React + TypeScript frontend with a responsive SaaS-style interface
- A Vercel-deployable backend using serverless API routes
- A local Express API for development
- A Solidity campaign escrow contract with Hardhat tooling
- Role-specific workspaces for Hosters and Developers
- Wallet-based access with injected browser wallet support
- Marketplace, docs, profile/history, and role-focused dashboards

## Features

### Hoster

- Connect wallet and enter the Hoster workspace
- Create campaigns with title, creative URL, budget, pricing model, and rate
- View campaign listings and history
- Monitor campaign state through a clean dashboard

### Developer

- Connect wallet and enter the Developer workspace
- Browse available marketplace campaigns
- Use snippet templates for multiple frameworks
- Review marketplace history and role-specific workspace content

### Shared product experience

- Full-screen intro video on first load
- Light/dark mode
- Mobile-responsive layouts
- Profile/history page
- Vercel-ready frontend and backend structure

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Wouter
- React Hook Form
- Zod
- TanStack Query

### Backend

- Vercel serverless functions in `api/`
- Express for local development
- MongoDB with Mongoose

### Smart contracts

- Solidity
- Hardhat

## Project Structure

```text
adNod/
├─ api/                    # Vercel serverless backend endpoints
├─ contracts/              # Solidity contracts and tests
├─ public/                 # Static assets including intro video
├─ scripts/                # Contract deployment scripts
├─ server/                 # Local Express API and shared data layer
├─ src/
│  ├─ components/          # UI building blocks
│  ├─ context/             # Wallet/auth/theme providers
│  ├─ hooks/               # React Query hooks and app hooks
│  ├─ lib/                 # Frontend API helpers and contract adapter
│  ├─ pages/               # Product pages
│  └─ styles/              # Global styling
├─ vercel.json             # Vercel configuration
└─ README.md
```

## Local Development

### 1. Install dependencies

```powershell
npm.cmd install
```

### 2. Configure environment variables

Create a local `.env` file based on `.env.example`.

Required variables:

- `MONGO_URI`
- `PRIVATE_KEY`
- `ARBITRUM_SEPOLIA_RPC_URL`
- `VITE_API_URL`

Example local value for the frontend API:

```env
VITE_API_URL=http://127.0.0.1:4000
```

### 3. Start the backend

```powershell
npm.cmd run dev:api
```

### 4. Start the frontend

```powershell
npm.cmd run dev
```

### 5. Build the frontend

```powershell
npm.cmd run build
```

## Vercel Deployment

AdNode is structured so both the frontend and backend can be deployed together on Vercel.

### How it works

- The frontend is built by Vite and output to `dist`
- The backend is exposed through Vercel serverless functions inside `api/`
- In production, the frontend uses same-origin `/api/*` routes instead of `localhost`
- `vercel.json` handles the SPA routing for the frontend

### Vercel backend endpoints

- `GET /api/health`
- `GET /api/campaigns`
- `POST /api/campaigns`

### Deploy steps

1. Push the repository to GitHub
2. Import the repository into Vercel
3. Add the required environment variables in the Vercel dashboard
4. Deploy

### Required Vercel environment variables

- `MONGO_URI`
- `PRIVATE_KEY`
- `ARBITRUM_SEPOLIA_RPC_URL`
- `VITE_API_URL`

For Vercel production you can set:

```env
VITE_API_URL=
```

or omit it entirely, because the frontend already falls back to same-origin `/api` in production.

## Smart Contract Commands

### Run tests

```powershell
npx.cmd hardhat test
```

### Deploy to Arbitrum Sepolia

```powershell
npx.cmd hardhat run scripts/deploy.cjs --network arbitrumSepolia
```

## Important Files

### Frontend

- [src/App.tsx](/C:/Users/anike/Desktop/added/src/App.tsx)
- [src/pages/HosterDashboard.tsx](/C:/Users/anike/Desktop/added/src/pages/HosterDashboard.tsx)
- [src/pages/DeveloperDashboard.tsx](/C:/Users/anike/Desktop/added/src/pages/DeveloperDashboard.tsx)
- [src/pages/Profile.tsx](/C:/Users/anike/Desktop/added/src/pages/Profile.tsx)
- [src/lib/api.ts](/C:/Users/anike/Desktop/added/src/lib/api.ts)

### Backend

- [api/campaigns.ts](/C:/Users/anike/Desktop/added/api/campaigns.ts)
- [api/health.ts](/C:/Users/anike/Desktop/added/api/health.ts)
- [server/index.ts](/C:/Users/anike/Desktop/added/server/index.ts)
- [server/campaign-store.ts](/C:/Users/anike/Desktop/added/server/campaign-store.ts)
- [server/models/Campaign.ts](/C:/Users/anike/Desktop/added/server/models/Campaign.ts)

### Contracts

- [contracts/AdNodeEscrow.sol](/C:/Users/anike/Desktop/added/contracts/AdNodeEscrow.sol)
- [hardhat.config.cjs](/C:/Users/anike/Desktop/added/hardhat.config.cjs)
- [scripts/deploy.cjs](/C:/Users/anike/Desktop/added/scripts/deploy.cjs)

## Current Notes

- Local development can use the Express API in `server/`
- Production deployment on Vercel uses the `api/` handlers
- Wallet connection currently relies on an injected browser wallet provider
- Campaign persistence uses MongoDB when available and falls back to memory in local failure cases

## Next Production Improvements

- Replace the temporary contract-shaped campaign creation adapter with live Fhenix client integration
- Add real on-chain event syncing for impressions, clicks, and payouts
- Add stronger validation, auth boundaries, and fraud protection
- Add persistent user/account history beyond wallet and campaign records
