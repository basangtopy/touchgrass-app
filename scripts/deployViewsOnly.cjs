/**
 * TouchGrassViews Deployment Script for Base Sepolia
 *
 * Use this to deploy ONLY the TouchGrassViews contract (e.g., after fixing bugs)
 * while keeping the existing TouchGrass main contract.
 *
 * Prerequisites:
 * 1. Set PRIVATE_KEY in your .env file
 * 2. Have Base Sepolia ETH in your wallet
 * 3. Set TOUCHGRASS_ADDRESS to the existing main contract address
 *
 * Usage:
 *   npx hardhat run scripts/deployViewsOnly.cjs --network baseSepolia
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("=".repeat(60));
  console.log("TouchGrassViews Deployment - Base Sepolia");
  console.log("=".repeat(60));
  console.log("\nDeploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // ============================================
  // CONFIGURATION
  // ============================================

  // The existing TouchGrass main contract address
  const touchGrassAddress =
    process.env.TOUCHGRASS_ADDRESS ||
    "0x7c796874a94c7fd368494f320af5c563754c84a3";

  console.log("Configuration:");
  console.log("-".repeat(40));
  console.log("TouchGrass (existing):", touchGrassAddress);
  console.log("-".repeat(40));

  // Validate address
  if (touchGrassAddress.includes("YOUR_")) {
    console.error(
      "\n❌ ERROR: Please set TOUCHGRASS_ADDRESS in your .env file!"
    );
    console.error(
      "   This should be the address of the existing TouchGrass contract."
    );
    process.exit(1);
  }

  if (touchGrassAddress === hre.ethers.ZeroAddress) {
    console.error("\n❌ ERROR: TouchGrass address cannot be zero address!");
    process.exit(1);
  }

  // ============================================
  // DEPLOYMENT
  // ============================================

  console.log("\n📦 Deploying TouchGrassViews to Base Sepolia...\n");

  const TouchGrassViews = await hre.ethers.getContractFactory(
    "TouchGrassViews"
  );
  const touchGrassViews = await TouchGrassViews.deploy(touchGrassAddress);
  await touchGrassViews.waitForDeployment();
  const viewsAddress = await touchGrassViews.getAddress();

  console.log("✅ TouchGrassViews deployed to:", viewsAddress);

  // ============================================
  // DEPLOYMENT SUMMARY
  // ============================================

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Address:");
  console.log("-".repeat(40));
  console.log("TouchGrassViews:", viewsAddress);
  console.log("-".repeat(40));
  console.log("Network:         Base Sepolia");
  console.log("Deployer:        ", deployer.address);
  console.log("TouchGrass:      ", touchGrassAddress);
  console.log("-".repeat(40));

  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env files with:");
  console.log(`   VITE_VIEWS_CONTRACT_ADDRESS=${viewsAddress}`);
  console.log("\n2. Verify the contract on BaseScan:");
  console.log(
    `   npx hardhat verify --network baseSepolia ${viewsAddress} "${touchGrassAddress}"`
  );

  console.log("\n" + "=".repeat(60) + "\n");

  return viewsAddress;
}

main()
  .then((viewsAddress) => {
    console.log("Deployment completed.");
    console.log("TouchGrassViews:", viewsAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
