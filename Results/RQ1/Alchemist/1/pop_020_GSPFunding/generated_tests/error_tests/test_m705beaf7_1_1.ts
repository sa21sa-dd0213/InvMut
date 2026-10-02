import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m705beaf7 test", function () {
  it("should detect mutant by verifying base balance calculation in buyShares when MT fee is accumulated", async function () {
    const [owner, user1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for BASE and QUOTE
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20.deploy("Base", "BASE", 18);
    const quoteToken = await MockERC20.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding
    const GSPFunding = await ethers.getContractFactory("GSPFunding");
    const instance = await GSPFunding.deploy(
      baseToken.target,
      quoteToken.target,
      1000, // _I_ - initial price
      100,  // _K_ - initial K value
      0,    // _LP_FEE_RATE_
      0,    // _MT_FEE_RATE_
      0,    // _BASE_RESERVE_
      0,    // _QUOTE_RESERVE_
      0     // _RState_
    );
    await instance.waitForDeployment();

    // Set maintainer and MT fee rate
    await instance.adjustMtFeeRate(ethers.parseEther("0.01")); // 1% MT fee

    // Fund the contract with initial liquidity
    const initialBase = ethers.parseEther("10000");
    const initialQuote = ethers.parseEther("10000");

    await baseToken.transfer(instance.target, initialBase);
    await quoteToken.transfer(instance.target, initialQuote);

    // First buy shares to initialize the pool
    await instance.connect(user1).buyShares(user1.address);

    // Now simulate a trade to generate MT fees by transferring some base tokens directly to the contract
    const feeAmount = ethers.parseEther("100");
    await baseToken.transfer(instance.target, feeAmount);

    // Get state before buyShares
    const baseBalanceBefore = await baseToken.balanceOf(instance.target);
    const mtFeeBaseBefore = await instance._MT_FEE_BASE_();
    const baseReserveBefore = await instance._BASE_RESERVE_();

    // Call buyShares
    await instance.connect(user1).buyShares(user1.address);

    // Check the reserves after buyShares
    const baseReserveAfter = await instance._BASE_RESERVE_();
    const baseBalanceAfter = await baseToken.balanceOf(instance.target);
    const mtFeeBaseAfter = await instance._MT_FEE_BASE_();

    // Calculate what the correct baseInput should be
    // Original: baseInput = (balance - mtFeeBase) - baseReserve
    // Mutant: baseInput = (balance + mtFeeBase) - baseReserve

    // Verify that the mutant would have over-inflated the reserves
    // The actual baseReserve should not exceed the actual token balance minus fees
    const actualAvailableBase = baseBalanceAfter - mtFeeBaseAfter;

    // If mutant was active, baseReserve would be larger than actual available
    // This test will pass on original but fail on mutant
    expect(baseReserveAfter).to.be.lte(actualAvailableBase);

    // Additional verification: check that base input calculation was correct
    const expectedBaseInput = actualAvailableBase - baseReserveBefore;
    const actualBaseInput = baseReserveAfter - baseReserveBefore;

    // On original: actualBaseInput should equal expectedBaseInput
    // On mutant: actualBaseInput would be larger (overstated)
    expect(actualBaseInput).to.equal(expectedBaseInput);
  });
});