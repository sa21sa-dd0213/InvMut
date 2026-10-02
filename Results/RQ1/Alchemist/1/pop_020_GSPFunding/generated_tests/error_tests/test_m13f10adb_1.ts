import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test - m13f10adb", function () {
  it("should detect exponentiation mutation in sellShares by using shareAmount=2 and checking quoteAmount calculation", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the contract - GSPFunding has no constructor arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: Initialize the contract with base and quote tokens
    // We need mock ERC20 tokens for testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Initialize the GSPFunding contract with the tokens
    // We need to set up the initial state by calling internal functions via the maintainer
    // First, set the maintainer
    await instance.setMaintainer(owner.address);
    
    // Set the tokens
    await instance.setBaseToken(baseToken.target);
    await instance.setQuoteToken(quoteToken.target);
    
    // Mint initial tokens to the contract for reserves
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("1000");
    await baseToken.mint(instance.target, initialBase);
    await quoteToken.mint(instance.target, initialQuote);
    
    // Set initial reserves and targets via the internal _setReserve mechanism
    // We need to call buyShares first to set up the initial state
    // First, give user some tokens to buy shares
    const userBase = ethers.parseEther("100");
    const userQuote = ethers.parseEther("100");
    await baseToken.mint(user.address, userBase);
    await quoteToken.mint(user.address, userQuote);
    
    // User approves tokens and buys shares
    await baseToken.connect(user).approve(instance.target, userBase);
    await quoteToken.connect(user).approve(instance.target, userQuote);
    
    // Transfer tokens to contract to simulate buying shares
    await baseToken.connect(user).transfer(instance.target, userBase);
    await quoteToken.connect(user).transfer(instance.target, userQuote);
    
    // Call buyShares to initialize the pool
    await instance.connect(user).buyShares(user.address);
    
    // Now the pool has initial liquidity
    // Let's get the current state to calculate expected values
    const totalSupply = await instance.totalSupply();
    const userShares = await instance.balanceOf(user.address);
    
    // Add more tokens to the contract to increase reserves for the sell
    const additionalBase = ethers.parseEther("10");
    const additionalQuote = ethers.parseEther("10");
    await baseToken.mint(instance.target, additionalBase);
    await quoteToken.mint(instance.target, additionalQuote);
    
    // Sync to update reserves
    await instance.sync();
    
    // Get current reserves
    const baseReserve = await instance._BASE_RESERVE_();
    const quoteReserve = await instance._QUOTE_RESERVE_();
    const mtFeeBase = await instance._MT_FEE_BASE_();
    const mtFeeQuote = await instance._MT_FEE_QUOTE_();
    
    // Calculate the expected quoteAmount using the ORIGINAL formula: quoteBalance * shareAmount / totalShares
    const quoteBalance = quoteReserve - BigInt(mtFeeQuote);
    const totalShares = await instance.totalSupply();
    const shareAmount = 2; // Use shareAmount = 2 to clearly distinguish * from **
    
    // Expected with original formula: quoteBalance * 2 / totalShares
    const expectedQuoteAmount = (quoteBalance * BigInt(2)) / totalShares;
    
    // Set minimum amounts to pass the check
    const baseMinAmount = 0;
    const quoteMinAmount = expectedQuoteAmount; // Set exactly to expected value
    
    // Now call sellShares with shareAmount = 2
    // If the mutant is present, quoteAmount will be quoteBalance ** 2 / totalShares instead of quoteBalance * 2 / totalShares
    // This will be a much larger number and will likely revert or return wrong value
    
    // We expect the transaction to either revert (if quoteMinAmount is not met) or return a different value
    // Since the mutant calculates quoteBalance^2 / totalShares, the result will be much larger
    // and likely exceed the actual quote balance available, causing a revert in _transferQuoteOut
    
    await expect(
      instance.connect(user).sellShares(
        shareAmount,
        user.address,
        baseMinAmount,
        quoteMinAmount,
        "0x",
        ethers.MaxUint256
      )
    ).to.be.reverted; // The mutant will revert due to insufficient balance or incorrect calculation
  });
});