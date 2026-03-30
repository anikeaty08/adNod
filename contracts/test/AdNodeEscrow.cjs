const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AdNodeEscrow", function () {
  it("creates campaigns, tracks clicks, and allows withdrawal", async function () {
    const [advertiser, developer] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("AdNodeEscrow");
    const contract = await Contract.deploy();
    await contract.waitForDeployment();

    await contract.connect(advertiser).createCampaign(
      "Launch",
      "Description",
      "https://creative.example",
      0,
      1000,
      { value: 5000 },
    );

    await contract.trackClick(1, developer.address);
    expect(await contract.developerBalances(1, developer.address)).to.equal(1000);

    await expect(() => contract.connect(developer).withdrawPayout(1)).to.changeEtherBalances(
      [developer, contract],
      [1000, -1000],
    );
  });
});
