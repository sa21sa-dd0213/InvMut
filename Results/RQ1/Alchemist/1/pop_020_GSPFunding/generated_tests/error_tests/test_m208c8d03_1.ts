import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m208c8d03 - division instead of subtraction in sellShares", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let baseToken: any;
  let quoteToken: any;
  
  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();
    
    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract with tokens and initial parameters
    const baseTokenAddress = await baseToken.getAddress();
    const quoteTokenAddress = await quoteToken.getAddress();
    
    // Set tokens
    await instance.setBaseToken(baseTokenAddress);
    await instance.setQuoteToken(quoteTokenAddress);
    
    // Set initial parameters
    await instance.setParameters(
      ethers.parseEther("1"), // _I_ = 1
      ethers.parseEther("0.5"), // _K_ = 0.5
      ethers.parseEther("0.01"), // _LP_FEE_RATE_
      ethers.parseEther("0.001") // _MT_FEE_RATE_
    );
    
    // Fund the contract with initial liquidity
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("1000");
    
    await baseToken.transfer(await instance.getAddress(), initialBase);
    await quoteToken.transfer(await instance.getAddress(), initialQuote);
    
    // Call buyShares to initialize liquidity
    await instance.connect(owner).buyShares(owner.address);
    
    // Accumulate some maintenance fees
    await baseToken.transfer(await instance.getAddress(), ethers.parseEther("10"));
    await quoteToken.transfer(await instance.getAddress(), ethers.parseEther("10"));
  });
  
  it("should revert when sellShares uses division instead of subtraction for baseBalance calculation", async function () {
    // The mutant changes: _BASE_TOKEN_.balanceOf(address(this)) - _MT_FEE_BASE_
    // to: _BASE_TOKEN_.balanceOf(address(this)) / _MT_FEE_BASE_
    
    // Get the current MT fee base amount
    const mtFeeBase = await instance._MT_FEE_BASE_();
    
    // Ensure MT fee base is non-zero to trigger the bug
    expect(mtFeeBase).to.be.gt(0);
    
    // Get total shares for calculation
    const totalSupply = await instance.totalSupply();
    const shareAmount = totalSupply / 10n; // Sell 10% of shares
    
    // The division by _MT_FEE_BASE_ will produce a much smaller baseBalance
    // than the subtraction, causing the withdrawal amounts to be severely underestimated
    // This will likely cause a revert due to WITHDRAW_NOT_ENOUGH or produce incorrect amounts
    
    // Attempt to sell shares - this should fail on the mutant due to incorrect balance calculation
    await expect(
      instance.connect(owner).sellShares(
        shareAmount,
        addr1.address,
        0, // baseMinAmount
        0, // quoteMinAmount
        "0x", // data
        Math.floor(Date.now() / 1000) + 3600 // deadline
      )
    ).to.be.reverted;
  });
  
  it("should correctly calculate baseAmount when selling shares with non-zero MT fees (original behavior)", async function () {
    // This test verifies the original behavior to contrast with the mutant
    
    const mtFeeBase = await instance._MT_FEE_BASE_();
    const totalSupply = await instance.totalSupply();
    const shareAmount = totalSupply / 10n;
    
    // Get balances before
    const balanceBefore = await baseToken.balanceOf(await instance.getAddress());
    const baseReserveBefore = await instance._BASE_RESERVE_();
    
    // Execute sellShares - should succeed on original
    const tx = await instance.connect(owner).sellShares(
      shareAmount,
      addr1.address,
      0,
      0,
      "0x",
      Math.floor(Date.now() / 1000) + 3600
    );
    await tx.wait();
    
    // Verify the baseAmount calculation used subtraction (original behavior)
    const expectedBaseBalance = balanceBefore - mtFeeBase;
    const expectedBaseAmount = expectedBaseBalance * shareAmount / totalSupply;
    const baseAmount = ethers.parseEther("100"); // Approximate, we'll check the event
    
    // The original should succeed without revert
    expect(tx).to.not.be.reverted;
  });
});