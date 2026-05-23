const assert = require("node:assert/strict");

describe("AdNode settlement ABI", function () {
  it("exposes non-replayable settlement identifiers", async function () {
    const registry = await hre.artifacts.readArtifact("AdRegistry");
    const analytics = await hre.artifacts.readArtifact("AdAnalytics");

    const reserve = registry.abi.find((item) => item.type === "function" && item.name === "reserveDeveloperPayout");
    const credit = analytics.abi.find((item) => item.type === "function" && item.name === "creditDeveloperEarnings");
    const impression = analytics.abi.find((item) => item.type === "function" && item.name === "recordImpression");
    const click = analytics.abi.find((item) => item.type === "function" && item.name === "recordClick");

    assert.equal(reserve.inputs.at(-1).name, "settlementId");
    assert.equal(reserve.inputs.at(-1).type, "bytes32");
    assert.equal(credit.inputs[3].name, "settlementId");
    assert.equal(credit.inputs[3].type, "bytes32");
    assert.equal(impression.inputs[1].name, "eventId");
    assert.equal(click.inputs[1].name, "eventId");
  });
});
