import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant mcf252781 - kill with exact baseMinAmount", function () {
  it("should revert on mutant when baseAmount equals baseMinAmount due to > instead of >=", async function () {
    const [owner, user1, user2] = await ethers.getSigners();

    // Deploy with constructor arguments (using mock ERC20 tokens)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20.deploy("Base", "BASE", 18);
    const quoteToken = await MockERC20.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy(
      baseToken.target,
      quoteToken.target,
      0, // _MT_FEE_RATE_
      0, // _LP_FEE_RATE_
      ethers.parseEther("1"), // _I_ (initial price)
      ethers.parseEther("0.5"), // _K_
      ethers.parseEther("1") // _PRICE_LIMIT_
    );
    await instance.waitForDeployment();

    // Fund the contract with initial liquidity via buyShares
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("1000");
    await baseToken.mint(owner.address, initialBase);
    await quoteToken.mint(owner.address, initialQuote);
    await baseToken.connect(owner).transfer(instance.target, initialBase);
    await quoteToken.connect(owner).transfer(instance.target, initialQuote);
    
    // Call buyShares to initialize the pool
    await instance.connect(owner).buyShares(owner.address);
    
    // Now user1 buys some shares to get LP tokens
    const userBase = ethers.parseEther("100");
    const userQuote = ethers.parseEther("100");
    await baseToken.mint(user1.address, userBase);
    await quoteToken.mint(user1.address, userQuote);
    await baseToken.connect(user1).transfer(instance.target, userBase);
    await quoteToken.connect(user1).transfer(instance.target, userQuote);
    await instance.connect(user1).buyShares(user1.address);

    // Get user1's share balance
    const userShares = await instance.balanceOf(user1.address);
    const totalSupply = await instance.totalSupply();
    
    // Calculate exact baseAmount that will be returned
    const baseBalance = await baseToken.balanceOf(instance.target);
    const baseAmount = (baseBalance * userShares) / totalSupply;
    
    // Set baseMinAmount to be exactly equal to baseAmount
    const baseMinAmount = baseAmount;
    const quoteMinAmount = 0n;

    // This should succeed on original (>=) but fail on mutant (>)
    await expect(
      instance.connect(user1).sellShares(
        userShares,
        user2.address,
        baseMinAmount,
        quoteMinAmount,
        "0x",
        9999999999n
      )
    ).to.be.revertedWith("WITHDRAW_NOT_ENOUGH");
  });
});