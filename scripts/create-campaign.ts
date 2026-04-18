import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { Encryptable } from "@cofhe/sdk";
import { arbSepolia } from "@cofhe/sdk/chains";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Abi,
  type Address,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { waitForTransactionReceipt } from "viem/actions";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v.trim();
}

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.findIndex((x) => x === `--${name}`);
  if (idx === -1) return fallback;
  const v = process.argv[idx + 1];
  if (!v) throw new Error(`Missing value for --${name}`);
  return v;
}

async function main() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ||
    process.env.ARBITRUM_SEPOLIA_RPC_URL ||
    process.env.VITE_FHENIX_RPC_URL;
  if (!rpcUrl) throw new Error("Set NEXT_PUBLIC_RPC_URL (or ARBITRUM_SEPOLIA_RPC_URL).");

  const registryAddress = (process.env.NEXT_PUBLIC_AD_REGISTRY_ADDRESS ||
    process.env.VITE_ADREGISTRY_ADDRESS) as Address | undefined;
  if (!registryAddress) throw new Error("Set NEXT_PUBLIC_AD_REGISTRY_ADDRESS.");

  const privateKeyRaw = env("PRIVATE_KEY");
  const privateKey = (privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const creativeUri = parseArg("creative", "https://picsum.photos/seed/adnode-demo/800/400");
  const category = parseArg("category", "news");
  const rateEth = parseArg("rate", "0.0001");
  const budgetEth = parseArg("budget", "0.01");
  const cpcUint32 = parseArg("cpc", "1000000");
  const fundEth = parseArg("fund", "0.01");

  const settlementRateWei = parseEther(rateEth);
  const budgetWei = parseEther(budgetEth);
  const cpcBi = BigInt(cpcUint32);
  const fundValue = parseEther(fundEth);

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
    account,
  });

  const abiPath = path.join(process.cwd(), "lib", "abi", "registry-abi.json");
  const abi = JSON.parse(fs.readFileSync(abiPath, "utf8")) as Abi;

  const cofhe = createCofheClient(createCofheConfig({ supportedChains: [arbSepolia] }));
  await cofhe.connect(publicClient, walletClient);

  const [encBudget, encCpc] = await cofhe
    .encryptInputs([Encryptable.uint64(budgetWei), Encryptable.uint32(cpcBi)])
    .setAccount(account.address)
    .setChainId(arbitrumSepolia.id)
    .execute();

  const hash = await walletClient.writeContract({
    address: registryAddress,
    abi,
    functionName: "createCampaign",
    args: [creativeUri, category, encBudget, encCpc, 1, settlementRateWei],
    value: fundValue,
  });

  const receipt = await waitForTransactionReceipt(publicClient, { hash });
  const nextId = (await publicClient.readContract({
    address: registryAddress,
    abi,
    functionName: "nextCampaignId",
  })) as bigint;

  const createdId = nextId - 1n;
  console.log(
    JSON.stringify(
      {
        account: account.address,
        registry: registryAddress,
        txHash: hash,
        status: receipt.status,
        campaignId: createdId.toString(),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
