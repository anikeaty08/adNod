const hre = require("hardhat");
const { ethers, network } = hre;
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const [deployer] = await ethers.getSigners();

  const wrappedNativeAddress = process.env.WRAPPED_NATIVE_TOKEN_ADDRESS;
  if (!wrappedNativeAddress) {
    throw new Error("WRAPPED_NATIVE_TOKEN_ADDRESS is required for deployment.");
  }

  const PayoutWrapper = await ethers.getContractFactory("AdNodePayoutWrapper");
  const payoutWrapper = await PayoutWrapper.deploy(wrappedNativeAddress);
  await payoutWrapper.waitForDeployment();

  const Registry = await ethers.getContractFactory("AdRegistry");
  const registry = await Registry.deploy(deployer.address, await payoutWrapper.getAddress());
  await registry.waitForDeployment();

  const Analytics = await ethers.getContractFactory("AdAnalytics");
  const analytics = await Analytics.deploy(await registry.getAddress(), deployer.address);
  await analytics.waitForDeployment();

  await (await registry.setSettlementManager(await analytics.getAddress(), true)).wait();
  await (await analytics.grantRole(await analytics.REPORTER_ROLE(), deployer.address)).wait();
  await (await analytics.grantRole(await analytics.EARNINGS_ROLE(), deployer.address)).wait();

  const deployment = {
    network: network.name,
    payoutWrapper: await payoutWrapper.getAddress(),
    wrappedNativeToken: wrappedNativeAddress,
    adRegistry: await registry.getAddress(),
    adAnalytics: await analytics.getAddress(),
    deployedAt: new Date().toISOString(),
  };

  const deploymentDir = path.join(process.cwd(), "deployments");
  fs.mkdirSync(deploymentDir, { recursive: true });
  fs.writeFileSync(path.join(deploymentDir, `${network.name}.json`), JSON.stringify(deployment, null, 2));

  const payoutWrapperArtifact = await hre.artifacts.readArtifact("AdNodePayoutWrapper");
  const registryArtifact = await hre.artifacts.readArtifact("AdRegistry");
  const analyticsArtifact = await hre.artifacts.readArtifact("AdAnalytics");
  const abiDir = path.join(process.cwd(), "src", "lib", "abi");
  fs.mkdirSync(abiDir, { recursive: true });
  fs.writeFileSync(path.join(abiDir, "AdNodePayoutWrapper.json"), JSON.stringify(payoutWrapperArtifact.abi, null, 2));
  fs.writeFileSync(path.join(abiDir, "AdRegistry.json"), JSON.stringify(registryArtifact.abi, null, 2));
  fs.writeFileSync(path.join(abiDir, "AdAnalytics.json"), JSON.stringify(analyticsArtifact.abi, null, 2));
  fs.writeFileSync(path.join(abiDir, "payout-wrapper-abi.json"), JSON.stringify(payoutWrapperArtifact.abi, null, 2));
  fs.writeFileSync(path.join(abiDir, "registry-abi.json"), JSON.stringify(registryArtifact.abi, null, 2));
  fs.writeFileSync(path.join(abiDir, "analytics-abi.json"), JSON.stringify(analyticsArtifact.abi, null, 2));

  console.log(`AdNodePayoutWrapper deployed to ${deployment.payoutWrapper} on ${network.name}`);
  console.log(`AdRegistry deployed to ${deployment.adRegistry} on ${network.name}`);
  console.log(`AdAnalytics deployed to ${deployment.adAnalytics} on ${network.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
