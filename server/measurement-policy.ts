import crypto from "node:crypto";

export type FraudStatus = "clean" | "review" | "rejected";

export interface MeasurementPolicyInput {
  eventType: "impression" | "click";
  pageUrl: string;
  referrer: string;
  publisherOrigin: string;
  userAgent: string;
  remoteAddress: string;
}

const REVIEW_USER_AGENT_PATTERNS = [/bot/i, /crawler/i, /spider/i, /headless/i, /phantom/i, /selenium/i, /playwright/i];
const MAX_PAGE_URL_LENGTH = 2048;

export function evaluateMeasurementPolicy(input: MeasurementPolicyInput) {
  const reasons: string[] = [];
  let score = 0;

  if (!input.userAgent || REVIEW_USER_AGENT_PATTERNS.some((pattern) => pattern.test(input.userAgent))) {
    reasons.push("suspicious_user_agent");
    score += 60;
  }

  if (!input.pageUrl || input.pageUrl.length > MAX_PAGE_URL_LENGTH) {
    reasons.push("invalid_page_url");
    score += 40;
  }

  if (input.publisherOrigin) {
    try {
      const page = new URL(input.pageUrl);
      const origin = new URL(input.publisherOrigin);
      if (page.origin !== origin.origin) {
        reasons.push("publisher_origin_mismatch");
        score += 50;
      }
    } catch {
      reasons.push("invalid_origin_binding");
      score += 40;
    }
  }

  if (!input.remoteAddress) {
    reasons.push("missing_remote_address");
    score += 10;
  }

  const fraudStatus: FraudStatus = score >= 80 ? "rejected" : score >= 40 ? "review" : "clean";
  return {
    fraudStatus,
    fraudScore: Math.min(score, 100),
    fraudReasons: reasons,
    billable: fraudStatus === "clean",
    reviewHash: crypto.createHash("sha256").update(reasons.join("|") || "clean").digest("hex"),
  };
}
