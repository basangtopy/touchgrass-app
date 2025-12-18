const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { deployTouchGrassFixture } = require("../helpers/fixtures.cjs");
const { HOUR, ETH_PRICE, USDC_PRICE } = require("../helpers/constants.cjs");

describe("TouchGrass - Token Management", function () {
  describe("addToken", function () {
    it("should add a new token", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const dai = await MockERC20.deploy("DAI Stablecoin", "DAI");
      const MockV3Aggregator = await ethers.getContractFactory(
        "MockV3Aggregator"
      );
      const daiPriceFeed = await MockV3Aggregator.deploy(8, USDC_PRICE);

      await touchGrass
        .connect(owner)
        .addToken(
          "DAI",
          await dai.getAddress(),
          await daiPriceFeed.getAddress(),
          18,
          HOUR
        );
      const tokens = await touchGrass.getAllSupportedTokens();
      expect(tokens).to.include("DAI");
    });

    it("should revert for duplicate token", async function () {
      const { touchGrass, owner, ethPriceFeed } = await loadFixture(
        deployTouchGrassFixture
      );
      await expect(
        touchGrass
          .connect(owner)
          .addToken(
            "ETH",
            ethers.ZeroAddress,
            await ethPriceFeed.getAddress(),
            18,
            HOUR
          )
      ).to.be.revertedWithCustomError(touchGrass, "TokenAlreadySupported");
    });
  });

  describe("removeToken", function () {
    it("should remove token with no locked funds", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const dai = await MockERC20.deploy("DAI", "DAI");
      const MockV3Aggregator = await ethers.getContractFactory(
        "MockV3Aggregator"
      );
      const daiPriceFeed = await MockV3Aggregator.deploy(8, USDC_PRICE);

      await touchGrass
        .connect(owner)
        .addToken(
          "DAI",
          await dai.getAddress(),
          await daiPriceFeed.getAddress(),
          18,
          HOUR
        );
      await touchGrass.connect(owner).removeToken("DAI");
      const tokens = await touchGrass.getAllSupportedTokens();
      expect(tokens).to.not.include("DAI");
    });

    it("should revert for non-existent token", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.connect(owner).removeToken("UNKNOWN")
      ).to.be.revertedWithCustomError(touchGrass, "TokenNotFound");
    });

    it("should revert if funds are locked", async function () {
      const { touchGrass, owner, user1 } = await loadFixture(
        deployTouchGrassFixture
      );
      const stakeAmount = ethers.parseEther("0.1");
      const fee = await touchGrass.calculateTokenFee("ETH");
      await touchGrass
        .connect(user1)
        .createChallenge("ETH", stakeAmount, HOUR, 0, 20, {
          value: stakeAmount + fee,
        });
      await expect(
        touchGrass.connect(owner).removeToken("ETH")
      ).to.be.revertedWithCustomError(touchGrass, "FundsLocked");
    });
  });

  describe("Fallback Price", function () {
    it("should enable fallback price", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      const fallbackPrice = ethers.parseUnits("2500", 18);
      await touchGrass.connect(owner).enableFallbackPrice("ETH", fallbackPrice);
      const price = await touchGrass.getTokenPrice("ETH");
      expect(price).to.equal(fallbackPrice);
    });

    it("should disable fallback price", async function () {
      const { touchGrass, owner } = await loadFixture(deployTouchGrassFixture);
      await touchGrass
        .connect(owner)
        .enableFallbackPrice("ETH", ethers.parseUnits("2000", 18));
      await touchGrass.connect(owner).disableFallbackPrice("ETH");
      const tokenId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["ETH"])
      );
      const config = await touchGrass.tokenConfigs(tokenId);
      expect(config.useFallbackPrice).to.be.false;
    });
  });
});

describe("TouchGrass - Pricing", function () {
  describe("getTokenPrice", function () {
    it("should return correct price from oracle", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      const price = await touchGrass.getTokenPrice("ETH");
      expect(price).to.equal(ethers.parseUnits("3000", 18));
    });

    it("should revert for unsupported token", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      await expect(
        touchGrass.getTokenPrice("UNKNOWN")
      ).to.be.revertedWithCustomError(touchGrass, "TokenNotSupported");
    });
  });

  describe("calculateTokenFee", function () {
    it("should calculate correct ETH fee", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      const fee = await touchGrass.calculateTokenFee("ETH");
      expect(fee).to.be.gt(0);
      expect(fee).to.be.lt(ethers.parseEther("0.001"));
    });

    it("should calculate correct USDC fee", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      const fee = await touchGrass.calculateTokenFee("USDC");
      expect(fee).to.equal(500000n);
    });
  });

  describe("calculateMinStake", function () {
    it("should calculate correct ETH min stake", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      const minStake = await touchGrass.calculateMinStake("ETH");
      expect(minStake).to.be.gt(0);
      expect(minStake).to.be.lt(ethers.parseEther("0.01"));
    });

    it("should calculate correct USDC min stake", async function () {
      const { touchGrass } = await loadFixture(deployTouchGrassFixture);
      const minStake = await touchGrass.calculateMinStake("USDC");
      expect(minStake).to.equal(1000000n);
    });
  });
});
