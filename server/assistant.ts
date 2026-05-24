import { getCampaigns } from "./campaign-store.js";
import { getSlots } from "./slot-store.js";
import { adRegistryAddress, getRegistryChainHealth, serverPublicClient } from "./chain-state.js";
import { connectDatabase } from "./db.js";
import { MeasurementModel } from "./models/Measurement.js";
import adRegistryAbi from "../lib/abi/registry-abi.json" with { type: "json" };
import { formatEther } from "viem";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

const FAQ_ENTRIES: Array<{
  test: (normalized: string) => boolean;
  reply: string;
}> = [
  {
    test: (text) => text.includes("what is adnode"),
    reply:
      "**Introduction to AdNode**\nAdNode runs on Fhenix Arbitrum Sepolia with CoFHE.\n\n**Roles**\n- **Hoster**: advertiser, funds campaigns.\n- **Developer**: publisher, earns from ad placements.",
  },
  {
    test: (text) => text.includes("what problem does adnode solve") || (text.includes("problem") && text.includes("adnode")),
    reply:
      "Transparent blockchains expose campaign budgets, payout terms, and performance in real time. AdNode fixes that by encrypting financial data before it reaches the chain, so contracts can compute on it without exposing strategy.",
  },
  {
    test: (text) => text.includes("what is fhe"),
    reply:
      "FHE means Fully Homomorphic Encryption. It lets AdNode compute on encrypted values like budgets, campaign rates, impressions, clicks, and earnings without decrypting them on-chain.",
  },
  {
    test: (text) => text.includes("who can see my campaign budget") || (text.includes("see my budget") && text.includes("campaign")),
    reply:
      "Only you can view your campaign budget. It is encrypted in the browser, stored encrypted on-chain, and later decrypted with your own wallet permit.",
  },
  {
    test: (text) => text.includes("what data is public"),
    reply:
      "Public data is limited to the creative URI, category, and slot metadata such as site name. Financial values like budget, CPC, impressions, clicks, and earnings stay encrypted.",
  },
  {
    test: (text) =>
      (text.includes("cpc") || text.includes("cpm") || text.includes("cost per click") || text.includes("cost per mille") || text.includes("metrics")) &&
      (text.includes("adnode") || text.includes("campaign") || text.includes("settlement")),
    reply:
      "In AdNode, **CPC** and **CPM** are the on-chain settlement models:\n- **CPC**: hoster pays a fixed wei rate per *click*.\n- **CPM**: hoster pays a fixed wei rate per *1,000 impressions*.\nThe rate is public (shown in ETH), while budgets/bids/earnings stay encrypted.",
  },
  {
    test: (text) => text.includes("what blockchain is adnode on") || (text.includes("which blockchain") && text.includes("adnode")),
    reply:
      "AdNode is built for Fhenix on Arbitrum Sepolia using the CoFHE stack, so it stays EVM-compatible while supporting encrypted computation.",
  },
  {
    test: (text) => text.includes("special wallet") || text.includes("do i need a special wallet"),
    reply:
      "No. A standard EVM wallet like MetaMask works. You just need to connect on Arbitrum Sepolia.",
  },
  {
    test: (text) =>
      text.includes("how do publishers earn") ||
      text.includes("how do developers earn") ||
      (text.includes("who earns") && text.includes("ad placements")),
    reply:
      "Developers are the publishers on AdNode. They earn by registering placements (slots), requesting access to campaigns, and serving approved campaigns in those placements. Payouts become claimable after the settlement service books delivery from the campaign budget.",
  },
  {
    test: (text) => text.includes("how do i add an ad creative") || (text.includes("add") && text.includes("creative")),
    reply:
      "Upload an image or MP4 creative through AdNode or paste a public creative URL. Uploaded creatives are pinned to IPFS and stored as an `ipfs://` campaign creative URI.",
  },
  {
    test: (text) => text.includes("open source"),
    reply: "Yes. The frontend and contracts are intended to be open source and reviewable on GitHub.",
  },
];

function normalizePrompt(prompt: string) {
  return prompt.toLowerCase().replace(/\s+/g, " ").trim();
}

