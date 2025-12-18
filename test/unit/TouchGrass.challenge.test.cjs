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
  MINUTE,
  VERIFICATION_BUFFER,
} = require("../helpers/constants.cjs");

describe("TouchGrass - Challenge Creation", function () {
  describe("createChallenge - ETH", function () {
    it("should create ETH challenge with valid parameters", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseEther("0.1");
      const { challengeId } = await createETHChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR,
        PenaltyType.CHARITY,
        20
      );

      expect(challengeId).to.equal(0n);
      const challenge = await touchGrass.challenges(challengeId);
      expect(challenge.staker).to.equal(user1.address);
      expect(challenge.stakeAmount).to.equal(stakeAmount);
    });

    it("should emit ChallengeCreated event", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");

      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("ETH", stakeAmount, HOUR, PenaltyType.CHARITY, 20, {
            value: stakeAmount + fee,
          })
      )
        .to.emit(touchGrass, "ChallengeCreated")
        .withArgs(0, user1.address, stakeAmount);
    });

    it("should send fee to treasury", async function () {
      const { touchGrass, treasury, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      const treasuryBalanceBefore = await ethers.provider.getBalance(
        treasury.address
      );

      await touchGrass
        .connect(user1)
        .createChallenge("ETH", stakeAmount, HOUR, PenaltyType.CHARITY, 20, {
          value: stakeAmount + fee,
        });

      const treasuryBalanceAfter = await ethers.provider.getBalance(
        treasury.address
      );
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(fee);
    });
  });

  describe("createChallenge - USDC", function () {
    it("should create USDC challenge with valid parameters", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseUnits("10", 6);
      const { challengeId } = await createUSDCChallenge(
        touchGrass,
        user1,
        stakeAmount,
        HOUR,
        PenaltyType.DEV,
        30
      );

      const challenge = await touchGrass.challenges(challengeId);
      expect(challenge.staker).to.equal(user1.address);
      expect(challenge.stakeAmount).to.equal(stakeAmount);
    });

    it("should revert if ETH sent with USDC challenge", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseUnits("10", 6);

      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("USDC", stakeAmount, HOUR, PenaltyType.CHARITY, 20, {
            value: ethers.parseEther("0.1"),
          })
      ).to.be.revertedWithCustomError(touchGrass, "InvalidPayment");
    });
  });

  describe("createChallenge - Validation", function () {
    it("should revert for unsupported token", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge(
            "UNKNOWN",
            ethers.parseEther("1"),
            HOUR,
            PenaltyType.CHARITY,
            20,
            { value: ethers.parseEther("2") }
          )
      ).to.be.revertedWithCustomError(touchGrass, "TokenNotSupported");
    });

    it("should revert for zero stake amount", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("ETH", 0, HOUR, PenaltyType.CHARITY, 20, {
            value: fee,
          })
      ).to.be.revertedWithCustomError(touchGrass, "InvalidStake");
    });

    it("should revert for stake below minimum", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const minStake = await touchGrass.calculateMinStake("ETH");
      const belowMin = minStake / 2n;
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("ETH", belowMin, HOUR, PenaltyType.CHARITY, 20, {
            value: belowMin + fee,
          })
      ).to.be.revertedWithCustomError(touchGrass, "StakeBelowMinimum");
    });

    it("should revert for duration below minimum", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("ETH", stakeAmount, 30, PenaltyType.CHARITY, 20, {
            value: stakeAmount + fee,
          })
      ).to.be.revertedWithCustomError(touchGrass, "InvalidDuration");
    });

    it("should revert for BURN penalty with less than 100%", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("ETH", stakeAmount, HOUR, PenaltyType.BURN, 50, {
            value: stakeAmount + fee,
          })
      ).to.be.revertedWithCustomError(touchGrass, "BurnPercentLessThan100");
    });

    it("should accept BURN penalty with 100%", async function () {
      const { touchGrass, user1 } = await loadFixture(deployTouchGrassFixture);
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await expect(
        touchGrass
          .connect(user1)
          .createChallenge("ETH", stakeAmount, HOUR, PenaltyType.BURN, 100, {
            value: stakeAmount + fee,
          })
      ).to.not.be.reverted;
    });
  });
});

describe("TouchGrass - Verify Success", function () {
  it("should allow verifier to mark challenge as success", async function () {
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
    const challenge = await touchGrass.challenges(challengeId);
    expect(challenge.isSuccess).to.be.true;
  });

  it("should revert if not called by verifier", async function () {
    const { touchGrass, user1, user2 } = await loadFixture(
      deployTouchGrassFixture
    );
    const { challengeId } = await createETHChallenge(
      touchGrass,
      user1,
      ethers.parseEther("0.1"),
      HOUR
    );

    await expect(
      touchGrass.connect(user2).verifySuccess(challengeId)
    ).to.be.revertedWithCustomError(touchGrass, "Unauthorized");
  });

  it("should revert if challenge already success", async function () {
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
    await expect(
      touchGrass.connect(verifier).verifySuccess(challengeId)
    ).to.be.revertedWithCustomError(touchGrass, "ChallengeAlreadySuccess");
  });

  it("should revert if verification buffer expired", async function () {
    const { touchGrass, verifier, user1 } = await loadFixture(
      deployTouchGrassFixture
    );
    const { challengeId } = await createETHChallenge(
      touchGrass,
      user1,
      ethers.parseEther("0.1"),
      HOUR
    );

    await advanceTime(HOUR + VERIFICATION_BUFFER + 60);
    await expect(
      touchGrass.connect(verifier).verifySuccess(challengeId)
    ).to.be.revertedWithCustomError(touchGrass, "TimeExpired");
  });
});
