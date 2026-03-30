const { ethers, network } = require("hardhat");

async function main() {
  const Contract = await ethers.getContractFactory("AdNodeEscrow");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  console.log(`AdNodeEscrow deployed to ${await contract.getAddress()} on ${network.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
