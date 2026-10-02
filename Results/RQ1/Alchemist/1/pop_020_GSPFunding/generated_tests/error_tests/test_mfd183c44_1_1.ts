import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant mfd183c44 test", function () {
  it("should detect the mutant that replaces + with * in _QUOTE_TARGET_ update during buyShares", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract - GSPFunding has no constructor arguments
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock ERC20 tokens for testing
    const BaseToken = await ethers.getContractFactory("ERC20Mock");
    const QuoteToken = await ethers.getContractFactory("ERC20Mock");

    const baseToken = await BaseToken.deploy("Base", "BASE", 18);
    const quoteToken = await QuoteToken.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Setup initial parameters
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("2000");
    const initialI = ethers.parseEther("2"); // price ratio
    const initialK = ethers.parseEther("0.5"); // K parameter

    // Mint tokens to owner
    await baseToken.mint(owner.address, ethers.parseEther("100000"));
    await quoteToken.mint(owner.address, ethers.parseEther("100000"));

    // Transfer tokens to the contract
    await baseToken.transfer(instance.target, baseAmount);
    await quoteToken.transfer(instance.target, quoteAmount);

    // First buy to initialize (totalSupply == 0 path)
    // We need baseInput > 0 for the buy to work
    await baseToken.transfer(instance.target, ethers.parseEther("500"));
    await quoteToken.transfer(instance.target, ethers.parseEther("1000"));

    // Call buyShares - this will trigger the initial mint
    await instance.connect(owner).buyShares(owner.address);

    // Now set up for the second buy where the mutant code executes
    // Transfer additional tokens to create baseInput and quoteInput
    const additionalBase = ethers.parseEther("100");
    const additionalQuote = ethers.parseEther("300"); // This creates a mintRatio > 1 situation

    await baseToken.transfer(instance.target, additionalBase);
    await quoteToken.transfer(instance.target, additionalQuote);

    // Get state before second buy
    const baseReserveBefore = await instance._BASE_RESERVE_();
    const quoteReserveBefore = await instance._QUOTE_RESERVE_();
    const baseTargetBefore = await instance._BASE_TARGET_();
    const quoteTargetBefore = await instance._QUOTE_TARGET_();
    const totalSupplyBefore = await instance.totalSupply();

    // Calculate expected mintRatio: quoteInputRatio < baseInputRatio
    // baseInput = 100, baseReserveBefore, quoteInput = 300, quoteReserveBefore
    // For mintRatio > 1, we need quoteInput/quoteReserve > baseInput/baseReserve

    // Execute the second buyShares
    const tx = await instance.connect(owner).buyShares(owner.address);
    await tx.wait();

    // Get state after second buy
    const quoteTargetAfter = await instance._QUOTE_TARGET_();

    // In the ORIGINAL code: _QUOTE_TARGET_ = _QUOTE_TARGET_ + mulFloor(_QUOTE_TARGET_, mintRatio)
    // This should increase _QUOTE_TARGET_
    // In the MUTANT code: _QUOTE_TARGET_ = _QUOTE_TARGET_ * mulFloor(_QUOTE_TARGET_, mintRatio)
    // This would either overflow or produce a much smaller value (if mintRatio < 1)
    // or a huge value (if mintRatio > 1)

    // For mintRatio > 1, the original would add a large value, the mutant would multiply
    // resulting in an astronomically large number that would overflow uint112

    // Check if the contract still functions (the mutant would likely revert due to overflow)
    // If it didn't revert, the _QUOTE_TARGET_ value would be incorrect
    expect(quoteTargetAfter).to.be.gt(quoteTargetBefore,
       "Original code would increase _QUOTE_TARGET_, mutant would not");

    // Additional verification - check that the new target is reasonable
    // Original: target increases by mintRatio * original target
    // Mutant: target becomes original target * mintRatio * original target / 1e18
    // For mintRatio > 1, mutant produces value much larger than possible

    const expectedIncrease = quoteTargetBefore * ethers.parseEther("1") / ethers.parseEther("1"); // simplified
    expect(quoteTargetAfter).to.be.lt(quoteTargetBefore * ethers.parseEther("100"),
       "Target should not be astronomically large");
  });
});