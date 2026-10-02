import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant detection - sellShares multiplication vs addition", function () {
  it("should correctly reduce _QUOTE_TARGET_ proportionally when selling shares, killing the mutant that uses addition instead of multiplication", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for base and quote
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const baseToken = await MockERC20.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    const quoteToken = await MockERC20.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the GSP with tokens and initial parameters
    const I = ethers.parseEther("1"); // 1:1 price ratio
    const K = ethers.parseEther("0.5"); // 50% curve parameter

    // Mint initial tokens to contract for initialization
    const initialBase = ethers.parseEther("10000");
    const initialQuote = ethers.parseEther("10000");

    await baseToken.mint(owner.address, initialBase);
    await quoteToken.mint(owner.address, initialQuote);

    await baseToken.approve(instance.target, initialBase);
    await quoteToken.approve(instance.target, initialQuote);

    // Initialize the pool (first buyShares call sets up the initial state)
    await instance.connect(owner).buyShares(owner.address);

    // Get initial state after first buy
    const initialQuoteTarget = await instance._QUOTE_TARGET_();
    const totalSupplyInitial = await instance.totalSupply();

    // Now buy more shares to have meaningful state for testing
    const additionalBase = ethers.parseEther("5000");
    const additionalQuote = ethers.parseEther("5000");
    await baseToken.mint(owner.address, additionalBase);
    await quoteToken.mint(owner.address, additionalQuote);
    await baseToken.approve(instance.target, additionalBase);
    await quoteToken.approve(instance.target, additionalQuote);

    await instance.connect(owner).buyShares(owner.address);

    // Get state after second buy
    const totalSupplyAfterBuy = await instance.totalSupply();
    const quoteTargetBeforeSell = await instance._QUOTE_TARGET_();

    // Sell a specific number of shares (e.g., 10% of total supply)
    const shareAmount = totalSupplyAfterBuy / 10n;

    // Calculate expected new quote target after proportional reduction
    // Original: _QUOTE_TARGET_ - _divCeil((_QUOTE_TARGET_ * shareAmount), totalSupply)
    // Mutant: _QUOTE_TARGET_ - _divCeil((_QUOTE_TARGET_ + shareAmount), totalSupply)
    const expectedNewQuoteTarget = quoteTargetBeforeSell -
      ((quoteTargetBeforeSell * shareAmount + totalSupplyAfterBuy - 1n) / totalSupplyAfterBuy);

    // Execute sellShares with zero min amounts and empty data
    const baseMinAmount = 0n;
    const quoteMinAmount = 0n;
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    await instance.connect(owner).sellShares(
      shareAmount,
      owner.address,
      baseMinAmount,
      quoteMinAmount,
      "0x",
      deadline
    );

    // Get actual quote target after sell
    const actualQuoteTarget = await instance._QUOTE_TARGET_();

    // Verify the quote target was reduced proportionally (not by addition-based calculation)
    expect(actualQuoteTarget).to.equal(expectedNewQuoteTarget);

    // Additional verification: the mutant would give _divCeil((_QUOTE_TARGET_ + shareAmount), totalSupply)
    // which would be a much smaller reduction, leaving _QUOTE_TARGET_ larger than expected
    const mutantQuoteTarget = quoteTargetBeforeSell -
      ((quoteTargetBeforeSell + shareAmount + totalSupplyAfterBuy - 1n) / totalSupplyAfterBuy);

    // Assert that the actual value is NOT equal to the mutant value
    expect(actualQuoteTarget).to.not.equal(mutantQuoteTarget);
  });
});