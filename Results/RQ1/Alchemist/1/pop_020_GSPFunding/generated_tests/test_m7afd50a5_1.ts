import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m7afd50a5 - kill test", function () {
  it("should revert when baseAmount > baseMinAmount due to mutant replacing >= with ==", async function () {
    const [owner, user1] = await ethers.getSigners();

    // Deploy the contract with mock token addresses and initial parameters
    const Factory = await ethers.getContractFactory("GSPFunding");
    
    // We need to deploy mock ERC20 tokens first
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20Factory.deploy("Base", "BASE", 18);
    const quoteToken = await MockERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding - constructor likely expects: baseToken, quoteToken, maintainer, lpFeeRate, mtFeeRate, i, k
    const instance = await Factory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      owner.address,
      ethers.parseEther("0.003"), // lpFeeRate 0.3%
      ethers.parseEther("0.001"), // mtFeeRate 0.1%
      ethers.parseEther("1"),     // i = 1
      ethers.parseEther("0.5")    // k = 0.5
    );
    await instance.waitForDeployment();

    // Fund the contract with initial liquidity
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("1000");
    await baseToken.transfer(await instance.getAddress(), initialBase);
    await quoteToken.transfer(await instance.getAddress(), initialQuote);

    // User1 buys shares to become a liquidity provider
    await baseToken.connect(user1).approve(await instance.getAddress(), ethers.parseEther("100"));
    await quoteToken.connect(user1).approve(await instance.getAddress(), ethers.parseEther("100"));
    await baseToken.transfer(user1.address, ethers.parseEther("100"));
    await quoteToken.transfer(user1.address, ethers.parseEther("100"));

    await instance.connect(user1).buyShares(user1.address);

    // Get user1's share balance
    const userShares = await instance.balanceOf(user1.address);
    expect(userShares).to.be.gt(0);

    // Now user1 tries to sell a portion of shares
    const sellAmount = userShares / 2n; // Sell half the shares
    
    // Calculate expected baseAmount - it will be strictly greater than baseMinAmount
    // baseMinAmount set to 0 will pass on original but fail on mutant
    const baseMinAmount = ethers.parseEther("0.01"); // Set low so baseAmount > baseMinAmount
    const quoteMinAmount = ethers.parseEther("0");
    
    // On the mutant, this should revert because baseAmount will be > baseMinAmount (not ==)
    await expect(
      instance.connect(user1).sellShares(
        sellAmount,
        user1.address,
        baseMinAmount,
        quoteMinAmount,
        "0x",
        Math.floor(Date.now() / 1000) + 3600 // deadline 1 hour from now
      )
    ).to.be.reverted;
  });
});