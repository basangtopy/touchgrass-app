const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {
  deployTouchGrassFixture,
  createETHChallenge,
  advanceTime,
} = require("../helpers/fixtures.cjs");
const {
  PenaltyType,
  HOUR,
  DAY,
  DEFAULT_LOCK_MULTIPLIER,
} = require("../helpers/constants.cjs");

describe("TouchGrass - Edge Cases", function () {
  describe("Boundary Conditions", function () {
    it("should accept minimum duration", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const minDuration = await touchGrass.MIN_DURATION();
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge(
            "ETH",
            stakeAmount,
            minDuration,
            PenaltyType.CHARITY,
            20,
            { value: stakeAmount + fee }
          )
      ).to.not.be.reverted;
    });

    it("should accept maximum duration", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const maxDuration = await touchGrass.MAX_DURATION();
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge(
            "ETH",
            stakeAmount,
            maxDuration,
            PenaltyType.CHARITY,
            20,
            { value: stakeAmount + fee }
          )
      ).to.not.be.reverted;
    });

    it("should accept minimum penalty percent", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const minPenalty = await touchGrass.MIN_PENALTY_PERCENTAGE();
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge(
            "ETH",
            stakeAmount,
            HOUR,
            PenaltyType.CHARITY,
            minPenalty,
            { value: stakeAmount + fee }
          )
      ).to.not.be.reverted;
    });

    it("should accept 100% penalty", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("ETH", stakeAmount, HOUR, PenaltyType.CHARITY, 100, {
            value: stakeAmount + fee,
          })
      ).to.not.be.reverted;
    });

    it("should accept exact minimum stake", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const minStake = await touchGrass.calculateMinStake("ETH");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("ETH", minStake, HOUR, PenaltyType.CHARITY, 20, {
            value: minStake + fee,
          })
      ).to.not.be.reverted;
    });
  });

  describe("Zero Value Handling", function () {
    it("should handle 100% voluntary donation", async function () {
      const { touchGrass, verifier, charity, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseEther("1");
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR
      );

      await touchGrass.connect(verifier).verifySuccess(challengeId);
      const charityBefore = await ethers.provider.getBalance(charity.address);
      await touchGrass
        .connect(user1)
        .withdraw(challengeId, 100, PenaltyType.CHARITY);
      const charityAfter = await ethers.provider.getBalance(charity.address);
      expect(charityAfter - charityBefore).to.equal(stakeAmount);
    });

    it("should handle 0% voluntary donation", async function () {
      const { touchGrass, verifier, charity, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseEther("1");
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR
      );

      await touchGrass.connect(verifier).verifySuccess(challengeId);
      const charityBefore = await ethers.provider.getBalance(charity.address);
      await touchGrass
        .connect(user1)
        .withdraw(challengeId, 0, PenaltyType.CHARITY);
      const charityAfter = await ethers.provider.getBalance(charity.address);
      expect(charityAfter - charityBefore).to.equal(0n);
    });
  });

  describe("Pagination Edge Cases", function () {
    it("should handle getAllTokenPricing start at 0", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      const [tokens, , , , total] = await touchGrass.getAllTokenPricing(0, 10);
      expect(tokens.length).to.be.lte(10);
      expect(total).to.equal(2n);
    });

    it("should handle getAllTokenPricing with count 1", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      const [tokens] = await touchGrass.getAllTokenPricing(0, 1);
      expect(tokens.length).to.equal(1);
    });

    it("should handle getAllTokenPricing with start past end", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      const [tokens, prices, fees, minStakes, total] =
        await touchGrass.getAllTokenPricing(100, 10);
      expect(tokens.length).to.equal(0);
      expect(total).to.equal(2n);
    });

    it("should revert for zero count", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.getAllTokenPricing(0, 0)
      ).to.be.revertedWithCustomError(touchGrass, "InvalidCount");
    });

    it("should revert for count > 100", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.getAllTokenPricing(0, 101)
      ).to.be.revertedWithCustomError(touchGrass, "CountTooLarge");
    });
  });

  describe("Token ID Calculation", function () {
    it("should generate consistent token IDs", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      const expectedId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["ETH"])
      );
      const config = await touchGrass.tokenConfigs(expectedId);
      expect(config.isSupported).to.be.true;
    });

    it("should differentiate case-sensitive symbols", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const mockToken = await MockERC20.deploy("Ether", "eth");
      const MockV3Aggregator = await ethers.getContractFactory(
        "MockV3Aggregator"
      );
      const priceFeed = await MockV3Aggregator.deploy(8, 300000000000n);

      await expect(
        touchGrass
          .connect(owner)
          .addToken(
            "eth",
            await mockToken.getAddress(),
            await priceFeed.getAddress(),
            18,
            3600
          )
      ).to.not.be.reverted;
      const tokens = await touchGrass.getAllSupportedTokens();
      expect(tokens).to.include("ETH");
      expect(tokens).to.include("eth");
    });
  });
});
