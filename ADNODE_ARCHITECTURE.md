# AdNode Architecture

## Product Overview

AdNode is a decentralized ad marketplace on the Fhenix-compatible Arbitrum Sepolia environment. Hosters fund campaigns into escrow. Developers register slots, embed the slot runtime, and receive private payouts after settlement writes are accepted on-chain.

## Core Components

### Frontend

- React + Vite SPA with `wouter`
- WalletConnect v2-only wallet entrypoint through wagmi
- Hoster dashboard for campaign creation, funding, activation, and escrow visibility
- Developer dashboard for slot registration, campaign assignment, payout claims, and unshield flow
- GSAP motion with Barba.js transition orchestration for route changes

### Smart Contracts

- `AdRegistry.sol`
  - campaign creation
  - escrow funding and top-ups
  - slot registration
  - slot-to-campaign assignment
  - claimable developer earnings ledger
  - payout wrapper discovery
- `AdAnalytics.sol`
  - impression and click reporting
  - explicit `REPORTER_ROLE`
  - explicit `EARNINGS_ROLE`
  - encrypted developer earnings tracking
- `AdNodePayoutWrapper.sol`
  - FHERC20 native wrapper path for confidential payout balances
  - shield native ETH into confidential balances
  - unshield balances back to native ETH after decryption claim finalization

### Backend

- signed metadata APIs for campaigns and slots
- embed delivery APIs:
  - `/api/embed.js`
  - `/api/embed`
  - `/api/embed-frame`
- measurement API:
  - `/api/measure`
- settlement replay API:
  - `/api/settlement/replay`
- Mongo-backed persistence with in-memory fallback for local use

## Runtime Flow

### Hoster Flow

1. Connect through WalletConnect on Arbitrum Sepolia.
2. Create a campaign with creative URI, category, pricing model, rate, and initial funding.
3. Save signed metadata for the on-chain campaign id.
4. Keep the campaign active and top up escrow when needed.

### Developer Flow

1. Connect through WalletConnect on Arbitrum Sepolia.
2. Register a slot on-chain.
3. Save signed site metadata for that slot.
4. Assign a funded campaign to the slot.
5. Copy the generated slot snippet into the publisher property.
6. Decrypt earnings, claim into the wrapper, then unshield back to native ETH.

### Measurement and Settlement Flow

1. The embed endpoint resolves the current campaign through the slot assignment.
2. The iframe receives a signed measurement token tied to `chainCampaignId` and `chainSlotId`.
3. Impression and click events are posted to `/api/measure`.
4. Events are deduplicated by campaign, slot, event type, time bucket, and visitor fingerprint.
5. Accepted events are synced to `AdAnalytics.sol`.
6. Payout credits are applied using explicit earnings roles.
7. If settlement fails, the record remains pending and is replayed later.
8. Developers claim earnings from `AdRegistry.sol`, which shields the payout into `AdNodePayoutWrapper.sol`.
9. Developers initiate unshield and complete the confidential claim to receive native ETH.

## Current Feature Inventory

### Shipped

- WalletConnect v2 QR connect
- session persistence and reconnect
- wrong-network handling for Arbitrum Sepolia
- funded campaign creation
- slot registration
- slot assignment
- slot-based embed delivery
- signed metadata writes
- encrypted earnings decryption
- claimable earnings ledger
- FHERC20 wrapper claim flow
- pending settlement replay support

### Important Constraints

- The system is configured for the Fhenix-compatible Arbitrum Sepolia environment today
- Confidential payout flow depends on the wrapped native token address passed at deployment time
- Settlement signer infrastructure is required for automated on-chain reporting
- Mongo fallback exists for local resilience, but production should point to a persistent database

## Operational Environment

Required server configuration:

```env
VITE_CHAIN_ID=421614
VITE_FHENIX_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
VITE_ADREGISTRY_ADDRESS=...
VITE_ADANALYTICS_ADDRESS=...
VITE_WALLETCONNECT_PROJECT_ID=...
SETTLEMENT_PRIVATE_KEY=...
ADNODE_EMBED_SECRET=...
WRAPPED_NATIVE_TOKEN_ADDRESS=...
```

## Files To Know

- [src/lib/contract-client.ts](C:/Users/anike/Desktop/added/src/lib/contract-client.ts)
- [src/hooks/useAdNode.ts](C:/Users/anike/Desktop/added/src/hooks/useAdNode.ts)
- [src/pages/Docs.tsx](C:/Users/anike/Desktop/added/src/pages/Docs.tsx)
- [server/index.ts](C:/Users/anike/Desktop/added/server/index.ts)
- [server/public-campaigns.ts](C:/Users/anike/Desktop/added/server/public-campaigns.ts)
- [server/settlement-service.ts](C:/Users/anike/Desktop/added/server/settlement-service.ts)
- [contracts/AdRegistry.sol](C:/Users/anike/Desktop/added/contracts/AdRegistry.sol)
- [contracts/AdAnalytics.sol](C:/Users/anike/Desktop/added/contracts/AdAnalytics.sol)
- [contracts/AdNodePayoutWrapper.sol](C:/Users/anike/Desktop/added/contracts/AdNodePayoutWrapper.sol)
