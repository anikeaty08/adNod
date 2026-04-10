# AdNode Audit Report

Date: 2026-04-05

## Verdict

AdNode is a strong visual demo and a decent Fhenix proof of concept, but it is not a real advertising product yet.

Right now it behaves more like:

- a wallet-gated UI
- a pair of basic FHE contracts
- an unauthenticated metadata API
- an iframe embed that can show a creative

It does not yet behave like:

- a trusted ad marketplace
- an enforceable publisher network
- an escrow-backed campaign system
- a measurable payout system
- a production-grade Fhenix application

If you shipped this as "live" today, the product would get punished on trust before it got judged on design.

## Critical Findings

### P0. Slot assignment is not enforced by the embed runtime

Evidence:

- `src/components/docs/SnippetGenerator.tsx:17-77` generates snippets that directly request `/api/embed.js?campaignId=...`
- `server/public-campaigns.ts:104-107` builds an iframe script around a raw `campaignId`

Impact:

- publishers can render any campaign they want
- the on-chain `assignCampaignToSlot` flow has no serving authority
- marketplace matching is cosmetic, not enforceable
- you cannot build trustworthy billing or attribution on top of this

Blunt version:

The core marketplace promise is fake until the embed is slot-based, signed, and verified.

### P0. "Budget" is declared, not funded

Evidence:

- `contracts/AdRegistry.sol:37-62` stores encrypted budget and CPC
- there is no payable campaign funding
- there is no escrow balance accounting
- there is no spend-down logic
- there is no withdrawal or settlement path

Impact:

- "escrow-backed funding" is untrue
- advertisers are not actually locking money
- campaign budgets cannot constrain delivery
- payouts cannot be guaranteed

Blunt version:

This is not an ad market yet. It is a registry of encrypted numbers.

### P0. Analytics and earnings are not connected to real delivery

Evidence:

- `contracts/AdAnalytics.sol:27-43` allows `recordImpression` and `recordClick` only for the contract owner
- `contracts/AdAnalytics.sol:50-59` stores earnings, but only the owner can add them
- `src/hooks/useAdNode.ts:189-200` exposes only `recordImpression`
- no frontend path records clicks
- no embed path records impressions or clicks
- no withdrawal path exists anywhere

Impact:

- impressions and clicks are not measured from the real serving surface
- earnings are manual admin state, not protocol state
- the payout dashboard is mostly theater

Blunt version:

You cannot call payouts "verifiable" when the chain never sees trustworthy delivery events.

### P0. Off-chain metadata is unauthenticated and controls core UX

Evidence:

- `api/campaigns.ts:26-30` accepts arbitrary campaign metadata
- `api/slot.ts:30-43` updates slot assignment without auth
- `server/campaign-store.ts:7-12` and `server/slot-store.ts:7-11` coerce everything to strings with no real validation
- `src/hooks/useAdNode.ts:113-120` and `src/hooks/useAdNode.ts:163-171` trust those APIs after on-chain actions

Impact:

- anyone can spoof advertiser or developer metadata
- anyone can poison marketplace browsing data
- ownership in the UI is partially based on mutable unauthenticated records
- this undermines trust in the whole product

Blunt version:

A real product cannot trust anonymous POST bodies for business-critical identity.

### P0. On-chain entities disappear from the UI if metadata persistence fails

Evidence:

- `src/hooks/useAdNode.ts:113-120` saves campaign metadata after the on-chain tx
- `src/hooks/useAdNode.ts:307-334` uses metadata for title, description, and advertiser ownership
- `src/pages/HosterDashboard.tsx:19` decides ownership from `campaign.advertiser`
- `src/pages/DeveloperDashboard.tsx:41` decides owned slots from off-chain slot metadata

Impact:

- a successful on-chain campaign can fail to appear in the hoster dashboard
- a successful on-chain slot can fail to appear in the developer dashboard
- partial failures create confusing "phantom" on-chain state

Blunt version:

The app does not truly treat chain state as source of truth.

## High Severity Findings

### P1. Environment readiness is misreported

Evidence:

- `src/lib/contract-client.ts:12-13` hardcodes default contract addresses
- `src/hooks/useAdNode.ts:25` sets `isConfigured` from truthy addresses

Impact:

- the app says it is configured even when the deployment is stale or wrong
- warning banners and disabled states are unreliable

### P1. Mutation flows do not refresh query state

Evidence:

- campaign creation, slot creation, and slot assignment in `src/hooks/useAdNode.ts:62-187` perform writes
- there is no query invalidation after those writes

Impact:

- users create data and do not see it until reload
- the app feels broken right after success

### P1. Public upload and assistant endpoints can burn your paid quotas

Evidence:

- `api/uploads/creative.ts:21-25` uploads directly to Pinata with no auth or rate limits
- `server/pinata.ts:54-89` uses platform credentials for any caller
- `api/assistant.ts:26-42` proxies prompts to Groq with no auth or rate limits

