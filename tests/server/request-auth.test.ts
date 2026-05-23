import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import { buildAdnodeAuthMessage } from "../../lib/adnode-auth.js";
import { assertSignedRequest } from "../../server/request-auth.js";
import { ARBITRUM_SEPOLIA_CHAIN_ID } from "../../server/runtime.js";

process.env.ADNODE_STRICT_MODE = "false";
process.env.VITE_CHAIN_ID = String(ARBITRUM_SEPOLIA_CHAIN_ID);
process.env.NEXT_PUBLIC_CHAIN_ID = String(ARBITRUM_SEPOLIA_CHAIN_ID);

test("signed API authorization rejects nonce replay", async () => {
  const account = privateKeyToAccount("0x0000000000000000000000000000000000000000000000000000000000000001");
  const action = "assistant:ask";
  const payload = { prompt: "hello", history: [] };
  const timestamp = String(Date.now());
  const nonce = "test_nonce_replay_123";
  const chainId = String(ARBITRUM_SEPOLIA_CHAIN_ID);
  const message = buildAdnodeAuthMessage(action, account.address, timestamp, payload, nonce, chainId);
  const signature = await account.signMessage({ message });
  const headers = {
    "x-adnode-action": action,
    "x-adnode-chain-id": chainId,
    "x-adnode-address": account.address,
    "x-adnode-timestamp": timestamp,
    "x-adnode-nonce": nonce,
    "x-adnode-signature": signature,
  };

  const signer = await assertSignedRequest(headers, action, payload);
  assert.equal(signer, account.address.toLowerCase());
  await assert.rejects(() => assertSignedRequest(headers, action, payload), /nonce already used/i);
});