function getFaqReply(prompt: string) {
  const normalized = normalizePrompt(prompt);
  return FAQ_ENTRIES.find((entry) => entry.test(normalized))?.reply ?? null;
}

function isVaguePrompt(normalized: string) {
  return /^(hi|hello|hey|yo|sup|everything|help|start|status|account|overview|dashboard|what now|next)$/i.test(normalized);
}

function wantsAccountData(normalized: string) {
  return (
    isVaguePrompt(normalized) ||
    /\b(credit|fund|funds|balance|spend|spent|withdraw|claim|claimable|earning|earnings|payout|campaign|slot|approval|approved|serving|settlement|pending|profile|account|next)\b/.test(
      normalized,
    )
  );
}

async function safeRead<T>(fallback: T, fn: () => Promise<T>) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function readCampaignFunding(chainCampaignId: string) {
  if (!adRegistryAddress || !/^\d+$/.test(chainCampaignId)) return null;
  const registryAddress = adRegistryAddress;
  return safeRead(null, async () => {
    const [availableFunds, totalFunded, totalSettled] = (await serverPublicClient.readContract({
      address: registryAddress,
      abi: adRegistryAbi as any,
      functionName: "getCampaignFunding",
      args: [BigInt(chainCampaignId)],
    })) as [bigint, bigint, bigint];
    const active = (await serverPublicClient.readContract({
      address: registryAddress,
      abi: adRegistryAbi as any,
      functionName: "isCampaignActive",
      args: [BigInt(chainCampaignId)],
    })) as boolean;
    return {
      availableFunds,
      totalFunded,
      totalSettled,
      active,
    };
  });
}

async function readClaimableEarnings(address: string) {
  if (!adRegistryAddress) return 0n;
  const registryAddress = adRegistryAddress;
  return safeRead(0n, async () => {
    return (await serverPublicClient.readContract({
      address: registryAddress,
      abi: adRegistryAbi as any,
      functionName: "claimableEarnings",
      args: [address as `0x${string}`],
    })) as bigint;
  });
}

async function readAccessStatus(chainCampaignId: string, chainSlotId: string) {
  if (!adRegistryAddress || !/^\d+$/.test(chainCampaignId) || !/^\d+$/.test(chainSlotId)) return "unknown";
  const registryAddress = adRegistryAddress;
  const status = await safeRead(-1, async () => {
    return Number(
      await serverPublicClient.readContract({
        address: registryAddress,
        abi: adRegistryAbi as any,
        functionName: "accessStatus",
        args: [BigInt(chainCampaignId), BigInt(chainSlotId)],
      }),
    );
  });
  return ["None", "Requested", "Approved", "Denied", "Revoked"][status] ?? "unknown";
}

async function getMeasurementSummary(campaignIds: string[], slotIds: string[]) {
  try {
    await connectDatabase();
    const query = {
      $or: [{ chainCampaignId: { $in: campaignIds } }, { chainSlotId: { $in: slotIds } }],
    };
    const [pending, settled, review] = await Promise.all([
      MeasurementModel.countDocuments({ ...query, status: { $in: ["accepted", "pending_chain"] } }),
      MeasurementModel.countDocuments({ ...query, status: "settled" }),
      MeasurementModel.countDocuments({ ...query, status: { $in: ["review", "rejected"] } }),
    ]);
    return { pending, settled, review };
  } catch {
    return { pending: 0, settled: 0, review: 0 };
  }
}

function eth(value: bigint) {
  return `${formatEther(value)} ETH`;
}

