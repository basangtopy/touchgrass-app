/**
 * TouchGrass Deployment Script for Base Sepolia
 *
 * Prerequisites:
 * 1. Set PRIVATE_KEY in your .env file
 * 2. Have Base Sepolia ETH in your wallet (get from faucet)
 *
 * Usage:
 *   npx hardhat run scripts/deployBaseSepolia.cjs --network baseSepolia
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("=".repeat(60));
  console.log("TouchGrass Deployment - Base Sepolia");
  console.log("=".repeat(60));
  console.log("\nDeploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // ============================================
  // DEPLOYMENT CONFIGURATION
  // ============================================

  // IMPORTANT: Replace these with your actual addresses before deploying!
  const config = {
    // Verifier address - the wallet that will verify challenges
    // This CANNOT be the same as deployer (owner), charity, or treasury
    verifier: process.env.VERIFIER_ADDRESS || "YOUR_VERIFIER_ADDRESS_HERE",

    // Charity wallet - receives charity penalties
    charity: process.env.CHARITY_ADDRESS || "YOUR_CHARITY_ADDRESS_HERE",

    // Treasury wallet - receives fees and dev penalties
    treasury: process.env.TREASURY_ADDRESS || "YOUR_TREASURY_ADDRESS_HERE",

    // Fee in USDC terms (6 decimals)
    // 500000 = 0.50 USDC
    usdcFee: 500000n,

    // Minimum stake in USDC terms (6 decimals)
    // 1000000 = 1.00 USDC
    usdcMinStake: 1000000n,
  };

  // ============================================
  // VALIDATION
  // ============================================

  console.log("Configuration:");
  console.log("-".repeat(40));
  console.log("Verifier:", config.verifier);
  console.log("Charity:", config.charity);
  console.log("Treasury:", config.treasury);
  console.log("USDC Fee:", Number(config.usdcFee) / 1e6, "USDC");
  console.log("Min Stake:", Number(config.usdcMinStake) / 1e6, "USDC");
  console.log("-".repeat(40));

  // Check for placeholder addresses
  if (
    config.verifier.includes("YOUR_") ||
    config.charity.includes("YOUR_") ||
    config.treasury.includes("YOUR_")
  ) {
    console.error(
      "\n❌ ERROR: Please update the configuration with real addresses!"
    );
    console.error(
      "   Set VERIFIER_ADDRESS, CHARITY_ADDRESS, TREASURY_ADDRESS in .env"
    );
    console.error("   Or update the config object in this script.\n");
    process.exit(1);
  }

  // Validate addresses are not zero
  if (
    config.verifier === hre.ethers.ZeroAddress ||
    config.charity === hre.ethers.ZeroAddress ||
    config.treasury === hre.ethers.ZeroAddress
  ) {
    console.error("\n❌ ERROR: Addresses cannot be zero address!");
    process.exit(1);
  }

  // Validate addresses are unique
  if (
    config.verifier === config.charity ||
    config.verifier === config.treasury ||
    config.charity === config.treasury
  ) {
    console.error(
      "\n❌ ERROR: Verifier, Charity, and Treasury must be unique addresses!"
    );
    process.exit(1);
  }

  // Validate verifier is not the deployer
  if (config.verifier.toLowerCase() === deployer.address.toLowerCase()) {
    console.error(
      "\n❌ ERROR: Verifier cannot be the same as the deployer (owner)!"
    );
    process.exit(1);
  }

  // ============================================
  // DEPLOYMENT
  // ============================================

  console.log("\n📦 Deploying contracts to Base Sepolia...\n");

  // 1. Deploy TouchGrass main contract
  console.log("📦 [1/3] Deploying TouchGrass...");
  const TouchGrass = await hre.ethers.getContractFactory("TouchGrass");
  const touchGrass = await TouchGrass.deploy(
    config.verifier,
    config.charity,
    config.treasury,
    config.usdcFee,
    config.usdcMinStake
  );

  await touchGrass.waitForDeployment();
  const contractAddress = await touchGrass.getAddress();
  console.log("✅ TouchGrass deployed to:", contractAddress);

  // 2. Deploy TouchGrassViews
  console.log("📦 [2/3] Deploying TouchGrassViews...");
  const TouchGrassViews = await hre.ethers.getContractFactory(
    "TouchGrassViews"
  );
  const touchGrassViews = await TouchGrassViews.deploy(contractAddress);
  await touchGrassViews.waitForDeployment();
  const viewsAddress = await touchGrassViews.getAddress();
  console.log("✅ TouchGrassViews deployed to:", viewsAddress);

  // 3. Deploy TouchGrassNFT
  console.log("📦 [3/3] Deploying TouchGrassNFT...");
  const TouchGrassNFT = await hre.ethers.getContractFactory("TouchGrassNFT");
  const touchGrassNFT = await TouchGrassNFT.deploy(contractAddress);
  await touchGrassNFT.waitForDeployment();
  const nftAddress = await touchGrassNFT.getAddress();
  console.log("✅ TouchGrassNFT deployed to:", nftAddress);

  // ============================================
  // DEPLOYMENT SUMMARY
  // ============================================

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("-".repeat(40));
  console.log("TouchGrass:       ", contractAddress);
  console.log("TouchGrassViews:  ", viewsAddress);
  console.log("TouchGrassNFT:    ", nftAddress);
  console.log("-".repeat(40));
  console.log("Network:          Base Sepolia");
  console.log("Owner:            ", deployer.address);
  console.log("Verifier:         ", config.verifier);
  console.log("Charity:          ", config.charity);
  console.log("Treasury:         ", config.treasury);
  console.log("-".repeat(40));

  console.log("\n📝 Next Steps:");
  console.log("1. Update your .env files with:");
  console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   VITE_VIEWS_CONTRACT_ADDRESS=${viewsAddress}`);
  console.log(`   VITE_NFT_CONTRACT_ADDRESS=${nftAddress}`);
  console.log("\n2. Add supported tokens via admin functions:");
  console.log("   - addToken('ETH', address(0), priceFeed, 18, staleness)");
  console.log("   - addToken('USDC', usdcAddress, priceFeed, 6, staleness)");
  console.log("\n3. Verify the contracts on BaseScan (optional):");
  console.log(
    `   npx hardhat verify --network baseSepolia ${contractAddress} \\`
  );
  console.log(`     "${config.verifier}" \\`);
  console.log(`     "${config.charity}" \\`);
  console.log(`     "${config.treasury}" \\`);
  console.log(`     "${config.usdcFee}" \\`);
  console.log(`     "${config.usdcMinStake}"`);
  console.log(
    `\n   npx hardhat verify --network baseSepolia ${viewsAddress} "${contractAddress}"`
  );
  console.log(
    `\n   npx hardhat verify --network baseSepolia ${nftAddress} "${contractAddress}"`
  );

  console.log("\n" + "=".repeat(60) + "\n");

  return { contractAddress, viewsAddress, nftAddress };
}

main()
  .then((addresses) => {
    console.log("Deployment completed.");
    console.log("TouchGrass:", addresses.contractAddress);
    console.log("TouchGrassViews:", addresses.viewsAddress);
    console.log("TouchGrassNFT:", addresses.nftAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
