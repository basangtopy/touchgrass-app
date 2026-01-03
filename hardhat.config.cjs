require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1, // Minimize code size at cost of gas efficiency
      },
      viaIR: true, // Use the IR pipeline for better optimization
    },
  },
  networks: {
    // Base Sepolia (Testnet)
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY],
    },
    // Local Hardhat Network (for testing logic without spending real testnet ETH)
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: true, // Allow large contracts for testing
    },
  },

  etherscan: {
    // Use single API key for Etherscan API v2
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

  // Disable sourcify to suppress the info message
  sourcify: {
    enabled: false,
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./src/artifacts", // IMPORTANT: Exports ABI to src so React can see it
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 30,
    outputFile: "gas-report.txt",
    noColors: true,
  },
};
