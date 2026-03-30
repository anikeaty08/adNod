require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    fhenixArbitrumSepolia: {
      url: process.env.VITE_FHENIX_RPC_URL || process.env.ARBITRUM_SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./.hh-cache",
    artifacts: "./.hh-artifacts",
  },
};