async function getAccountAgentReply(prompt: string, address: string) {
  const normalized = normalizePrompt(prompt);
  if (!wantsAccountData(normalized)) return null;

  const wallet = address.toLowerCase();
  const [allCampaigns, allSlots, claimable] = await Promise.all([getCampaigns(), getSlots(), readClaimableEarnings(wallet)]);
  const campaigns = ((Array.isArray(allCampaigns) ? allCampaigns : []) as Array<Record<string, unknown>>).filter(
    (campaign) => String(campaign.advertiser ?? "").toLowerCase() === wallet,
  );
  const slots = ((Array.isArray(allSlots) ? allSlots : []) as Array<Record<string, unknown>>).filter(
    (slot) => String(slot.developer ?? "").toLowerCase() === wallet,
  );

  const campaignIds = campaigns.map((campaign) => String(campaign.chainCampaignId ?? "")).filter(Boolean);
  const slotIds = slots.map((slot) => String(slot.chainSlotId ?? "")).filter(Boolean);
  const [fundingRows, measurementSummary] = await Promise.all([
    Promise.all(campaignIds.slice(0, 8).map((id) => readCampaignFunding(id).then((funding) => ({ id, funding })))),
    getMeasurementSummary(campaignIds, slotIds),
  ]);

  const totalAvailable = fundingRows.reduce((sum, row) => sum + (row.funding?.availableFunds ?? 0n), 0n);
  const totalFunded = fundingRows.reduce((sum, row) => sum + (row.funding?.totalFunded ?? 0n), 0n);
  const totalSettled = fundingRows.reduce((sum, row) => sum + (row.funding?.totalSettled ?? 0n), 0n);
  const activeCampaigns = fundingRows.filter((row) => row.funding?.active).length;
  const assignedSlots = slots.filter((slot) => String(slot.assignedCampaignId ?? "").trim()).length;

  if (normalized.includes("withdraw") || normalized.includes("claim") || normalized.includes("earning") || normalized.includes("payout")) {
    return {
      reply: [
        `**Withdraw status**`,
        `Claimable publisher earnings: ${eth(claimable)}.`,
        `Advertiser funds still available across your indexed campaigns: ${eth(totalAvailable)}.`,
        claimable > 0n ? "You can withdraw publisher earnings from Studio > Publisher > Earnings." : "No publisher earnings are claimable right now.",
        totalAvailable > 0n ? "To withdraw unspent advertiser funds, pause the campaign first, then withdraw from the campaign detail page." : null,
      ]
        .filter(Boolean)
        .join("\n"),
      model: "AdNode Account Agent",
    };
  }

  if (normalized.includes("credit") || normalized.includes("fund") || normalized.includes("balance") || normalized.includes("spend") || normalized.includes("spent")) {
    return {
      reply: [
        `**Campaign funds**`,
        `Available: ${eth(totalAvailable)}.`,
        `Total funded: ${eth(totalFunded)}.`,
        `Total settled/spent: ${eth(totalSettled)}.`,
        `Indexed campaigns owned by this wallet: ${campaigns.length}. Active on-chain in the checked set: ${activeCampaigns}.`,
      ].join("\n"),
      model: "AdNode Account Agent",
    };
  }

  if (normalized.includes("slot") || normalized.includes("approval") || normalized.includes("approved") || normalized.includes("serving")) {
    const rows = await Promise.all(
      slots.slice(0, 5).map(async (slot) => {
        const slotId = String(slot.chainSlotId ?? "");
        const campaignId = String(slot.assignedCampaignId ?? "");
        const access = campaignId ? await readAccessStatus(campaignId, slotId) : "not assigned";
        return `Slot #${slotId || "?"}: ${String(slot.siteName ?? "Untitled")} | assigned campaign: ${campaignId || "none"} | access: ${access}`;
      }),
    );
    return {
      reply: [`**Publisher slots**`, `Owned slots: ${slots.length}. Assigned slots: ${assignedSlots}.`, ...rows].join("\n"),
      model: "AdNode Account Agent",
    };
  }

  const nextActions: string[] = [];
  if (!campaigns.length) nextActions.push("Create and fund a campaign if you are advertising.");
  if (!slots.length) nextActions.push("Register a publisher slot if you want to earn.");
  if (campaigns.length && activeCampaigns === 0) nextActions.push("Resume or fund one campaign so it can serve.");
  if (slots.length && assignedSlots === 0) nextActions.push("Request approval and assign a campaign to one slot.");
  if (claimable > 0n) nextActions.push("Withdraw claimable publisher earnings.");
  if (!nextActions.length) nextActions.push("Monitor settlement and keep campaigns funded.");

  return {
    reply: [
      `**Account status**`,
      `Wallet: ${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
      `Campaigns: ${campaigns.length} (${activeCampaigns} active in the checked set).`,
      `Campaign funds available: ${eth(totalAvailable)}. Settled/spent: ${eth(totalSettled)}.`,
      `Publisher slots: ${slots.length} (${assignedSlots} assigned).`,
      `Claimable earnings: ${eth(claimable)}.`,
      `Measurements: ${measurementSummary.pending} pending, ${measurementSummary.settled} settled, ${measurementSummary.review} review/rejected.`,
      `Next: ${nextActions[0]}`,
    ].join("\n"),
    model: "AdNode Account Agent",
  };
}

async function getDataReply(prompt: string) {
  const normalized = normalizePrompt(prompt);

  const asksCampaigns =
    normalized.includes("campaign") &&
    (normalized.includes("any") || normalized.includes("list") || normalized.includes("show") || normalized.includes("exists") || normalized.includes("available"));

  const asksSlots =
    normalized.includes("slot") &&
    (normalized.includes("any") || normalized.includes("list") || normalized.includes("show") || normalized.includes("exists"));

  const asksHealth = normalized.includes("health") || normalized.includes("status") || normalized.includes("rpc");

  if (!asksCampaigns && !asksSlots && !asksHealth) return null;

  const [campaigns, slots, health] = await Promise.all([
    asksCampaigns ? getCampaigns() : Promise.resolve([]),
    asksSlots ? getSlots() : Promise.resolve([]),
    asksHealth ? getRegistryChainHealth() : Promise.resolve(null),
  ]);

  if (asksHealth && health) {
    return {
      reply: [
        `**Network status**`,
        `- chainId: \`${health.chainId}\``,
        `- registry configured: \`${health.registryConfigured}\``,
        `- RPC reads ok: \`${health.chainReadOk}\``,
        health.blockNumber ? `- latest block: \`${health.blockNumber}\`` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      model: "AdNode Live Data",
    };
  }

  if (asksCampaigns) {
    const rows = (Array.isArray(campaigns) ? campaigns : []) as Array<Record<string, unknown>>;
    const top = rows
      .slice()
      .sort((a, b) => Number(String(b.chainCampaignId ?? 0)) - Number(String(a.chainCampaignId ?? 0)))
      .slice(0, 5);
    const ids = top
      .map((r) => {
        const id = String(r.chainCampaignId ?? "").trim();
        if (!id) return "";
        const title = String(r.title ?? "").trim();
        return title ? `${title} (#${id})` : `Campaign #${id}`;
      })
      .filter(Boolean);
    return {
      reply:
        rows.length === 0
          ? "No campaigns are in the API store yet. Create a campaign in Studio and it will show up here."
          : `Yes — **${rows.length}** campaign(s) are listed. Latest ids: ${ids.map((id) => `**${id}**`).join(", ")}.`,
      model: "AdNode Live Data",
    };
  }

  if (asksSlots) {
    const rows = (Array.isArray(slots) ? slots : []) as Array<Record<string, unknown>>;
    const top = rows
      .slice()
      .sort((a, b) => Number(String(b.chainSlotId ?? 0)) - Number(String(a.chainSlotId ?? 0)))
      .slice(0, 5);
    const ids = top
      .map((r) => {
        const id = String(r.chainSlotId ?? "").trim();
        if (!id) return "";
        const name = String(r.siteName ?? "").trim();
        const slotKey = String(r.slotKey ?? "").trim();
        return `${name || `Placement #${id}`}${slotKey ? ` (${slotKey})` : ""}`;
      })
      .filter(Boolean);
    return {
      reply:
        rows.length === 0
          ? "No slots are in the API store yet. Register a slot in Publisher and it will show up here."
          : `Yes — **${rows.length}** slot(s) are listed. Latest ids: ${ids.map((id) => `**${id}**`).join(", ")}.`,
      model: "AdNode Live Data",
    };
  }

  return null;
}

