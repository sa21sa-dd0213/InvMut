import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant kill test m5ab07a42", function () {
  it("should detect the mutation that replaces - with / in quoteBalance calculation of sellShares", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed as per the contract)
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy mock base and quote tokens
    const BaseToken = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const QuoteToken = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const baseToken = await BaseToken.deploy("Base", "BASE", 18);
    const quoteToken = await QuoteToken.deploy("Quote", "QUOTE", 18);
    await baseToken.waitForDeployment();
    await quoteToken.waitForDeployment();

    // Initialize the contract with tokens and parameters
    const baseTokenAddress = await baseToken.getAddress();
    const quoteTokenAddress = await quoteToken.getAddress();

    // Set tokens
    await instance.setBaseToken(baseTokenAddress);
    await instance.setQuoteToken(quoteTokenAddress);

    // Set initial parameters
    await instance.setI(ethers.parseEther("1")); // 1:1 ratio
    await instance.setK(ethers.parseEther("0.5")); // 50% K

    // Set MT fee rate to a non-zero value
    await instance.setMtFeeRate(ethers.parseEther("0.01")); // 1% fee

    // Mint tokens to the contract to create initial liquidity
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("1000");

    await baseToken.mint(owner.address, initialBase);
    await quoteToken.mint(owner.address, initialQuote);

    // Transfer tokens to contract
    await baseToken.transfer(await instance.getAddress(), initialBase);
    await quoteToken.transfer(await instance.getAddress(), initialQuote);

    // Set reserves directly (since we're testing sellShares)
    await instance.setReserve(initialBase, initialQuote);
    await instance.setTarget(initialBase, initialQuote);

    // Buy shares to have some LP tokens
    await instance.connect(addr1).buyShares(addr1.address);

    // Accumulate some MT fees to make _MT_FEE_QUOTE_ non-zero
    // This would normally happen through trading, but we can set it directly for testing
    await instance.setMtFeeQuote(ethers.parseEther("50")); // Set some accumulated fees

    // Get the balance before selling shares
    const quoteBalanceBefore = await quoteToken.balanceOf(addr1.address);

    // Get share amount
    const shareAmount = await instance.balanceOf(addr1.address);

    // The mutation changes - to /, so with _MT_FEE_QUOTE_ = 50 ethers
    // Original: balanceOf(this) - _MT_FEE_QUOTE_ = 1000 - 50 = 950
    // Mutant: balanceOf(this) / _MT_FEE_QUOTE_ = 1000 / 50 = 20
    // This will cause a significant difference in the calculated quoteAmount

    // Sell shares - this should revert or give wrong amount with the mutant
    const sellTx = await instance.connect(addr1).sellShares(
      shareAmount,
      addr1.address,
      0, // baseMinAmount
      0, // quoteMinAmount
      "0x", // data
      Math.floor(Date.now() / 1000) + 3600 // deadline
    );

    await sellTx.wait();

    // Get the balance after selling shares
    const quoteBalanceAfter = await quoteToken.balanceOf(addr1.address);
    const quoteReceived = quoteBalanceAfter - quoteBalanceBefore;

    // With the original code: quoteAmount = 950 * shareAmount / totalSupply
    // With the mutant: quoteAmount = 20 * shareAmount / totalSupply
    // The received amount should be significantly different

    // Calculate expected quote amount with original code
    const totalSupply = await instance.totalSupply();
    const expectedQuoteAmount = (initialQuote - ethers.parseEther("50")) * shareAmount / totalSupply;

    // With the mutant, the quoteAmount would be much smaller
    // So the test passes on original (correct amount) but fails on mutant (wrong amount)
    expect(quoteReceived).to.be.closeTo(expectedQuoteAmount, ethers.parseEther("0.01"));

    // Additionally, the target values should be correctly updated
    // With the mutant, the target calculation would be based on wrong quoteBalance
    // causing incorrect state updates
  });
});