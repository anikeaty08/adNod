require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: "0.8.24",
  networks: {
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
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
