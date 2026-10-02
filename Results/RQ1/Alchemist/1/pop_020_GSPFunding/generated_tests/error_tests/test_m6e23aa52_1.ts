import { expect } from "chai";
import { ethers } } from "hardhat";

describe("GSPFunding mutant m6e23aa52 detection", function () {
  let owner: any;
  let addr1: any;
  let baseToken: any;
  let quoteToken: any;
  let gspFunding: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy two simple ERC20 tokens for base and quote
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    baseToken = await ERC20Factory.deploy("Base", "BASE", 18);
    await baseToken.waitForDeployment();
    quoteToken = await ERC20Factory.deploy("Quote", "QUOTE", 18);
    await quoteToken.waitForDeployment();

    // Deploy GSPFunding with constructor arguments
    // Constructor: (address baseToken, address quoteToken, uint256 lpFeeRate, uint256 mtFeeRate, uint256 i, uint256 k)
    const lpFeeRate = ethers.parseEther("0.001"); // 0.1%
    const mtFeeRate = ethers.parseEther("0.001"); // 0.1%
    const i = ethers.parseEther("1"); // 1:1 price
    const k = ethers.parseEther("0.5"); // 0.5 K value

    const Factory = await ethers.getContractFactory("GSPFunding");
    gspFunding = await Factory.deploy(
      await baseToken.getAddress(),
      await quoteToken.getAddress(),
      lpFeeRate,
      mtFeeRate,
      i,
      k
    );
    await gspFunding.waitForDeployment();

    // Fund the contract with initial liquidity via buyShares
    // Transfer tokens to addr1 first, then addr1 buys shares
    const initialBase = ethers.parseEther("1000");
    const initialQuote = ethers.parseEther("1000");

    await baseToken.transfer(addr1.address, initialBase);
    await quoteToken.transfer(addr1.address, initialQuote);

    await baseToken.connect(addr1).approve(await gspFunding.getAddress(), initialBase);
    await quoteToken.connect(addr1).approve(await gspFunding.getAddress(), initialQuote);

    // Call buyShares to add initial liquidity (first mint triggers special logic)
    await gspFunding.connect(addr1).buyShares(addr1.address);
  });

  it("should correctly update _QUOTE_TARGET_ when selling shares (detect exponentiation mutant)", async function () {
    // Get initial state before selling
    const initialQuoteTarget = await gspFunding._QUOTE_TARGET_();
    const totalSupplyBefore = await gspFunding.totalSupply();
    const addr1BalanceBefore = await gspFunding.balanceOf(addr1.address);

    // Sell a significant portion of shares (e.g., 10%)
    const shareAmount = totalSupplyBefore / 10n;
    
    // Set minimum amounts to 0 to avoid revert from slippage check
    const baseMinAmount = 0n;
    const quoteMinAmount = 0n;
    
    // Deadline in the future
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1000;

    // Execute sellShares
    const tx = await gspFunding.connect(addr1).sellShares(
      shareAmount,
      addr1.address,
      baseMinAmount,
      quoteMinAmount,
      "0x",
      deadline
    );
    await tx.wait();

    // Get new quote target after selling
    const newQuoteTarget = await gspFunding._QUOTE_TARGET_();

    // The mutated version (with **) would cause an astronomically large exponentiation,
    // resulting in an underflow or a value that is way too small.
    // The correct behavior should reduce _QUOTE_TARGET_ proportionally to shares sold.
    // Since we sold 10% of shares, the target should decrease by approximately 10%
    // and remain a positive reasonable number.
    expect(newQuoteTarget).to.be.gt(0n);
    expect(newQuoteTarget).to.be.lt(initialQuoteTarget);
    expect(newQuoteTarget).to.be.closeTo(
      initialQuoteTarget - (initialQuoteTarget * shareAmount) / totalSupplyBefore,
      ethers.parseEther("0.01") // Allow 0.01 tolerance for rounding
    );
  });
});