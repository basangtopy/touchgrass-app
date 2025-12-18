const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {
  DEFAULT_FEE,
  DEFAULT_MIN_STAKE,
  ETH_PRICE,
  USDC_PRICE,
  HOUR,
} = require("../helpers/constants.cjs");

describe("TouchGrass - Constructor", function () {
  let MockV3Aggregator, MockERC20, TouchGrass;
  let owner, verifier, charity, treasury, user1;

  beforeEach(async function () {
    [owner, verifier, charity, treasury, user1] = await ethers.getSigners();
    MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    MockERC20 = await ethers.getContractFactory("MockERC20");
    TouchGrass = await ethers.getContractFactory("TouchGrass");
  });

  describe("Deployment Success", function () {
    it("should deploy with valid parameters", async function () {
      const touchGrass = await TouchGrass.deploy(
        verifier.address,
        charity.address,
        treasury.address,
        DEFAULT_FEE,
        DEFAULT_MIN_STAKE
      );
      expect(await touchGrass.verifier()).to.equal(verifier.address);
      expect(await touchGrass.charityWallet()).to.equal(charity.address);
      expect(await touchGrass.treasuryWallet()).to.equal(treasury.address);
    });

    it("should set owner correctly", async function () {
      const touchGrass = await TouchGrass.deploy(
        verifier.address,
        charity.address,
        treasury.address,
        DEFAULT_FEE,
        DEFAULT_MIN_STAKE
      );
      expect(await touchGrass.owner()).to.equal(owner.address);
    });

    it("should set default duration bounds", async function () {
      const touchGrass = await TouchGrass.deploy(
        verifier.address,
        charity.address,
        treasury.address,
        DEFAULT_FEE,
        DEFAULT_MIN_STAKE
      );
      expect(await touchGrass.MIN_DURATION()).to.equal(60);
      expect(await touchGrass.MAX_DURATION()).to.equal(365 * 24 * 60 * 60);
    });

    it("should set charity and treasury as trusted recipients", async function () {
      const touchGrass = await TouchGrass.deploy(
        verifier.address,
        charity.address,
        treasury.address,
        DEFAULT_FEE,
        DEFAULT_MIN_STAKE
      );
      expect(await touchGrass.trustedRecipients(charity.address)).to.be.true;
      expect(await touchGrass.trustedRecipients(treasury.address)).to.be.true;
    });
  });

  describe("Deployment Failures", function () {
    it("should revert if verifier is zero address", async function () {
      await expect(
        TouchGrass.deploy(
          ethers.ZeroAddress,
          charity.address,
          treasury.address,
          DEFAULT_FEE,
          DEFAULT_MIN_STAKE
        )
      ).to.be.revertedWithCustomError(TouchGrass, "InvalidAddress");
    });

    it("should revert if charity is zero address", async function () {
      await expect(
        TouchGrass.deploy(
          verifier.address,
          ethers.ZeroAddress,
          treasury.address,
          DEFAULT_FEE,
          DEFAULT_MIN_STAKE
        )
      ).to.be.revertedWithCustomError(TouchGrass, "InvalidAddress");
    });

    it("should revert if treasury is zero address", async function () {
      await expect(
        TouchGrass.deploy(
          verifier.address,
          charity.address,
          ethers.ZeroAddress,
          DEFAULT_FEE,
          DEFAULT_MIN_STAKE
        )
      ).to.be.revertedWithCustomError(TouchGrass, "InvalidAddress");
    });

    it("should revert if verifier equals charity", async function () {
      await expect(
        TouchGrass.deploy(
          verifier.address,
          verifier.address,
          treasury.address,
          DEFAULT_FEE,
          DEFAULT_MIN_STAKE
        )
      ).to.be.revertedWithCustomError(TouchGrass, "DuplicateAddresses");
    });

    it("should revert if verifier equals treasury", async function () {
      await expect(
        TouchGrass.deploy(
          verifier.address,
          charity.address,
          verifier.address,
          DEFAULT_FEE,
          DEFAULT_MIN_STAKE
        )
      ).to.be.revertedWithCustomError(TouchGrass, "DuplicateAddresses");
    });

    it("should revert if charity equals treasury", async function () {
      await expect(
        TouchGrass.deploy(
          verifier.address,
          charity.address,
          charity.address,
          DEFAULT_FEE,
          DEFAULT_MIN_STAKE
        )
      ).to.be.revertedWithCustomError(TouchGrass, "DuplicateAddresses");
    });

    it("should revert if verifier is owner", async function () {
      await expect(
        TouchGrass.deploy(
          owner.address,
          charity.address,
          treasury.address,
          DEFAULT_FEE,
          DEFAULT_MIN_STAKE
        )
      ).to.be.revertedWithCustomError(TouchGrass, "VerifierCannotBeOwner");
    });
  });
});
