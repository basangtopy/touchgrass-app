const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {
  deployTouchGrassFixture,
  createETHChallenge,
  advanceTime,
  calculatePenalty,
} = require("../helpers/fixtures.cjs");
const {
  PenaltyType,
  HOUR,
  DEFAULT_LOCK_MULTIPLIER,
  DEFAULT_GRACE_PERIOD,
  DEAD_ADDRESS,
} = require("../helpers/constants.cjs");

describe("TouchGrass - Withdrawal", function () {
  describe("Successful Challenge Withdrawal", function () {
    it("should allow staker to withdraw after success verification", async function () {
      const { touchGrass, verifier, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseEther("0.1");
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR
      );

      await touchGrass.connect(verifier).verifySuccess(challengeId);
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await touchGrass.connect(user1).withdraw(challengeId, 0, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(stakeAmount);
    });

    it("should mark challenge as withdrawn", async function () {
      const { touchGrass, verifier, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        ethers.parseEther("0.1"),
        HOUR
      );

      await touchGrass.connect(verifier).verifySuccess(challengeId);
      await touchGrass.connect(user1).withdraw(challengeId, 0, 0);
      const challenge = await touchGrass.challenges(challengeId);
      expect(challenge.isWithdrawn).to.be.true;
    });
  });

  describe("Failed Challenge Withdrawal", function () {
    it("should send penalty to charity for CHARITY type", async function () {
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

      const expectedPenalty = calculatePenalty(stakeAmount, penaltyPercent);
      expect(charityBalanceAfter - charityBalanceBefore).to.equal(
        expectedPenalty
      );
    });

    it("should send penalty to treasury for DEV type", async function () {
      const { touchGrass, treasury, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseEther("1");
      const penaltyPercent = 40;
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR,
        PenaltyType.DEV,
        penaltyPercent
      );

      await advanceTime(HOUR + 60);
      const treasuryBalanceBefore = await ethers.provider.getBalance(
        treasury.address
      );
      await touchGrass.connect(user1).withdraw(challengeId, 0, 0);
      const treasuryBalanceAfter = await ethers.provider.getBalance(
        treasury.address
      );

      const expectedPenalty = calculatePenalty(stakeAmount, penaltyPercent);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(
        expectedPenalty
      );
    });

    it("should send 100% to dead address for BURN type", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseEther("1");
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR,
        PenaltyType.BURN,
        100
      );

      await advanceTime(HOUR + 60);
      const deadBalanceBefore = await ethers.provider.getBalance(DEAD_ADDRESS);
      await touchGrass.connect(user1).withdraw(challengeId, 0, 0);
      const deadBalanceAfter = await ethers.provider.getBalance(DEAD_ADDRESS);

      expect(deadBalanceAfter - deadBalanceBefore).to.equal(stakeAmount);
    });
  });

  describe("LOCK Penalty", function () {
    it("should prevent withdrawal during lock period", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        ethers.parseEther("0.1"),
        HOUR,
        PenaltyType.LOCK,
        30
      );

      await advanceTime(HOUR + 60);
      await expect(
        touchGrass.connect(user1).withdraw(challengeId, 0, 0)
      ).to.be.revertedWithCustomError(touchGrass, "FundsLocked");
    });

    it("should allow withdrawal after lock period", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseEther("0.1");
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR,
        PenaltyType.LOCK,
        30
      );

      const lockTime = HOUR + HOUR * DEFAULT_LOCK_MULTIPLIER;
      await advanceTime(lockTime + 60);

      const balanceBefore = await ethers.provider.getBalance(user1.address);
      const tx = await touchGrass.connect(user1).withdraw(challengeId, 0, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(user1.address);

      expect(balanceAfter - balanceBefore + gasUsed).to.equal(stakeAmount);
    });
  });

  describe("Withdrawal Validation", function () {
    it("should revert if not staker", async function () {
      const { touchGrass, verifier, user1, user2 } = await loadFixture(
        deployTouchGrassFixture
      );
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        ethers.parseEther("0.1"),
        HOUR
      );

      await touchGrass.connect(verifier).verifySuccess(challengeId);
      await expect(
        touchGrass.connect(user2).withdraw(challengeId, 0, 0)
      ).to.be.revertedWithCustomError(touchGrass, "Unauthorized");
    });

    it("should revert if already withdrawn", async function () {
      const { touchGrass, verifier, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        ethers.parseEther("0.1"),
        HOUR
      );

      await touchGrass.connect(verifier).verifySuccess(challengeId);
      await touchGrass.connect(user1).withdraw(challengeId, 0, 0);
      await expect(
        touchGrass.connect(user1).withdraw(challengeId, 0, 0)
      ).to.be.revertedWithCustomError(touchGrass, "ChallengeAlreadyWithdrawn");
    });

    it("should revert if challenge still active", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        ethers.parseEther("0.1"),
        HOUR
      );

      await expect(
        touchGrass.connect(user1).withdraw(challengeId, 0, 0)
      ).to.be.revertedWithCustomError(touchGrass, "ChallengeActive");
    });
  });
});

describe("TouchGrass - Sweep Penalty", function () {
  it("should allow staker to sweep immediately after expiry", async function () {
    const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
    const { challengeId } = await createETHChallenge(
      touchGrass,
      user1,
      ethers.parseEther("0.1"),
      HOUR,
      PenaltyType.CHARITY,
      30
    );

    await advanceTime(HOUR + 60);
    await expect(touchGrass.connect(user1).sweepPenalty(challengeId)).to.not.be
      .reverted;
  });

  it("should revert for owner during grace period", async function () {
    const { touchGrass, owner, user1 } = await loadFixture(
      deployTouchGrassFixture
    );
    const { challengeId } = await createETHChallenge(
      touchGrass,
      user1,
      ethers.parseEther("0.1"),
      HOUR,
      PenaltyType.CHARITY,
      30
    );

    await advanceTime(HOUR + 60);
    await expect(
      touchGrass.connect(owner).sweepPenalty(challengeId)
    ).to.be.revertedWithCustomError(touchGrass, "GracePeriodActive");
  });

  it("should allow owner to sweep after grace period", async function () {
    const { touchGrass, owner, user1 } = await loadFixture(
      deployTouchGrassFixture
    );
    const { challengeId } = await createETHChallenge(
      touchGrass,
      user1,
      ethers.parseEther("0.1"),
      HOUR,
      PenaltyType.CHARITY,
      30
    );

    await advanceTime(HOUR + DEFAULT_GRACE_PERIOD + 60);
    await expect(touchGrass.connect(owner).sweepPenalty(challengeId)).to.not.be
      .reverted;
  });

  it("should revert for LOCK penalty type", async function () {
    const { touchGrass, owner, user1 } = await loadFixture(
      deployTouchGrassFixture
    );
    const { challengeId } = await createETHChallenge(
      touchGrass,
      user1,
      ethers.parseEther("0.1"),
      HOUR,
      PenaltyType.LOCK,
      30
    );

    await advanceTime(HOUR + DEFAULT_GRACE_PERIOD + 60);
    await expect(
      touchGrass.connect(owner).sweepPenalty(challengeId)
    ).to.be.revertedWithCustomError(touchGrass, "CannotSweepLock");
  });
});
