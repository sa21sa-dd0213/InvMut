import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant mcd43f5e4 detection", function () {
  it("should detect mutant where _MT_FEE_QUOTE_ is added instead of subtracted in buyShares", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock tokens
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const baseToken = await TokenFactory.deploy("Base", "BASE", 18);
    const quoteToken = await TokenFactory.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding
    const GSPFundingFactory = await ethers.getContractFactory("GSPFunding");
    const gsp = await GSPFundingFactory.deploy();
    await gsp.waitForDeployment();

    // Get addresses
    const gspAddress = await gsp.getAddress();
    const baseTokenAddress = await baseToken.getAddress();
    const quoteTokenAddress = await quoteToken.getAddress();

    // Initialize the contract
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("2000");
    
    // Transfer tokens to GSP
    await baseToken.transfer(gspAddress, baseAmount);
    await quoteToken.transfer(gspAddress, quoteAmount);

    // First buy to initialize the pool
    await gsp.connect(user).buyShares(user.address);

    // Set fee rate to accumulate MT_FEE_QUOTE
    await gsp.adjustMtFeeRate(ethers.parseEther("0.1")); // 10% fee

    // Perform a trade to accumulate fees
    // We need to directly transfer quote tokens to simulate fee accumulation
    const feeAmount = ethers.parseEther("100");
    await quoteToken.transfer(gspAddress, feeAmount);

    // Now we need to simulate fee accumulation - transfer to _MT_FEE_QUOTE_
    // This requires a maintainer action or we can directly set it via contract interaction
    // For testing, we'll perform a sellQuote operation to accumulate fees
    // First, approve GSP to spend user's tokens
    await baseToken.connect(owner).approve(gspAddress, ethers.parseEther("1000"));
    await quoteToken.connect(owner).approve(gspAddress, ethers.parseEther("1000"));
    
    // Transfer some tokens to user for trading
    await baseToken.transfer(user.address, ethers.parseEther("500"));
    await quoteToken.transfer(user.address, ethers.parseEther("500"));
    
    // Approve GSP to spend user's tokens
    await baseToken.connect(user).approve(gspAddress, ethers.parseEther("500"));
    await quoteToken.connect(user).approve(gspAddress, ethers.parseEther("500"));

    // Get initial state before second buy
    const mtFeeQuoteBefore = await gsp._MT_FEE_QUOTE_();
    const quoteReserveBefore = await gsp._QUOTE_RESERVE_();
    const quoteBalanceBefore = await quoteToken.balanceOf(gspAddress);

    // Now user deposits more base and quote tokens
    const depositBase = ethers.parseEther("500");
    const depositQuote = ethers.parseEther("1000");
    await baseToken.transfer(gspAddress, depositBase);
    await quoteToken.transfer(gspAddress, depositQuote);

    // Perform buyShares
    const tx = await gsp.connect(user).buyShares(user.address);
    await tx.wait();

    // Get state after buy
    const quoteReserveAfter = await gsp._QUOTE_RESERVE_();
    const finalMtFeeQuote = await gsp._MT_FEE_QUOTE_();

    // The test logic:
    // In original: quoteBalance = actualBalance - _MT_FEE_QUOTE_
    // In mutant: quoteBalance = actualBalance + _MT_FEE_QUOTE_
    
    // We can detect the mutant by checking if the quoteInput calculation differs
    // The actual quote input should be the difference in quote reserves
    const actualQuoteInput = quoteReserveAfter - quoteReserveBefore;
    
    // Expected quote input (original logic): depositQuote (fees excluded)
    const expectedQuoteInput = depositQuote;

    // If mtFeeQuoteBefore > 0, the mutant would show larger quoteInput
    if (mtFeeQuoteBefore > 0n) {
      // The mutant would calculate quoteInput = depositQuote + 2 * mtFeeQuoteBefore
      // Original calculates quoteInput = depositQuote
      expect(actualQuoteInput).to.equal(expectedQuoteInput, 
        "If this fails with actualQuoteInput > expectedQuoteInput, mutant is detected");
    } else {
      // If no fees accumulated yet, we need to verify the logic differently
      // Check the balance calculation directly
      const actualBalance = await quoteToken.balanceOf(gspAddress);
      const currentFees = await gsp._MT_FEE_QUOTE_();
      const quoteReserve = await gsp._QUOTE_RESERVE_();
      
      // Original calculation: quoteBalance = actualBalance - currentFees
      const originalQuoteBalance = actualBalance - currentFees;
      // Mutant calculation: quoteBalance = actualBalance + currentFees
      const mutantQuoteBalance = actualBalance + currentFees;
      
      // The quoteReserve should equal originalQuoteBalance (or be close)
      expect(quoteReserve).to.equal(originalQuoteBalance, 
        "If quoteReserve equals mutantQuoteBalance instead, mutant is detected");
      
      // Alternative check: the mutant would have quoteReserve > originalQuoteBalance when fees > 0
      if (currentFees > 0n) {
        expect(quoteReserve).to.be.lessThan(mutantQuoteBalance, 
          "Mutant detected if quoteReserve >= mutantQuoteBalance");
      }
    }
  });
});