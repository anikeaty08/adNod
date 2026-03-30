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
      "AdNode is a decentralized advertising network on Fhenix Arbitrum Sepolia where campaign budgets, bids, analytics, and earnings stay encrypted on-chain with FHE. Only the creative URI and category are public.",
  },
  {
    test: (text) => text.includes("what problem does adnode solve") || (text.includes("problem") && text.includes("adnode")),
    reply:
      "Transparent blockchains expose budgets, bids, and performance in real time. AdNode fixes that by encrypting financial data before it reaches the chain, so contracts can compute on it without exposing strategy.",
  },
  {
    test: (text) => text.includes("what is fhe"),
    reply:
      "FHE means Fully Homomorphic Encryption. It lets AdNode compute on encrypted values like budgets, bids, impressions, clicks, and earnings without decrypting them on-chain.",
  },
  {
    test: (text) => text.includes("who can see my campaign budget") || (text.includes("see my budget") && text.includes("campaign")),
    reply:
      "Only you can view your campaign budget. It is encrypted in the browser, stored encrypted on-chain, and later decrypted with your own wallet permit.",
  },
  {
    test: (text) => text.includes("can competitors see my bids") || (text.includes("competitors") && text.includes("bids")),
    reply:
      "No. Bids are submitted as encrypted values, so competitors cannot inspect them. The intended auction flow compares encrypted values without revealing losing bids.",
  },
  {
    test: (text) => text.includes("what data is public"),
    reply:
      "Public data is limited to the creative URI, category, and slot metadata such as site name. Financial values like budget, CPC, impressions, clicks, and earnings stay encrypted.",
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
      "Developers are the publishers on AdNode. They earn by registering ad slots and serving campaigns in those placements. Their earnings are tracked on-chain as encrypted values, and only the developer can decrypt or withdraw them.",
  },
  {
    test: (text) => text.includes("how do i add an ad creative") || (text.includes("add") && text.includes("creative")),
    reply:
      "Upload an image or MP4 creative through AdNode or paste a public creative URL. Uploaded creatives are pinned to IPFS and stored as an `ipfs://` campaign creative URI.",
  },
  {
    test: (text) => text.includes("is the auction fair"),
    reply:
      "The intended design is a sealed auction where encrypted bids prevent front-running and bid snooping. If the live auction module is not enabled in the current build, AdNode should present it as coming soon rather than claim it is active.",
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
            "Use AdNode terminology exactly.",
            "Hoster means advertiser.",
            "Developer means publisher.",
            "Developers earn from ad placements. Hosters fund campaigns.",
            "AdNode runs on Fhenix Arbitrum Sepolia with CoFHE.",
            "Public data: creative URI, category, slot metadata.",
            "Encrypted data: budget, CPC, impressions, clicks, earnings.",
            "Never say publishers are Hosters.",
            "Never invent features that are not confirmed.",
            "Answer in concise markdown with short paragraphs.",
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

export async function getAssistantReply(prompt: string, history: AssistantMessage[] = []) {
  const faqReply = getFaqReply(prompt);
  if (faqReply) {
    return { reply: faqReply, model: "AdNode FAQ" };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Groq assistant is not configured yet.");
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  return getGroqReply(prompt, history, apiKey, model);
}
