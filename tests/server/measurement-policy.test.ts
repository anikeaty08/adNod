import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMeasurementPolicy } from "../../server/measurement-policy.js";
import { buildMeasurementEventKey } from "../../server/measurement.js";

test("clean browser measurement is billable", () => {
  const result = evaluateMeasurementPolicy({
    eventType: "impression",
    pageUrl: "https://publisher.example/article",
    referrer: "https://search.example",
    publisherOrigin: "https://publisher.example",
    userAgent: "Mozilla/5.0 Chrome/120",
    remoteAddress: "203.0.113.10",
  });

  assert.equal(result.fraudStatus, "clean");
  assert.equal(result.billable, true);
});

test("bot-like measurement is sent to review or rejection before billing", () => {
  const result = evaluateMeasurementPolicy({
    eventType: "click",
    pageUrl: "https://publisher.example/article",
    referrer: "",
    publisherOrigin: "https://publisher.example",
    userAgent: "HeadlessChrome Playwright",
    remoteAddress: "203.0.113.10",
  });

  assert.equal(result.billable, false);
  assert.match(result.fraudReasons.join(","), /suspicious_user_agent/);
});

test("measurement event key uses nonce when present", () => {
  const keyA = buildMeasurementEventKey({
    chainCampaignId: "1",
    chainSlotId: "2",
    eventType: "click",
    fingerprint: "fp-a",
    nonce: "nonce-1",
  });
  const keyB = buildMeasurementEventKey({
    chainCampaignId: "1",
    chainSlotId: "2",
    eventType: "click",
    fingerprint: "fp-b",
    nonce: "nonce-1",
  });

  assert.equal(keyA, keyB);
});
