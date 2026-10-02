import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant test - m978d6dde", function () {
  it("should detect mutant that changes * to + in quoteAmount calculation", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock tokens for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockToken.deploy("Base", "BASE", 18);
    const quoteToken = await MockToken.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding - note: constructor may require arguments
    // Based on the contract, we need to check actual constructor parameters
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      ethers.parseEther("1"), // _I_ (initial price)
      ethers.parseEther("0.003"), // _K_ (spread parameter)
      ethers.parseEther("0.001"), // _LP_FEE_RATE_
      ethers.parseEther("0.0005"), // _MT_FEE_RATE_
      owner.address, // _MAINTAINER_
      false // _IS_OPEN_TWAP_
    );
    await instance.waitForDeployment();

    // Fund the contract with base and quote tokens
    const initialBaseAmount = ethers.parseEther("1000");
    const initialQuoteAmount = ethers.parseEther("2000");
    
    await baseToken.transfer(await instance.getAddress(), initialBaseAmount);
    await quoteToken.transfer(await instance.getAddress(), initialQuoteAmount);

    // First buy shares to initialize the pool
    // Transfer tokens to addr1 for buying shares
    await baseToken.transfer(addr1.address, ethers.parseEther("100"));
    await quoteToken.transfer(addr1.address, ethers.parseEther("200"));
    
    await baseToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    await quoteToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("200"));
    
    await instance.connect(addr1).buyShares(addr1.address);

    // Get initial state
    const totalSupply = await instance.totalSupply();
    const quoteBalance = await quoteToken.balanceOf(await instance.getAddress());
    const mtFeeQuote = await instance._MT_FEE_QUOTE_();
    const availableQuote = quoteBalance - mtFeeQuote;
    
    // Sell 10% of shares
    const sharesToSell = totalSupply / BigInt(10);
    
    // Get the balance before sell
    const addr1QuoteBalanceBefore = await quoteToken.balanceOf(addr1.address);
    
    // Execute sellShares
    await instance.connect(addr1).sellShares(
      sharesToSell,
      addr1.address,
      0, // baseMinAmount
      0, // quoteMinAmount
      "0x", // data
      Math.floor(Date.now() / 1000) + 3600 // deadline
    );
    
    // Get the balance after sell
    const addr1QuoteBalanceAfter = await quoteToken.balanceOf(addr1.address);
    const quoteAmountReceived = addr1QuoteBalanceAfter - addr1QuoteBalanceBefore;
    
    // In the original: quoteAmount = quoteBalance * shareAmount / totalShares
    // Expected: ~10% of available quote balance
    const expectedQuoteAmount = availableQuote * sharesToSell / totalSupply;
    
    // The mutant calculates: quoteAmount = quoteBalance + shareAmount / totalShares
    // This would give approximately quoteBalance + ~0 (since shareAmount/totalShares ≈ 0.1 in integer division)
    // So mutant would return ~quoteBalance, which is ~10x more than expected
    
    // Verify the received amount matches the proportional calculation (original behavior)
    // The mutant would fail this assertion because it returns a much larger amount
    expect(quoteAmountReceived).to.be.closeTo(expectedQuoteAmount, ethers.parseEther("0.01"));
  });
});