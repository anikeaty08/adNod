require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  networks: {
    fhenixHelium: {
      url: process.env.FHENIX_HELIUM_RPC_URL || "https://api.helium.fhenix.zone",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8008135,
    },
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
