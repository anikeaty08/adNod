export function displayCampaignTitle(input: { title?: string | null; chainCampaignId?: string | number | null }) {
  const id = input.chainCampaignId != null ? String(input.chainCampaignId) : "";
  const raw = (input.title ?? "").trim();
  if (!raw) return "Untitled campaign";
  if (id && raw === `Campaign #${id}`) return "Untitled campaign";
  if (/^Campaign #\d+$/.test(raw)) return "Untitled campaign";
  return raw;
}

