const { ethers } = require("hardhat");
const {
  DEFAULT_FEE,
  DEFAULT_MIN_STAKE,
  ETH_PRICE,
  USDC_PRICE,
  HOUR,
} = require("./constants.cjs");

/**
 * Deploy all contracts and setup initial state
 */
async function deployTouchGrassFixture() {
  const [owner, verifier, charity, treasury, user1, user2, user3, attacker] =
    await ethers.getSigners();

  // Deploy mock price feeds
  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const ethPriceFeed = await MockV3Aggregator.deploy(8, ETH_PRICE);
  const usdcPriceFeed = await MockV3Aggregator.deploy(8, USDC_PRICE);

  await ethPriceFeed.waitForDeployment();
  await usdcPriceFeed.waitForDeployment();

  // Deploy mock USDC
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC");
  await usdc.waitForDeployment();

  // Deploy TouchGrass
  const TouchGrass = await ethers.getContractFactory("TouchGrass");
  const touchGrass = await TouchGrass.deploy(
    verifier.address,
    charity.address,
    treasury.address,
    DEFAULT_FEE,
    DEFAULT_MIN_STAKE
  );
  await touchGrass.waitForDeployment();

  // Add ETH token
  await touchGrass.addToken(
    "ETH",
    ethers.ZeroAddress,
    await ethPriceFeed.getAddress(),
    18,
    HOUR
  );

  // Add USDC token
  await touchGrass.addToken(
    "USDC",
    await usdc.getAddress(),
    await usdcPriceFeed.getAddress(),
    6,
    HOUR
  );

  // Fund users with USDC
  const usdcAmount = ethers.parseUnits("10000", 6);
  await usdc.transfer(user1.address, usdcAmount);
  await usdc.transfer(user2.address, usdcAmount);
  await usdc.transfer(user3.address, usdcAmount);

  // Approve TouchGrass to spend USDC for users
  await usdc
    .connect(user1)
    .approve(await touchGrass.getAddress(), ethers.MaxUint256);
  await usdc
    .connect(user2)
    .approve(await touchGrass.getAddress(), ethers.MaxUint256);
  await usdc
    .connect(user3)
    .approve(await touchGrass.getAddress(), ethers.MaxUint256);

  return {
    touchGrass,
    usdc,
    ethPriceFeed,
    usdcPriceFeed,
    owner,
    verifier,
    charity,
    treasury,
    user1,
    user2,
    user3,
    attacker,
  };
}

/**
 * Deploy TouchGrass with malicious token for reentrancy tests
 */
async function deployWithMaliciousTokenFixture() {
  const base = await deployTouchGrassFixture();

  const MaliciousToken = await ethers.getContractFactory("MaliciousToken");
  const malToken = await MaliciousToken.deploy();
  await malToken.waitForDeployment();

  const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
  const malPriceFeed = await MockV3Aggregator.deploy(8, 1_00000000n);
  await malPriceFeed.waitForDeployment();

  await base.touchGrass.addToken(
    "MAL",
    await malToken.getAddress(),
    await malPriceFeed.getAddress(),
    18,
    3600
  );

  await malToken.setTarget(await base.touchGrass.getAddress());
  await malToken.mint(base.attacker.address, ethers.parseEther("10000"));
  await malToken
    .connect(base.attacker)
    .approve(await base.touchGrass.getAddress(), ethers.MaxUint256);

  return { ...base, malToken, malPriceFeed };
}

/**
 * Helper to create an ETH challenge
 */
async function createETHChallenge(
  touchGrass,
  user,
  stakeAmount,
  durationSeconds,
  penaltyType = 0,
  penaltyPercent = 20
) {
  const fee = await touchGrass.calculateTokenFee("ETH");
  const totalValue = stakeAmount + fee;

  const tx = await touchGrass
    .connect(user)
    .createChallenge(
      "ETH",
      stakeAmount,
      durationSeconds,
      penaltyType,
      penaltyPercent,
      { value: totalValue }
    );

  const receipt = await tx.wait();
  const challengeId = (await touchGrass.challengeCount()) - 1n;

  return { tx, receipt, challengeId };
}

/**
 * Helper to create a USDC challenge
 */
async function createUSDCChallenge(
  touchGrass,
  user,
  stakeAmount,
  durationSeconds,
  penaltyType = 0,
  penaltyPercent = 20
) {
  const tx = await touchGrass
    .connect(user)
    .createChallenge(
      "USDC",
      stakeAmount,
      durationSeconds,
      penaltyType,
      penaltyPercent
    );

  const receipt = await tx.wait();
  const challengeId = (await touchGrass.challengeCount()) - 1n;

  return { tx, receipt, challengeId };
}

/**
 * Helper to advance time
 */
async function advanceTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

/**
 * Helper to get current block timestamp
 */
async function getBlockTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}

/**
 * Helper to calculate expected penalty amount
 */
function calculatePenalty(stakeAmount, penaltyPercent) {
  return (stakeAmount * BigInt(penaltyPercent)) / 100n;
}

module.exports = {
  deployTouchGrassFixture,
  deployWithMaliciousTokenFixture,
  createETHChallenge,
  createUSDCChallenge,
  advanceTime,
  getBlockTimestamp,
  calculatePenalty,
};
