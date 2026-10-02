import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - m535de87a", function () {
  it("should revert when selling shares verifies _BASE_TARGET_ decreases correctly", async function () {
    const [owner, user1] = await ethers.getSigners();

    // Deploy the contract - GSPFunding inherits from GSPVault and GSPStorage
    // Constructor arguments: none (ReentrancyGuard has no params)
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: Need base and quote tokens
    // Deploy mock ERC20 tokens for testing
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", ethers.parseEther("1000000"));
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", ethers.parseEther("1000000"));
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Initialize the GSPFunding contract with tokens
    // Set the base and quote tokens in storage
    await instance.connect(owner).setBaseToken(baseToken.target);
    await instance.connect(owner).setQuoteToken(quoteToken.target);

    // Fund the contract with initial liquidity
    await baseToken.connect(owner).transfer(instance.target, ethers.parseEther("10000"));
    await quoteToken.connect(owner).transfer(instance.target, ethers.parseEther("10000"));

    // Set initial reserves and targets
    await instance.connect(owner).setReserveAndTarget(
      ethers.parseEther("10000"),
      ethers.parseEther("10000"),
      ethers.parseEther("10000"),
      ethers.parseEther("10000")
    );

    // Set initial I value
    await instance.connect(owner).setI(ethers.parseEther("1"));

    // Mint some shares to user1 by buying shares
    // First, transfer some tokens to user1 for buying shares
    await baseToken.connect(owner).transfer(user1.address, ethers.parseEther("1000"));
    await quoteToken.connect(owner).transfer(user1.address, ethers.parseEther("1000"));

    // User1 approves and buys shares
    await baseToken.connect(user1).approve(instance.target, ethers.parseEther("1000"));
    await quoteToken.connect(user1).approve(instance.target, ethers.parseEther("1000"));

    // Transfer tokens to contract for buying shares
    await baseToken.connect(user1).transfer(instance.target, ethers.parseEther("500"));
    await quoteToken.connect(user1).transfer(instance.target, ethers.parseEther("500"));

    await instance.connect(user1).buyShares(user1.address);

    // Get the initial _BASE_TARGET_ before selling shares
    const initialBaseTarget = await instance._BASE_TARGET_();

    // User1 sells some shares
    const shareAmount = ethers.parseEther("100");
    const totalSupply = await instance.totalSupply();

    // Calculate expected reduction in base target
    const expectedReduction = (initialBaseTarget * shareAmount) / totalSupply;

    // Sell shares
    await instance.connect(user1).sellShares(
      shareAmount,
      user1.address,
      0,
      0,
      "0x",
      9999999999
    );

    // Get the new _BASE_TARGET_
    const newBaseTarget = await instance._BASE_TARGET_();

    // For the original contract: newBaseTarget should be LESS than initialBaseTarget
    // For the mutant (with + instead of -): newBaseTarget would be MORE than initialBaseTarget
    // So we verify that the base target decreased
    expect(newBaseTarget).to.be.lessThan(initialBaseTarget);

    // Additionally verify the exact expected value (for original contract)
    const expectedNewTarget = initialBaseTarget - (initialBaseTarget * shareAmount / totalSupply);
    expect(newBaseTarget).to.equal(expectedNewTarget);
  });
});