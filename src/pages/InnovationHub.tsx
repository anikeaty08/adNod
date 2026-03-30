import { SectionBadge } from "@/components/shared/SectionBadge";

const faqs = [
  {
    question: "What is AdNode?",
    answer:
      "A decentralized advertising network where campaign budgets, bids, and analytics are fully encrypted on-chain. Nobody sees your strategy except you.",
  },
  {
    question: "What problem does AdNode solve?",
    answer:
      "On transparent blockchains your entire ad strategy is public. Competitors see your budget, bids, and performance in real time. AdNode fixes this cryptographically by sealing all financial data with FHE before it touches the chain.",
  },
  {
    question: "What is FHE?",
    answer:
      "Fully Homomorphic Encryption. It lets smart contracts compute on encrypted data without ever decrypting it, so you keep blockchain guarantees without exposing financial strategy.",
  },
  {
    question: "Who can see my campaign budget?",
    answer:
      "Only you. Budgets are encrypted before leaving your browser, remain encrypted on-chain, and are decrypted only when your wallet requests access.",
  },
  {
    question: "Can competitors see my bids?",
    answer:
      "No. Bids are encrypted at submission and intended to resolve through encrypted comparisons, so losing bids are not publicly revealed.",
  },
  {
    question: "What data is actually public?",
    answer:
      "Only the ad creative and campaign category are public. Financial data such as budget, CPC, impressions, clicks, and earnings stays sealed on-chain.",
  },
  {
    question: "What blockchain is AdNode on?",
    answer: "Fhenix on Arbitrum Sepolia, using the CoFHE stack for encrypted EVM-compatible contract logic.",
  },
  {
    question: "Do I need a special wallet?",
    answer: "No. A standard EVM wallet like MetaMask works as long as you switch to Arbitrum Sepolia.",
  },
  {
    question: "How do publishers earn?",
    answer:
      "Publisher earnings are tracked as encrypted on-chain values. Developers decrypt their own earnings with their wallet when they want to inspect them.",
  },
  {
    question: "How do I add an ad creative?",
    answer:
      "Upload an image or video file directly or paste a URL. AdNode pins supported uploads to IPFS and stores the resulting `ipfs://` URI with the campaign.",
  },
  {
    question: "Is the auction fair?",
    answer:
      "The platform is designed around sealed FHE bids so front-running and bid sniping are prevented by encrypted comparisons instead of public bid disclosure.",
  },
  {
    question: "Is AdNode open source?",
    answer: "Yes. The contracts and frontend live in the AdNode GitHub repository.",
  },
];

export function InnovationHub() {
  return (
    <section className="page-shell py-12 sm:py-16">
      <SectionBadge>AdNode platform</SectionBadge>
      <h1 className="mt-5 font-display text-4xl font-semibold">A real workspace for decentralized advertising operations.</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        AdNode is built to help Hosters launch funded campaigns and help Developers monetize placements through a cleaner,
        blockchain-native workflow that feels like a commercial SaaS product.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Role-based onboarding",
            description: "Every user chooses whether they are joining AdNode as a Hoster or a Developer, then completes a profile before entering the workspace.",
          },
          {
            title: "Campaign funding flow",
            description: "Hosters create campaigns, define budgets and pricing, and prepare listings for publisher distribution through the platform.",
          },
          {
            title: "Publisher-ready delivery",
            description: "Developers browse active campaigns, copy integration snippets, and manage monetization from one dedicated dashboard.",
          },
        ].map((card) => (
          <div key={card.title} className="glass-panel rounded-[28px] p-6">
            <h3 className="mt-1 font-display text-2xl font-semibold">{card.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{card.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-[32px] p-7">
          <h3 className="font-display text-2xl font-semibold">For Hosters</h3>
          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <p>Create ad campaigns with title, description, creative link, budget, and pricing model.</p>
            <p>Manage campaign state from a dedicated dashboard designed around visibility and control.</p>
            <p>Track what is live in the marketplace instead of juggling campaign data across separate tools.</p>
            <p>Move from wallet connection to profile setup to campaign publishing in a single flow.</p>
          </div>
        </div>
        <div className="glass-panel rounded-[32px] p-7">
          <h3 className="font-display text-2xl font-semibold">For Developers</h3>
          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <p>Browse the available campaign marketplace without fake data crowding the workspace.</p>
            <p>Use multi-framework snippets to place AdNode inventory inside apps, websites, or dApps.</p>
            <p>Keep wallet-based identity, profile type, and publishing flow aligned inside one interface.</p>
            <p>See only meaningful states: live listings, empty states, and role-specific actions.</p>
          </div>
        </div>
      </div>
      <div className="mt-8 grid gap-4">
        {faqs.map((item) => (
          <div key={item.question} className="glass-panel rounded-[28px] p-6">
            <h3 className="font-display text-xl font-semibold">{item.question}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
