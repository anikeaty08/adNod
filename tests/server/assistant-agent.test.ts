import assert from "node:assert/strict";
import test from "node:test";
import { getAssistantReply } from "../../server/assistant.js";

test("public assistant does not answer vague prompts with a generic intro", async () => {
  const reply = await getAssistantReply("hi", []);
  assert.match(reply.reply, /connect and sign/i);
  assert.doesNotMatch(reply.reply, /Introduction to AdNode/i);
});

test("public assistant asks for wallet before private account data", async () => {
  const reply = await getAssistantReply("how much credit do I have?", []);
  assert.match(reply.reply, /connect and sign/i);
  assert.match(reply.reply, /real account data/i);
});