function sanitizeHistory(history: AssistantMessage[]) {
  return history
    .filter((message) => message && (message.role === "user" || message.role === "assistant") && message.content.trim())
    .slice(-8)
    .map((message) => ({ role: message.role, content: message.content.trim() }));
}

async function getGroqReply(prompt: string, history: AssistantMessage[], apiKey: string, model: string) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: [
            "You are the AdNode AI assistant.",
            "Do not give generic introductions for vague prompts like hi, hello, help, or everything.",
            "For vague prompts, ask the user to connect/sign their wallet so you can inspect their account.",
            "Use AdNode terminology exactly.",
            "Hoster means advertiser.",
            "Developer means publisher.",
            "Developers earn from ad placements. Hosters fund campaigns.",
            "AdNode runs on Fhenix Arbitrum Sepolia with CoFHE.",
            "Public data: creative URI, category, slot metadata.",
            "Encrypted data: budget, CPC, impressions, clicks, earnings.",
            "Never say publishers are Hosters.",
            "Never invent features that are not confirmed.",
            "Answer in plain text.",
            "Use **bold** for section titles; do not use markdown headings (#, ##, ###).",
            "Lists are ok, keep them short.",
            "Keep answers under 160 words unless the user explicitly asks for detail.",
          ].join(" "),
        },
        ...sanitizeHistory(history),
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_completion_tokens: 220,
    }),
  });

  if (!response.ok) {
    throw new Error("Groq request failed.");
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  return {
    reply: completion.choices?.[0]?.message?.content?.trim() ?? "",
    model: completion.model ?? model,
  };
}

