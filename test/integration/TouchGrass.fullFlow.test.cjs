const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {
  deployTouchGrassFixture,
  createETHChallenge,
  createUSDCChallenge,
  advanceTime,
} = require("../helpers/fixtures.cjs");
const {
  PenaltyType,
  HOUR,
  DAY,
  DEFAULT_LOCK_MULTIPLIER,
  FEE_UPDATE_DELAY,
} = require("../helpers/constants.cjs");

describe("TouchGrass - Full Flow Integration", function () {
  describe("ETH Challenge Complete Flow", function () {
    it("should complete full success flow: create → verify → withdraw", async function () {
      const { touchGrass, verifier, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseEther("1");
      const balanceStart = await ethers.provider.getBalance(user1.address);

      const { challengeId, tx: createTx } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR,
        PenaltyType.CHARITY,
        30
      );
      const createReceipt = await createTx.wait();

      let challenge = await touchGrass.challenges(challengeId);
      expect(challenge.staker).to.equal(user1.address);
      expect(challenge.isSuccess).to.be.false;

      await touchGrass.connect(verifier).verifySuccess(challengeId);
      challenge = await touchGrass.challenges(challengeId);
      expect(challenge.isSuccess).to.be.true;

      const tx = await touchGrass.connect(user1).withdraw(challengeId, 0, 0);
      const receipt = await tx.wait();

      challenge = await touchGrass.challenges(challengeId);
      expect(challenge.isWithdrawn).to.be.true;

      const balanceEnd = await ethers.provider.getBalance(user1.address);
      const fee = await touchGrass.calculateTokenFee("ETH");
      const totalGas =
        createReceipt.gasUsed * createReceipt.gasPrice +
        receipt.gasUsed * receipt.gasPrice;
      const expectedLoss = fee + totalGas;
      expect(balanceStart - balanceEnd).to.be.closeTo(
        expectedLoss,
        ethers.parseEther("0.001")
      );
    });

    it("should complete full failure flow: create → expire → penalty", async function () {
      const { touchGrass, charity, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseEther("1");
      const penaltyPercent = 50;

      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR,
        PenaltyType.CHARITY,
        penaltyPercent
      );
      await advanceTime(HOUR + 60);

      const charityBalanceBefore = await ethers.provider.getBalance(
        charity.address
      );
      await touchGrass.connect(user1).withdraw(challengeId, 0, 0);
      const charityBalanceAfter = await ethers.provider.getBalance(
        charity.address
      );

      const expectedPenalty = (stakeAmount * BigInt(penaltyPercent)) / 100n;
      expect(charityBalanceAfter - charityBalanceBefore).to.equal(
        expectedPenalty
      );

      const challenge = await touchGrass.challenges(challengeId);
      expect(challenge.isWithdrawn).to.be.true;
    });

    it("should complete LOCK penalty flow: create → expire → wait lock → withdraw full", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseEther("1");

      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR,
        PenaltyType.LOCK,
        50
      );
      await advanceTime(HOUR + 60);

      await expect(
        touchGrass.connect(user1).withdraw(challengeId, 0, 0)
      ).to.be.revertedWithCustomError(touchGrass, "FundsLocked");

      await advanceTime(HOUR * DEFAULT_LOCK_MULTIPLIER);

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await touchGrass.connect(user1).withdraw(challengeId, 0, 0);
      const receipt = await tx.wait();
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      expect(balanceAfter - balanceBefore + gasUsed).to.equal(stakeAmount);
    });
  });

  describe("USDC Challenge Complete Flow", function () {
    it("should complete full USDC success flow", async function () {
      const { touchGrass, usdc, verifier, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseUnits("100", 6);
      const userBalanceStart = await usdc.balanceOf(user1.address);

      const { challengeId } = await createUSDCChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR,
        PenaltyType.DEV,
        25
      );
      const contractBalance = await usdc.balanceOf(
        await touchGrass.getAddress()
      );
      expect(contractBalance).to.equal(stakeAmount);

      await touchGrass.connect(verifier).verifySuccess(challengeId);
      await touchGrass.connect(user1).withdraw(challengeId, 0, 0);

      const userBalanceEnd = await usdc.balanceOf(user1.address);
      const fee = await touchGrass.calculateTokenFee("USDC");
      expect(userBalanceStart - userBalanceEnd).to.equal(fee);
    });
  });

  describe("Multi-User Scenarios", function () {
    it("should handle multiple concurrent challenges", async function () {
      const { touchGrass, verifier, user1, user2, user3 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseEther("0.1");

      const { challengeId: id1 } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR
      );
      const { challengeId: id2 } = await createETHChallenge(
        touchGrass,
        user2,
        stakeAmount,
        HOUR
      );
      const { challengeId: id3 } = await createETHChallenge(
        touchGrass,
        user3,
        stakeAmount,
        HOUR
      );

      await touchGrass.connect(verifier).verifySuccess(id1);
      await touchGrass.connect(verifier).verifySuccess(id3);

      await advanceTime(HOUR + 60);

      await touchGrass.connect(user1).withdraw(id1, 0, 0);
      await touchGrass.connect(user2).withdraw(id2, 0, 0);
      await touchGrass.connect(user3).withdraw(id3, 0, 0);

      const c1 = await touchGrass.challenges(id1);
      const c2 = await touchGrass.challenges(id2);
      const c3 = await touchGrass.challenges(id3);

      expect(c1.isSuccess).to.be.true;
      expect(c2.isSuccess).to.be.false;
      expect(c3.isSuccess).to.be.true;
    });
  });
});
