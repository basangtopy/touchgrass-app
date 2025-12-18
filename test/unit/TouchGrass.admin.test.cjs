const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {
  deployTouchGrassFixture,
  advanceTime,
} = require("../helpers/fixtures.cjs");
const {
  DAY,
  HOUR,
  OWNERSHIP_TRANSFER_DELAY,
  FEE_UPDATE_DELAY,
  MIN_LOCK_MULTIPLIER,
  MAX_LOCK_MULTIPLIER,
  ABSOLUTE_MIN_PENALTY,
  ABSOLUTE_MAX_MIN_PENALTY,
} = require("../helpers/constants.cjs");

describe("TouchGrass - Admin Functions", function () {
  describe("setVerifier", function () {
    it("should update verifier address", async function () {
      const { touchGrass, owner, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      await touchGrass.connect(owner).setVerifier(user1.address);
      expect(await touchGrass.verifier()).to.equal(user1.address);
    });

    it("should revert for zero address", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.connect(owner).setVerifier(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(touchGrass, "InvalidAddress");
    });

    it("should revert if verifier is owner", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.connect(owner).setVerifier(owner.address)
      ).to.be.revertedWithCustomError(touchGrass, "VerifierCannotBeOwner");
    });

    it("should revert if not owner", async function () {
      const { touchGrass, user1, user2 } = await loadFixture(
        deployTouchGrassFixture
      );
      await expect(
        touchGrass.connect(user1).setVerifier(user2.address)
      ).to.be.revertedWithCustomError(touchGrass, "OwnableUnauthorizedAccount");
    });
  });

  describe("updateDurationBounds", function () {
    it("should update min and max duration", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await touchGrass.connect(owner).updateDurationBounds(5, 30);
      expect(await touchGrass.MIN_DURATION()).to.equal(5 * 60);
      expect(await touchGrass.MAX_DURATION()).to.equal(30 * DAY);
    });

    it("should revert if min below absolute minimum", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.connect(owner).updateDurationBounds(0, 30)
      ).to.be.revertedWithCustomError(touchGrass, "MinDurationBelowAbsolute");
    });

    it("should revert if max above absolute maximum", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.connect(owner).updateDurationBounds(1, 800)
      ).to.be.revertedWithCustomError(touchGrass, "MaxDurationAboveAbsolute");
    });
  });

  describe("setLockMultiplier", function () {
    it("should update lock multiplier", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await touchGrass.connect(owner).setLockMultiplier(10);
      expect(await touchGrass.LOCK_MULTIPLIER()).to.equal(10);
    });

    it("should revert if below minimum", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.connect(owner).setLockMultiplier(MIN_LOCK_MULTIPLIER - 1)
      ).to.be.revertedWithCustomError(touchGrass, "LockMultiplierTooLow");
    });

    it("should revert if above maximum", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.connect(owner).setLockMultiplier(MAX_LOCK_MULTIPLIER + 1)
      ).to.be.revertedWithCustomError(touchGrass, "LockMultiplierTooHigh");
    });
  });

  describe("Fee Updates (Timelock)", function () {
    it("should schedule fee update", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await touchGrass.connect(owner).scheduleUSDCFeeUpdate(1);
      const pending = await touchGrass.pendingUSDCFeeUpdate();
      expect(pending.isPending).to.be.true;
    });

    it("should execute fee update after delay", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await touchGrass.connect(owner).scheduleUSDCFeeUpdate(1);
      await advanceTime(FEE_UPDATE_DELAY + 60);
      await touchGrass.executeUSDCFeeUpdate();
      expect(await touchGrass.usdcFee()).to.equal(1000000n);
    });

    it("should cancel fee update", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await touchGrass.connect(owner).scheduleUSDCFeeUpdate(1);
      await touchGrass.connect(owner).cancelUSDCFeeUpdate();
      const pending = await touchGrass.pendingUSDCFeeUpdate();
      expect(pending.isPending).to.be.false;
    });
  });

  describe("Pause/Unpause", function () {
    it("should pause contract", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await touchGrass.connect(owner).pause();
      expect(await touchGrass.paused()).to.be.true;
    });

    it("should unpause contract", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await touchGrass.connect(owner).pause();
      await touchGrass.connect(owner).unpause();
      expect(await touchGrass.paused()).to.be.false;
    });

    it("should prevent challenge creation when paused", async function () {
      const { touchGrass, owner, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      await touchGrass.connect(owner).pause();
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("ETH", stakeAmount, HOUR, 0, 20, {
            value: stakeAmount + fee,
          })
      ).to.be.revertedWithCustomError(touchGrass, "EnforcedPause");
    });
  });
});
