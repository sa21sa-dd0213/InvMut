import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant test - kill mb0f0649e (division replaced with addition in sellShares)", function () {
  it("should kill the mutant by verifying proportional share redemption calculation", async function () {
    const [owner, user1] = await ethers.getSigners();

    // Deploy the GSPFunding contract
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    const gsp = await GSPFundingFactory.deploy();
    await gsp.waitForDeployment();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Initialize the GSP contract with tokens and parameters
    // First set the base and quote tokens
    await gsp.connect(owner).setBaseToken(baseToken.target);
    await gsp.connect(owner).setQuoteToken(quoteTarget.target);
    
    // Set initial parameters
    await gsp.connect(owner).setI(ethers.parseEther("1")); // i = 1
    await gsp.connect(owner).setK(ethers.parseEther("0.5")); // K = 0.5
    await gsp.connect(owner).setMtFeeRate(0);
    await gsp.connect(owner).setLpFeeRate(0);

    // Mint tokens to user1 and approve the GSP contract
    const initialBaseAmount = ethers.parseEther("10000");
    const initialQuoteAmount = ethers.parseEther("10000");
    
    await baseToken.mint(user1.address, initialBaseAmount);
    await quoteToken.mint(user1.address, initialQuoteAmount);
    
    await baseToken.connect(user1).approve(gsp.target, ethers.MaxUint256);
    await quoteToken.connect(user1).approve(gsp.target, ethers.MaxUint256);

    // Transfer tokens to GSP to simulate initial liquidity
    await baseToken.connect(user1).transfer(gsp.target, ethers.parseEther("1000"));
    await quoteToken.connect(user1).transfer(gsp.target, ethers.parseEther("1000"));

    // Set initial reserves and targets
    await gsp.connect(owner).setBaseReserve(ethers.parseEther("1000"));
    await gsp.connect(owner).setQuoteReserve(ethers.parseEther("1000"));
    await gsp.connect(owner).setBaseTarget(ethers.parseEther("1000"));
    await gsp.connect(owner).setQuoteTarget(ethers.parseEther("1000"));
    await gsp.connect(owner).setTotalSupply(ethers.parseEther("1000"));
    
    // Mint shares to user1 so they can sell them
    await gsp.connect(owner).mintShares(user1.address, ethers.parseEther("100"));

    // Now user1 sells 10 shares
    const shareAmount = ethers.parseEther("10");
    const totalShares = await gsp.totalSupply();
    const baseBalanceBefore = await baseToken.balanceOf(gsp.target);
    
    // Expected baseAmount = baseBalance * shareAmount / totalShares
    const expectedBaseAmount = (baseBalanceBefore * shareAmount) / totalShares;

    // Execute sellShares
    const tx = await gsp.connect(user1).sellShares(
      shareAmount,
      user1.address,
      0, // baseMinAmount
      0, // quoteMinAmount
      "0x", // data
      Math.floor(Date.now() / 1000) + 3600 // deadline
    );
    await tx.wait();

    // Check the actual baseAmount received by user1
    const baseBalanceAfter = await baseToken.balanceOf(user1.address);
    const actualBaseAmount = baseBalanceAfter;

    // The mutant calculates baseAmount = baseBalance * shareAmount + totalShares
    // which would be a much larger value than the correct proportional amount
    // In the original, it should be exactly expectedBaseAmount
    // In the mutant, it would be baseBalance * shareAmount + totalShares which is wrong
    expect(actualBaseAmount).to.equal(expectedBaseAmount);
  });
});