function polishAssistantText(text: string) {
  let out = text;
  // Fix common mojibake from mixed encodings.
  out = out.replace(/â€”/g, "—");
  out = out.replace(/â†’/g, "→");
  out = out.replace(/â€œ/g, "\"");
  out = out.replace(/â€/g, "\"");
  out = out.replace(/Â·/g, "·");

  // Replace markdown headings with bold titles (the UI doesn't need #/###).
  out = out.replace(/^#{1,6}\s+(.+)$/gm, (_match, title: string) => `**${String(title).trim()}**`);

  // Normalize list bullets.
  out = out.replace(/^\*\s+/gm, "- ");

  // Transaction hash formatting: never prefix with #, show a bold label instead.
  out = out.replace(/#(0x[a-fA-F0-9]{64})/g, "$1");
  out = out.replace(/\bhash:\s*(0x[a-fA-F0-9]{64})/gi, "**Tx:** $1");
  out = out.replace(/\btx hash:\s*(0x[a-fA-F0-9]{64})/gi, "**Tx:** $1");
  out = out.replace(/\btransaction hash:\s*(0x[a-fA-F0-9]{64})/gi, "**Tx:** $1");
  return out.trim();
}

export async function getAssistantReply(prompt: string, history: AssistantMessage[] = []) {
  const normalized = normalizePrompt(prompt);
  if (isVaguePrompt(normalized)) {
    return {
      reply: "Connect and sign your wallet so I can check your campaigns, slots, approvals, funds, settlements, and claimable earnings.",
      model: "AdNode Account Agent",
    };
  }

  const faqReply = getFaqReply(prompt);
  if (faqReply) {
    return { reply: polishAssistantText(faqReply), model: "AdNode FAQ" };
  }

  const dataReply = await getDataReply(prompt);
  if (dataReply) return { ...dataReply, reply: polishAssistantText(dataReply.reply) };

  if (wantsAccountData(normalized)) {
    return {
      reply: "Connect and sign your wallet so I can check your real account data. Without a wallet I can only answer public AdNode docs questions.",
      model: "AdNode Account Agent",
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq assistant is not configured yet.");
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const groq = await getGroqReply(prompt, history, apiKey, model);
  return { ...groq, reply: polishAssistantText(groq.reply) };
}

export async function getAccountAssistantReply(prompt: string, history: AssistantMessage[] = [], address: string) {
  const accountReply = await getAccountAgentReply(prompt, address);
  if (accountReply) return { ...accountReply, reply: polishAssistantText(accountReply.reply) };
  return getAssistantReply(prompt, history);
}
