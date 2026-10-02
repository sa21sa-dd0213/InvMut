import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant m72a63290 - kill buyShares quoteInput mutation", function () {
  let owner: any;
  let addr1: any;
  let baseToken: any;
  let quoteToken: any;
  let gspFunding: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with constructor arguments
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    gspFunding = await GSPFundingFactory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      1000, // _I_ initial price
      500,  // _K_ (0.5 * 10^18 represented as 500 for simplicity)
      0,    // _MT_FEE_RATE_
      0,    // _LP_FEE_RATE_
      owner.address // _MAINTAINER_
    );
    await gspFunding.waitForDeployment();

    // Fund addr1 with tokens and approve
    await baseToken.transfer(addr1.address, ethers.parseEther("10000"));
    await quoteToken.transfer(addr1.address, ethers.parseEther("10000"));
    await baseToken.connect(addr1).approve(await gspFunding.getAddress(), ethers.parseEther("100000"));
    await quoteToken.connect(addr1).approve(await gspFunding.getAddress(), ethers.parseEther("100000"));
  });

  it("should detect the mutant by verifying quoteInput calculation on second buyShares", async function () {
    // First buy to establish initial liquidity
    await baseToken.connect(addr1).transfer(await gspFunding.getAddress(), ethers.parseEther("100"));
    await quoteToken.connect(addr1).transfer(await gspFunding.getAddress(), ethers.parseEther("200"));
    await gspFunding.connect(addr1).buyShares(addr1.address);
    
    // Get state after first deposit
    const initialTotalSupply = await gspFunding.totalSupply();
    const initialBaseReserve = await gspFunding._BASE_RESERVE_();
    const initialQuoteReserve = await gspFunding._QUOTE_RESERVE_();

    // Second deposit: send only base tokens
    const baseDeposit = ethers.parseEther("10");
    await baseToken.connect(addr1).transfer(await gspFunding.getAddress(), baseDeposit);
    
    // Get balances before buyShares
    const balanceBefore = await quoteToken.balanceOf(await gspFunding.getAddress());
    
    // Execute buyShares - in original, quoteInput = quoteBalance - quoteReserve
    // In mutant, quoteInput = quoteBalance + quoteReserve (incorrectly large)
    await gspFunding.connect(addr1).buyShares(addr1.address);

    // Get the actual quote balance after the transaction
    const balanceAfter = await quoteToken.balanceOf(await gspFunding.getAddress());
    const actualQuoteInput = balanceAfter - initialQuoteReserve; // Should be 0 since we only sent base
    
    // Get the new total supply and reserves
    const newTotalSupply = await gspFunding.totalSupply();
    const newQuoteReserve = await gspFunding._QUOTE_RESERVE_();
    
    // In the original: quoteInput = 0 (since we only added base), so mintRatio = 0, no shares minted
    // In the mutant: quoteInput = quoteBalance + quoteReserve (inflated), mintRatio > 0, shares minted incorrectly
    
    // Verify that the shares minted are proportional to actual inputs
    const sharesMinted = newTotalSupply - initialTotalSupply;
    
    if (actualQuoteInput === BigInt(0)) {
      // If no quote was added, no shares should be minted in the original
      // But mutant would mint shares incorrectly
      expect(sharesMinted).to.equal(BigInt(0), "No shares should be minted when only base tokens are added");
    }
    
    // Verify reserves didn't change incorrectly
    expect(newQuoteReserve).to.equal(initialQuoteReserve, "Quote reserve should not change when no quote tokens are added");
  });
});