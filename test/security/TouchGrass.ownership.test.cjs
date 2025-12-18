const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {
  deployTouchGrassFixture,
  advanceTime,
} = require("../helpers/fixtures.cjs");
const { OWNERSHIP_TRANSFER_DELAY, HOUR } = require("../helpers/constants.cjs");

describe("TouchGrass - Ownership Security", function () {
  describe("Two-Step Ownership Transfer", function () {
    it("should initiate ownership transfer", async function () {
      const { touchGrass, owner, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      await touchGrass.connect(owner).transferOwnership(user1.address);
      expect(await touchGrass.pendingOwner()).to.equal(user1.address);
    });

    it("should require delay before acceptance", async function () {
      const { touchGrass, owner, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      await touchGrass.connect(owner).transferOwnership(user1.address);
      await expect(
        touchGrass.connect(user1).acceptOwnership()
      ).to.be.revertedWithCustomError(touchGrass, "TransferDelayNotMet");
    });

    it("should allow acceptance after delay", async function () {
      const { touchGrass, owner, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      await touchGrass.connect(owner).transferOwnership(user1.address);
      await advanceTime(OWNERSHIP_TRANSFER_DELAY + 60);
      await touchGrass.connect(user1).acceptOwnership();
      expect(await touchGrass.owner()).to.equal(user1.address);
    });

    it("should allow cancellation of pending transfer", async function () {
      const { touchGrass, owner, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      await touchGrass.connect(owner).transferOwnership(user1.address);
      await touchGrass.connect(owner).cancelOwnershipTransfer();
      await advanceTime(OWNERSHIP_TRANSFER_DELAY + 60);
      // After cancellation, user1 should not be pending owner
      expect(await touchGrass.pendingOwner()).to.not.equal(user1.address);
    });

    it("should prevent transfer to zero address", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(touchGrass, "TransferToZeroAddress");
    });
  });
});

describe("TouchGrass - Reentrancy Protection", function () {
  it("should prevent double withdrawal", async function () {
    const { touchGrass, verifier, user1 } = await loadFixture(
      deployTouchGrassFixture
    );
    const stakeAmount = ethers.parseEther("0.1");
    const fee = await touchGrass.calculateTokenFee("ETH");

    await touchGrass
      .connect(user1)
      .createChallenge("ETH", stakeAmount, HOUR, 0, 20, {
        value: stakeAmount + fee,
      });
    await touchGrass.connect(verifier).verifySuccess(0);
    await expect(touchGrass.connect(user1).withdraw(0, 0, 0)).to.not.be
      .reverted;
    await expect(
      touchGrass.connect(user1).withdraw(0, 0, 0)
    ).to.be.revertedWithCustomError(touchGrass, "ChallengeAlreadyWithdrawn");
  });
});

describe("TouchGrass - Malicious Token Protection", function () {
  it("should handle malicious token registration", async function () {
    const { touchGrass } = await loadFixture(deployTouchGrassFixture);
    const MaliciousToken = await ethers.getContractFactory("MaliciousToken");
    const malToken = await MaliciousToken.deploy();
    const MockV3Aggregator = await ethers.getContractFactory(
      "MockV3Aggregator"
    );
    const malPriceFeed = await MockV3Aggregator.deploy(8, 100000000);

    await touchGrass.addToken(
      "MAL",
      await malToken.getAddress(),
      await malPriceFeed.getAddress(),
      18,
      HOUR
    );
    const tokens = await touchGrass.getAllSupportedTokens();
    expect(tokens).to.include("MAL");
  });
});
