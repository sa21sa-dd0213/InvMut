import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

describe("GSPFunding", function () {
  let deployer: SignerWithAddress;
  let maintainer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let baseToken: Contract;
  let quoteToken: Contract;
  let gsp: Contract;

  const INITIAL_I = ethers.utils.parseEther("1"); // 1:1 price
  const INITIAL_K = ethers.utils.parseEther("0.5"); // 0.5
  const LP_FEE_RATE = ethers.utils.parseEther("0.003"); // 0.3%
  const MT_FEE_RATE = ethers.utils.parseEther("0.001"); // 0.1%

  beforeEach(async function () {
    [deployer, maintainer, user1, user2] = await ethers.getSigners();

    // Deploy mock tokens
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    baseToken = await ERC20Mock.deploy("Base Token", "BASE", 18);
    quoteToken = await ERC20Mock.deploy("Quote Token", "QUOTE", 18);

    // Deploy GSP contract
    const GSPFunding = await ethers.getContractFactory("GSPFunding");
    gsp = await GSPFunding.deploy();

    // Initialize GSP
    await gsp.initialize(
      maintainer.address,
      baseToken.address,
      quoteToken.address,
      LP_FEE_RATE,
      MT_FEE_RATE,
      INITIAL_I,
      INITIAL_K
    );

    // Mint tokens to users
    await baseToken.mint(user1.address, ethers.utils.parseEther("10000"));
    await quoteToken.mint(user1.address, ethers.utils.parseEther("10000"));
    await baseToken.mint(user2.address, ethers.utils.parseEther("10000"));
    await quoteToken.mint(user2.address, ethers.utils.parseEther("10000"));

    // Approve tokens
    await baseToken.connect(user1).approve(gsp.address, ethers.constants.MaxUint256);
    await quoteToken.connect(user1).approve(gsp.address, ethers.constants.MaxUint256);
    await baseToken.connect(user2).approve(gsp.address, ethers.constants.MaxUint256);
    await quoteToken.connect(user2).approve(gsp.address, ethers.constants.MaxUint256);
  });

  describe("buyShares", function () {
    it("should mint initial shares correctly", async function () {
      const baseAmount = ethers.utils.parseEther("100");
      const quoteAmount = ethers.utils.parseEther("100");

      await baseToken.connect(user1).transfer(gsp.address, baseAmount);
      await quoteToken.connect(user1).transfer(gsp.address, quoteAmount);

      await expect(gsp.connect(user1).buyShares(user1.address))
        .to.emit(gsp, "Mint")
        .withArgs(user1.address, ethers.utils.parseEther("100") - 1001);

      const shares = await gsp.balanceOf(user1.address);
      expect(shares).to.equal(ethers.utils.parseEther("100") - 1001);
    });

    it("should mint additional shares proportionally", async function () {
      // First buy
      const baseAmount1 = ethers.utils.parseEther("100");
      const quoteAmount1 = ethers.utils.parseEther("100");
      await baseToken.connect(user1).transfer(gsp.address, baseAmount1);
      await quoteToken.connect(user1).transfer(gsp.address, quoteAmount1);
      await gsp.connect(user1).buyShares(user1.address);

      // Second buy
      const baseAmount2 = ethers.utils.parseEther("50");
      const quoteAmount2 = ethers.utils.parseEther("50");
      await baseToken.connect(user2).transfer(gsp.address, baseAmount2);
      await quoteToken.connect(user2).transfer(gsp.address, quoteAmount2);
      await gsp.connect(user2).buyShares(user2.address);

      const shares1 = await gsp.balanceOf(user1.address);
      const shares2 = await gsp.balanceOf(user2.address);
      
      expect(shares2).to.equal(shares1.div(2));
    });

    it("should revert if no base input", async function () {
      await quoteToken.connect(user1).transfer(gsp.address, ethers.utils.parseEther("100"));
      
      await expect(
        gsp.connect(user1).buyShares(user1.address)
      ).to.be.revertedWith("NO_BASE_INPUT");
    });
  });

  describe("sellShares", function () {
    beforeEach(async function () {
      const baseAmount = ethers.utils.parseEther("1000");
      const quoteAmount = ethers.utils.parseEther("1000");
      await baseToken.connect(user1).transfer(gsp.address, baseAmount);
      await quoteToken.connect(user1).transfer(gsp.address, quoteAmount);
      await gsp.connect(user1).buyShares(user1.address);
    });

    it("should sell shares correctly", async function () {
      const sharesToSell = ethers.utils.parseEther("100");
      const initialBalance = await gsp.balanceOf(user1.address);

      await expect(
        gsp.connect(user1).sellShares(
          sharesToSell,
          user1.address,
          0,
          0,
          "0x",
          ethers.constants.MaxUint256
        )
      ).to.emit(gsp, "Burn");

      const finalBalance = await gsp.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance.sub(sharesToSell));
    });

    it("should revert if deadline expired", async function () {
      await expect(
        gsp.connect(user1).sellShares(
          ethers.utils.parseEther("100"),
          user1.address,
          0,
          0,
          "0x",
          0
        )
      ).to.be.revertedWith("TIME_EXPIRED");
    });

    it("should revert if insufficient shares", async function () {
      await expect(
        gsp.connect(user2).sellShares(
          ethers.utils.parseEther("100"),
          user2.address,
          0,
          0,
          "0x",
          ethers.constants.MaxUint256
        )
      ).to.be.revertedWith("GLP_NOT_ENOUGH");
    });
  });

  describe("PMM functions", function () {
    beforeEach(async function () {
      const baseAmount = ethers.utils.parseEther("1000");
      const quoteAmount = ethers.utils.parseEther("1000");
      await baseToken.connect(user1).transfer(gsp.address, baseAmount);
      await quoteToken.connect(user1).transfer(gsp.address, quoteAmount);
      await gsp.connect(user1).buyShares(user1.address);
    });

    it("should get correct PMM state", async function () {
      const state = await gsp.getPMMState();
      expect(state.i).to.equal(INITIAL_I);
      expect(state.K).to.equal(INITIAL_K);
    });

    it("should get correct mid price", async function () {
      const midPrice = await gsp.getMidPrice();
      expect(midPrice).to.be.closeTo(ethers.utils.parseEther("1"), ethers.utils.parseEther("0.01"));
    });
  });

  describe("Admin functions", function () {
    it("should adjust price within limit", async function () {
      const newPrice = ethers.utils.parseEther("1.05");
      await gsp.connect(maintainer).adjustPrice(newPrice);
      
      const price = await gsp._I_();
      expect(price).to.equal(newPrice);
    });

    it("should revert if price change exceeds limit", async function () {
      const newPrice = ethers.utils.parseEther("2");
      await expect(
        gsp.connect(maintainer).adjustPrice(newPrice)
      ).to.be.revertedWith("EXCEED_PRICE_LIMIT");
    });

    it("should adjust MT fee rate", async function () {
      const newFeeRate = ethers.utils.parseEther("0.02");
      await gsp.connect(maintainer).adjustMtFeeRate(newFeeRate);
      
      const feeRate = await gsp._MT_FEE_RATE_();
      expect(feeRate).to.equal(newFeeRate);
    });

    it("should only allow maintainer to call admin functions", async function () {
      await expect(
        gsp.connect(user1).adjustPrice(ethers.utils.parseEther("1.01"))
      ).to.be.revertedWith("ACCESS_DENIED");
    });
  });
});