Impact:

- anyone can drain storage and API spend
- this becomes a griefing endpoint the moment the URL is public

### P1. Product metrics are fabricated or misleading

Evidence:

- `src/hooks/useAdNode.ts:354-357` returns `totalVerifiedTransactions: 1`
- the marketing copy repeatedly claims escrow-backed funding, verified performance, and commercial-grade control

Impact:

- credibility dies the second a serious user looks closely

## Medium Severity Findings

### P2. Token/unit language is inconsistent

Evidence:

- `src/components/dashboard/CampaignForm.tsx:100` and `src/components/dashboard/CampaignForm.tsx:116` label amounts as `MAS`
- `src/lib/contract-client.ts:99-100` uses `parseEther`
- `src/components/dashboard/CampaignCard.tsx:75` displays decrypted budget as `ETH`
- `src/pages/DeveloperDashboard.tsx:213` displays earnings as `ETH`

Impact:

- users do not know what unit they are funding, bidding, or earning in
- this is small technically and huge psychologically

### P2. Public campaign loading does not degrade gracefully

Evidence:

- `src/hooks/useAdNode.ts:307` requires metadata fetch before reading campaigns on-chain
- if the metadata API fails, campaign browsing fails harder than it should

Impact:

- the marketplace is more brittle than the chain itself

### P2. The client-side read path will not scale

Evidence:

- `src/hooks/useAdNode.ts:308-336` reads `nextCampaignId` then loops through every campaign with per-id contract reads
- `server/public-campaigns.ts:53-68` probes asset URLs on demand with `HEAD`

Impact:

- load time will degrade with growth
- embed latency depends on third-party asset behavior

### P2. Local browser identity is not wallet-scoped

Evidence:

- `src/context/AuthContext.tsx:24-47` stores role and profile in plain localStorage keys

Impact:

- switching wallets can inherit the wrong role/profile
- multi-account behavior is messy and untrustworthy

## Product Reality Check

What is genuinely working:

- wallet connection
- basic contract deployment
- encrypted budget and CPC submission
- owner-side decryption for stored values
- campaign and slot metadata persistence when the API behaves
- public creative embedding

What is still missing before this becomes a real Fhenix product:

- enforced ad serving from slot identity, not campaign id
- trustworthy impression and click collection
- campaign funding escrow and spend logic
- payout accrual tied to measured events
- withdrawal and settlement flows
- authenticated API writes
- an indexer or sync layer that treats chain state as primary
- abuse controls, moderation, and fraud prevention
- honest product copy that only claims what is live

## How To Make It Real In Fhenix

### Phase 1. Fix the trust model

- make slot identity first-class in the embed API
- require signed publisher authorization for slot registration and assignment writes
- treat chain state as source of truth and use off-chain storage only for enrichments
- remove or rewrite any copy that claims escrow, fair auction, or verifiable payouts before they exist

### Phase 2. Build the actual marketplace primitive

- campaigns must lock funds on creation or via explicit top-up transactions
- assignment should be slot-based and enforceable by the serving layer
- impressions and clicks need signed or attested reporting into a measurement service
- payouts must derive from measured events and decrement campaign balances

### Phase 3. Make Fhenix the unfair advantage

- keep bid, budget, and payout logic encrypted
- expose only public creative and high-level category metadata
- use FHE where confidentiality changes market behavior, not just as branding
- the killer story is not "we used FHE"; it is "advertisers can compete without leaking strategy"

### Phase 4. Make it operable

- add admin tooling for fraud review, campaign approval, and abuse response
- rate-limit and authenticate every costly endpoint
- add observability, event indexing, retries, and reconciliation jobs
- test real user journeys, not just deployment

## Suggested Immediate Priority Order

1. Replace campaign-id embed snippets with slot-based signed embeds.
2. Add auth to metadata, upload, and assistant endpoints.
3. Make chain state authoritative for ownership and listings.
4. Implement real funding and payout settlement logic.
5. Wire impression and click measurement into an actual reporting pipeline.
6. Remove fake metrics and overclaiming copy.
7. Add query invalidation and resilience fixes so the UI stops feeling flaky.

## Testing Notes

What I verified:

- `npm run build` passed
- `npx hardhat test` passed

Why that is not comforting:

- the contract test only checks deployment
- there are no tests for campaign funding, analytics, assignment, payout, auth, or embed integrity

## Final Assessment

AdNode has a presentable shell and a real Fhenix direction, but the current implementation is still pre-product.

The biggest issue is not styling, code quality, or even missing features. The biggest issue is truth. The app currently says "marketplace", "escrow", "verified performance", and "commercial-grade" long before the architecture earns those words.

If you tighten the claims, fix the trust boundaries, and make serving plus settlement real, this can become a serious Fhenix-native product. If you keep polishing the surface without fixing the trust model, it will stay a demo no matter how good it looks.
