const hre = require("hardhat");

/**
 * Local Deployment Script for TouchGrass
 *
 * This script deploys the full stack for local testing:
 * 1. MockUSDC (ERC20 with 6 decimals)
 * 2. MockV3Aggregator for ETH/USD price feed
 * 3. MockV3Aggregator for USDC/USD price feed
 * 4. TouchGrass main contract
 * 5. TouchGrassNFT contract
 *
 * Then configures:
 * - Adds ETH token with mock price feed
 * - Adds USDC token with mock price feed
 * - Enables fallback prices for both tokens (simulating no real oracle)
 * - Mints test USDC to deployer wallet
 *
 * Usage: npx hardhat run scripts/deployLocal.cjs --network localhost
 */

async function main() {
  console.log("\n🌿 TouchGrass Local Deployment Script\n");
  console.log("=".repeat(60));

  // Get signers - Hardhat node provides 20 test accounts
  // [0] = deployer/owner
  // [1] = verifier
  // [2] = charity wallet
  // [3] = treasury wallet
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const verifier = signers[1];
  const charityWallet = signers[2];
  const treasuryWallet = signers[3];

  console.log("\n📋 Deployment Accounts:");
  console.log(`   Owner/Deployer:  ${deployer.address}`);
  console.log(`   Verifier:        ${verifier.address}`);
  console.log(`   Charity Wallet:  ${charityWallet.address}`);
  console.log(`   Treasury Wallet: ${treasuryWallet.address}`);

  const deployerBalance = await hre.ethers.provider.getBalance(
    deployer.address
  );
  console.log(
    `   Deployer ETH:    ${hre.ethers.formatEther(deployerBalance)} ETH\n`
  );

  // =====================================================
  // 1. Deploy Mock USDC Token
  // =====================================================
  console.log("📦 [1/5] Deploying Mock USDC...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy("Mock USDC", "USDC");
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log(`   ✅ Mock USDC deployed to: ${mockUSDCAddress}`);

  // =====================================================
  // 2. Deploy Mock ETH/USD Price Feed
  // =====================================================
  console.log("📦 [2/5] Deploying Mock ETH/USD Price Feed...");
  const MockV3Aggregator = await hre.ethers.getContractFactory(
    "MockV3Aggregator"
  );

  // ETH price: $3000 with 8 decimals (Chainlink standard)
  const ethPriceUSD = 3000 * 1e8; // $3000.00
  const mockEthPriceFeed = await MockV3Aggregator.deploy(8, ethPriceUSD);
  await mockEthPriceFeed.waitForDeployment();
  const mockEthPriceFeedAddress = await mockEthPriceFeed.getAddress();
  console.log(
    `   ✅ Mock ETH/USD Price Feed deployed to: ${mockEthPriceFeedAddress}`
  );
  console.log(`   ℹ️  ETH Price set to: $3,000.00`);

  // =====================================================
  // 3. Deploy Mock USDC/USD Price Feed
  // =====================================================
  console.log("📦 [3/5] Deploying Mock USDC/USD Price Feed...");

  // USDC price: $1.00 with 8 decimals
  const usdcPriceUSD = 1 * 1e8; // $1.00
  const mockUsdcPriceFeed = await MockV3Aggregator.deploy(8, usdcPriceUSD);
  await mockUsdcPriceFeed.waitForDeployment();
  const mockUsdcPriceFeedAddress = await mockUsdcPriceFeed.getAddress();
  console.log(
    `   ✅ Mock USDC/USD Price Feed deployed to: ${mockUsdcPriceFeedAddress}`
  );
  console.log(`   ℹ️  USDC Price set to: $1.00`);

  // =====================================================
  // 4. Deploy TouchGrass Main Contract
  // =====================================================
  console.log("📦 [4/5] Deploying TouchGrass Main Contract...");

  const usdcFee = 500000; // 0.5 USDC (6 decimals)
  const usdcMinStake = 1000000; // 1 USDC (6 decimals)

  const TouchGrass = await hre.ethers.getContractFactory("TouchGrass");
  const touchGrass = await TouchGrass.deploy(
    verifier.address, // _verifierAddress
    charityWallet.address, // _charityAddress
    treasuryWallet.address, // _treasuryAddress
    usdcFee, // _USDCFee
    usdcMinStake // _USDCMinStake
  );
  await touchGrass.waitForDeployment();
  const touchGrassAddress = await touchGrass.getAddress();
  console.log(`   ✅ TouchGrass deployed to: ${touchGrassAddress}`);

  // =====================================================
  // 5. Deploy TouchGrass NFT Contract
  // =====================================================
  console.log("📦 [5/5] Deploying TouchGrassNFT Contract...");
  const TouchGrassNFT = await hre.ethers.getContractFactory("TouchGrassNFT");
  const touchGrassNFT = await TouchGrassNFT.deploy(touchGrassAddress);
  await touchGrassNFT.waitForDeployment();
  const touchGrassNFTAddress = await touchGrassNFT.getAddress();
  console.log(`   ✅ TouchGrassNFT deployed to: ${touchGrassNFTAddress}`);

  // =====================================================
  // CONFIGURATION: Add Tokens
  // =====================================================
  console.log("\n⚙️  Configuring Tokens...\n");

  // Add ETH token
  console.log("   Adding ETH token...");
  const ethStalenessTolerance = 3600 * 24 * 365; // 1 year tolerance for local testing
  await touchGrass.addToken(
    "ETH", // symbol
    hre.ethers.ZeroAddress, // tokenAddress (address(0) for native ETH)
    mockEthPriceFeedAddress, // priceFeed
    18, // decimals
    ethStalenessTolerance // priceStalenessTolerance
  );
  console.log("   ✅ ETH token added");

  // Add USDC token
  console.log("   Adding USDC token...");
  const usdcStalenessTolerance = 3600 * 24 * 365; // 1 year tolerance for local testing
  await touchGrass.addToken(
    "USDC", // symbol
    mockUSDCAddress, // tokenAddress
    mockUsdcPriceFeedAddress, // priceFeed
    6, // decimals
    usdcStalenessTolerance // priceStalenessTolerance
  );
  console.log("   ✅ USDC token added");

  // =====================================================
  // CONFIGURATION: Enable Fallback Prices
  // =====================================================
  console.log("\n⚙️  Enabling Fallback Prices (for offline testing)...\n");

  // Enable fallback for ETH: $3000 with 18 decimals
  const ethFallbackPrice = hre.ethers.parseUnits("3000", 18); // 3000e18
  await touchGrass.enableFallbackPrice("ETH", ethFallbackPrice);
  console.log(`   ✅ ETH fallback price enabled: $3,000.00`);

  // Enable fallback for USDC: $1.00 with 18 decimals
  const usdcFallbackPrice = hre.ethers.parseUnits("1", 18); // 1e18
  await touchGrass.enableFallbackPrice("USDC", usdcFallbackPrice);
  console.log(`   ✅ USDC fallback price enabled: $1.00`);

  // =====================================================
  // MINT TEST TOKENS TO DEPLOYER
  // =====================================================
  console.log("\n💰 Minting Test Tokens...\n");

  // Mint some USDC to deployer for testing
  await mockUSDC.faucet(); // Mints 1000 USDC to caller
  const usdcBalance = await mockUSDC.balanceOf(deployer.address);
  console.log(
    `   ✅ Minted USDC to deployer: ${hre.ethers.formatUnits(
      usdcBalance,
      6
    )} USDC`
  );

  // =====================================================
  // VERIFY CONFIGURATION
  // =====================================================
  console.log("\n🔍 Verifying Configuration...\n");

  // Verify tokens are supported
  const supportedTokens = await touchGrass.getAllSupportedTokens();
  console.log(`   Supported Tokens: ${supportedTokens.join(", ")}`);

  // Check ETH pricing
  const ethPrice = await touchGrass.getTokenPrice("ETH");
  console.log(`   ETH Price: $${hre.ethers.formatUnits(ethPrice, 18)}`);

  // Check USDC pricing
  const usdcPrice = await touchGrass.getTokenPrice("USDC");
  console.log(`   USDC Price: $${hre.ethers.formatUnits(usdcPrice, 18)}`);

  // Check fee calculations
  const ethFee = await touchGrass.calculateTokenFee("ETH");
  const usdcFeeCalc = await touchGrass.calculateTokenFee("USDC");
  console.log(`   ETH Fee: ${hre.ethers.formatEther(ethFee)} ETH`);
  console.log(`   USDC Fee: ${hre.ethers.formatUnits(usdcFeeCalc, 6)} USDC`);

  // Check min stake calculations
  const ethMinStake = await touchGrass.calculateMinStake("ETH");
  const usdcMinStakeCalc = await touchGrass.calculateMinStake("USDC");
  console.log(`   ETH Min Stake: ${hre.ethers.formatEther(ethMinStake)} ETH`);
  console.log(
    `   USDC Min Stake: ${hre.ethers.formatUnits(usdcMinStakeCalc, 6)} USDC`
  );

  // =====================================================
  // OUTPUT: Frontend Configuration
  // =====================================================
  console.log("\n" + "=".repeat(60));
  console.log("📝 UPDATE YOUR FRONTEND CONFIG WITH THESE VALUES:");
  console.log("=".repeat(60));

  console.log("\n📄 src/data/contractConfig.js:");
  console.log(`   export const CONTRACT_ADDRESS = "${touchGrassAddress}";`);

  console.log("\n📄 src/data/tokenConfig.js (update USDC address):");
  console.log(`   USDC: {`);
  console.log(`     symbol: "USDC",`);
  console.log(`     decimals: 6,`);
  console.log(`     address: "${mockUSDCAddress}",`);
  console.log(`     icon: "$",`);
  console.log(`     color: "blue",`);
  console.log(`     isNative: false,`);
  console.log(`   }`);

  console.log("\n📄 src/data/NFTconfig.js (if needed):");
  console.log(
    `   export const NFT_CONTRACT_ADDRESS = "${touchGrassNFTAddress}";`
  );

  console.log("\n" + "=".repeat(60));
  console.log("📋 QUICK REFERENCE - ALL CONTRACT ADDRESSES:");
  console.log("=".repeat(60));
  console.log(`   TouchGrass:      ${touchGrassAddress}`);
  console.log(`   TouchGrassNFT:   ${touchGrassNFTAddress}`);
  console.log(`   Mock USDC:       ${mockUSDCAddress}`);
  console.log(`   ETH Price Feed:  ${mockEthPriceFeedAddress}`);
  console.log(`   USDC Price Feed: ${mockUsdcPriceFeedAddress}`);
  console.log(`   Verifier:        ${verifier.address}`);
  console.log("=".repeat(60));

  console.log("\n🎉 Local deployment complete!\n");
  console.log("Next steps:");
  console.log("  1. Keep the hardhat node running in another terminal");
  console.log("  2. Update the frontend config files with the addresses above");
  console.log("  3. Run `npm run dev` to start the frontend");
  console.log("  4. Connect MetaMask to localhost:8545 (Chain ID: 31337)");
  console.log(
    "  5. Import one of the test accounts to MetaMask using its private key\n"
  );
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error);
  process.exitCode = 1;
});
