const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AdNode Fhenix contracts", function () {
  it("deploys registry and analytics", async function () {
    const [owner] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("AdRegistry");
    const registry = await Registry.deploy(owner.address);
    await registry.waitForDeployment();

    const Analytics = await ethers.getContractFactory("AdAnalytics");
    const analytics = await Analytics.deploy(await registry.getAddress(), owner.address);
    await analytics.waitForDeployment();

    expect(await registry.owner()).to.equal(owner.address);
    expect(await analytics.owner()).to.equal(owner.address);
    expect(await analytics.registry()).to.equal(await registry.getAddress());
  });
});
