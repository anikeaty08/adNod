# AdNode Operations Runbook

## Deploy

1. Set `ADNODE_NETWORK`, chain id, RPC URL, deployment addresses, `MONGO_URI`, `ADNODE_EMBED_SECRET`, `CRON_SECRET`, admin addresses, and settlement operator addresses.
2. Run `npm install`, `npm run build`, `npm run test:contracts`, and `npm run test:server`.
3. Deploy contracts with `npm run deploy:contracts` or `npm run deploy:helium`.
4. Verify `deployments/<network>.json` has `chainId`, addresses, deployer, block number, tx hashes, wrapped native token, explorer URL, and ABI version.
5. Redeploy the app and confirm `/api/health`.

## Verify

1. Confirm `/api/health` reports database and chain readiness.
2. Use an admin wallet to call `/api/ops/metrics`.
3. Create/fund a campaign, register a slot, approve access, assign, render an embed, record events, run `/api/settlement-worker`, and claim payout.

## Key Rotation

1. Rotate exposed wallet/API keys immediately if they appear in chat, logs, or issue trackers.
2. Update `PRIVATE_KEY`, `SETTLEMENT_PRIVATE_KEY`, Pinata keys, Groq key, `ADNODE_EMBED_SECRET`, and `CRON_SECRET`.
3. Update `ADNODE_SETTLEMENT_OPERATOR_ADDRESSES` and contract roles with the new settlement wallet before disabling the old one.
4. Redeploy and verify replay still settles pending measurements.

## Pause Settlement

1. Set `ADNODE_SETTLEMENT_WORKER_ENABLED=false` for the standalone worker or disable Vercel cron.
2. Remove settlement operator role on-chain if a private key is compromised.
3. Keep `/api/measure` online; events remain stored for later replay.

## Replay

1. Fix the underlying RPC/key/database issue.
2. Call `/api/settlement-replay` with a signed `settlement:replay` request from an authorized settlement/admin wallet, or trigger `/api/settlement-worker` with `Authorization: Bearer <CRON_SECRET>`.
3. Watch metrics: `settlement_success`, `settlement_failure`, duplicates, and review volume.

## DB Outage Recovery

1. In production, strict mode should stay enabled so measurement writes fail closed instead of falling back to memory.
2. Restore Mongo connectivity.
3. Run index bootstrap by starting the API or calling health.
4. Replay pending measurements.

## Network Switching

1. Update `ADNODE_NETWORK`, `VITE_ADNODE_NETWORK`, `NEXT_PUBLIC_ADNODE_NETWORK`, chain ids, RPC URLs, and deployment addresses together.
2. Confirm the selected deployment JSON is not zero-addressed.
3. Rebuild so Wagmi/RainbowKit and server clients use the same selected network.
