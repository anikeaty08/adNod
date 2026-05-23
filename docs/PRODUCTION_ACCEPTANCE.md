# AdNode Production Acceptance

## Implemented Controls

- Canonical network/deployment selection for Arbitrum Sepolia and Fhenix Helium.
- Zero-address deployment rejection in strict mode.
- Non-replayable event and settlement identifiers in analytics/registry contracts.
- Measurement tokens bound to campaign, slot, slot key, publisher origin, page URL hash, session id, expiry, and nonce.
- Server-side measurement nonce replay rejection.
- Billable gating for suspicious traffic before settlement replay.
- Settlement replay worker for standalone runtime and Vercel cron endpoint for hosted runtime.
- Signed wallet auth with nonce replay rejection.
- Role gates for settlement replay, metrics, and admin access-list APIs.
- Upload auth before multipart parsing, with type, size, and per-wallet quota checks.
- Chain-backed slot inventory sync with cursor state.
- Admin dashboard for access review and on-chain approve/deny/revoke operations.
- Advertiser campaign detail controls for top-up, pause/resume, and withdrawal after pause.
- Publisher placement lists filtered to the connected wallet.
- Mongo indexes for campaigns, slots, measurements, nonces, sync cursors, settlement state, and uploads.
- Structured logs and in-memory metrics surface for operational visibility.
- Runbooks for deploy, verify, key rotation, settlement pause/replay, DB recovery, and network switching.

## Verification Commands

- `npm run test:server`
- `npm run test:contracts`
- `npx tsc --noEmit`
- `npm run build`

## Required Production Configuration

- `MONGO_URI`
- `ADNODE_EMBED_SECRET`
- `CRON_SECRET` or `ADNODE_SETTLEMENT_CRON_SECRET`
- `ADNODE_ADMIN_ADDRESSES`
- `ADNODE_SETTLEMENT_OPERATOR_ADDRESSES`
- `SETTLEMENT_PRIVATE_KEY`
- Pinata credentials
- Groq credentials if assistant features are enabled
- Network key, chain id, RPC URL, and matching contract addresses

## Operational Caveats

- Vercel cron must send `Authorization: Bearer <CRON_SECRET>` to `/api/settlement-worker`.
- Contract ABIs changed; redeploy contracts before using the new non-replayable settlement path on a fresh network.
- Exposed secrets must be rotated before production use.
