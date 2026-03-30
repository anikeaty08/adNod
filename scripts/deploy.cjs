const hre = require("hardhat");
const { ethers, network } = hre;
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const [deployer] = await ethers.getSigners();

  const Registry = await ethers.getContractFactory("AdRegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();

  const Analytics = await ethers.getContractFactory("AdAnalytics");
  const analytics = await Analytics.deploy(await registry.getAddress(), deployer.address);
  await analytics.waitForDeployment();

  const deployment = {
    network: network.name,
    adRegistry: await registry.getAddress(),
    adAnalytics: await analytics.getAddress(),
    deployedAt: new Date().toISOString(),
  };

  const deploymentDir = path.join(process.cwd(), "deployments");
  fs.mkdirSync(deploymentDir, { recursive: true });
  fs.writeFileSync(path.join(deploymentDir, `${network.name}.json`), JSON.stringify(deployment, null, 2));

  const registryArtifact = await hre.artifacts.readArtifact("AdRegistry");
  const analyticsArtifact = await hre.artifacts.readArtifact("AdAnalytics");
  const abiDir = path.join(process.cwd(), "src", "lib", "abi");
  fs.mkdirSync(abiDir, { recursive: true });
  fs.writeFileSync(path.join(abiDir, "AdRegistry.json"), JSON.stringify(registryArtifact.abi, null, 2));
  fs.writeFileSync(path.join(abiDir, "AdAnalytics.json"), JSON.stringify(analyticsArtifact.abi, null, 2));

  console.log(`AdRegistry deployed to ${deployment.adRegistry} on ${network.name}`);
  console.log(`AdAnalytics deployed to ${deployment.adAnalytics} on ${network.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
